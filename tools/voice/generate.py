#!/usr/bin/env python3
"""Генерация голоса персонажа заранее, на машине разработчика (docs/AUDIO.md §14).

В игру модель не попадает: на выходе — FLAC-исходники в assets-src/audio/<lang>/<character>/,
дальше их кодирует tools/audio/build-voice.mjs.

Схема «спроектировать голос → клонировать» (Qwen3-TTS):
  1) модель VoiceDesign по текстовому описанию персонажа создаёт эталонную фразу — синтетический голос,
     не копия реального человека;
  2) базовая модель озвучивает этим голосом каждую реплику — тембр один и тот же во всём каталоге.
Режим --mode design озвучивает каждую реплику моделью VoiceDesign с ремаркой эмоции (больше игры голосом,
но тембр может «плавать») — для сравнения на пробах.

Примеры:
  python tools/voice/generate.py --samples                     # пробный набор из agata.voice.json
  python tools/voice/generate.py --all                         # весь каталог (только отсутствующие файлы)
  python tools/voice/generate.py --only agata_win_01 --regen   # перегенерировать одну реплику
  python tools/voice/generate.py --only agata_win_01 --regen --seed-offset 1   # другой дубль
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
import subprocess
import sys
import time
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load_catalog() -> list[dict]:
    # Тексты — только из каталога игры (единый источник).
    out = subprocess.run(["node", str(ROOT / "tools/voice/export-catalog.mjs")], check=True, capture_output=True, text=True)
    return json.loads(out.stdout)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def line_seed(base: int, line_id: str, offset: int) -> int:
    # Стабильный сид реплики: не зависит от порядка и состава пакета.
    return (base + zlib.crc32(line_id.encode()) % 100_000 + 1_000_003 * offset) % (2**31 - 1)


def seed_all(seed: int) -> None:
    import numpy as np
    import torch

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def write_flac(path: Path, wav, sr: int) -> None:
    import soundfile as sf

    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), wav, sr, format="FLAC", subtype="PCM_16")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", default=str(ROOT / "tools/voice/agata.voice.json"))
    sel = ap.add_mutually_exclusive_group(required=True)
    sel.add_argument("--samples", action="store_true", help="пробный набор из конфига")
    sel.add_argument("--all", action="store_true", help="весь каталог")
    sel.add_argument("--only", help="идентификаторы через запятую")
    ap.add_argument("--mode", choices=["clone", "design"], default="clone")
    ap.add_argument("--out", help="папка FLAC (по умолчанию assets-src/audio/<lang>/<character>)")
    ap.add_argument("--models-dir", help="локальная папка с весами (иначе — идентификаторы Hugging Face)")
    ap.add_argument("--regen", action="store_true", help="перегенерировать уже созданные генератором файлы")
    ap.add_argument("--force", action="store_true", help="перезаписать и вручную исправленные файлы")
    ap.add_argument("--redesign", action="store_true", help="заново создать эталонную фразу голоса")
    ap.add_argument("--seed-offset", type=int, default=0, help="другой дубль тех же реплик")
    ap.add_argument("--device", default=None, help="cuda:0 / cpu (по умолчанию — cuda, если есть)")
    args = ap.parse_args()

    cfg = json.loads(Path(args.config).read_text(encoding="utf-8"))
    catalog = {l["id"]: l for l in load_catalog()}
    if args.samples:
        ids = list(cfg["samples"])
    elif args.all:
        ids = list(catalog)
    else:
        ids = [x.strip() for x in args.only.split(",") if x.strip()]
    unknown = [i for i in ids if i not in catalog]
    if unknown:
        print("Нет в каталоге реплик:", ", ".join(unknown), file=sys.stderr)
        return 2

    out_dir = Path(args.out) if args.out else ROOT / "assets-src/audio" / cfg["lang"] / cfg["character"]
    out_dir.mkdir(parents=True, exist_ok=True)

    # Что делать с каждой репликой — решаем до загрузки моделей.
    plan: list[str] = []
    report: dict[str, dict] = {}
    for i in ids:
        flac, meta_path = out_dir / f"{i}.flac", out_dir / f"{i}.json"
        if flac.exists():
            meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else None
            manual = meta is None or meta.get("sha256") != sha256(flac) or meta.get("locked")
            if manual and not args.force:
                report[i] = {"status": "skipped-manual", "note": "файл изменён вручную или закреплён; нужен --force"}
                continue
            if not (args.regen or args.force):
                report[i] = {"status": "skipped-existing"}
                continue
        plan.append(i)

    if plan:
        import torch
        from qwen_tts import Qwen3TTSModel

        device = args.device or ("cuda:0" if torch.cuda.is_available() else "cpu")
        dtype = torch.bfloat16 if device.startswith("cuda") else torch.float32

        def model_ref(key: str) -> str:
            name = cfg["models"][key]
            return str(Path(args.models_dir) / name.split("/")[-1]) if args.models_dir else name

        def load(key: str):
            return Qwen3TTSModel.from_pretrained(model_ref(key), device_map=device, dtype=dtype)

        persona, language = cfg["persona"], cfg["language"]
        ref_path, ref_meta = out_dir / "_reference.flac", out_dir / "_reference.json"
        need_reference = args.mode == "clone" and (args.redesign or not ref_path.exists())
        design = load("design") if args.mode == "design" or need_reference else None
        clone = prompt = None
        if args.mode == "clone":
            if need_reference:
                seed_all(cfg["reference"]["seed"])
                wavs, sr = design.generate_voice_design(text=cfg["reference"]["text"], language=language, instruct=persona)
                write_flac(ref_path, wavs[0], sr)
                ref_meta.write_text(json.dumps({"text": cfg["reference"]["text"], "instruct": persona, "seed": cfg["reference"]["seed"], "model": cfg["models"]["design"], "sha256": sha256(ref_path)}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            del design
            clone = load("clone")
            prompt = clone.create_voice_clone_prompt(ref_audio=str(ref_path), ref_text=cfg["reference"]["text"])

        for i in plan:
            line = catalog[i]
            ov = cfg.get("overrides", {}).get(i, {})
            text = ov.get("text", line["text"])
            seed = line_seed(cfg["seed"], i, args.seed_offset + int(ov.get("seedOffset", 0)))
            t0 = time.time()
            try:
                seed_all(seed)
                if args.mode == "clone":
                    wavs, sr = clone.generate_voice_clone(text=text, language=language, voice_clone_prompt=prompt)
                else:
                    instruct = f"{persona} Delivery for this line (Russian stage direction): {line['direction']}."
                    wavs, sr = design.generate_voice_design(text=text, language=language, instruct=instruct)
                flac = out_dir / f"{i}.flac"
                write_flac(flac, wavs[0], sr)
                meta = {
                    "id": i, "text": text, "catalogText": line["text"], "mode": args.mode, "seed": seed,
                    "engine": cfg["engine"], "models": cfg["models"], "sha256": sha256(flac),
                    "sampleRate": sr, "durationSec": round(len(wavs[0]) / sr, 3),
                    "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
                (out_dir / f"{i}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                report[i] = {"status": "generated", "durationSec": meta["durationSec"], "seconds": round(time.time() - t0, 1)}
                print(f"[ok] {i}: {meta['durationSec']} с звука за {report[i]['seconds']} с")
            except Exception as e:  # noqa: BLE001 — одна неудачная реплика не останавливает пакет
                report[i] = {"status": "error", "error": f"{type(e).__name__}: {e}"}
                print(f"[ошибка] {i}: {e}", file=sys.stderr)

    (out_dir / "_generate-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts: dict[str, int] = {}
    for r in report.values():
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    print("Итог:", ", ".join(f"{k}: {v}" for k, v in sorted(counts.items())))
    return 1 if counts.get("error") else 0


if __name__ == "__main__":
    sys.exit(main())
