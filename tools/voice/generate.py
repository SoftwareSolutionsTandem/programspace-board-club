#!/usr/bin/env python3
"""Генерация голоса персонажа заранее, на машине разработчика (docs/AUDIO.md §14).

В игру модель не попадает: на выходе — FLAC-исходники в assets-src/audio/<lang>/<character>/,
дальше их кодирует tools/audio/build-voice.mjs.

Схема «спроектировать голос → клонировать» (Qwen3-TTS):
  1) модель VoiceDesign по текстовому описанию персонажа озвучивает эталонную фразу — синтетический голос,
     не копия реального человека;
  2) базовая модель озвучивает этим голосом каждую реплику — тембр один и тот же во всём каталоге.

Ударения: текст с разметкой (U+0301 после ударной гласной) берётся из поля stress конфига; без знаков он
обязан совпадать с текстом каталога, иначе реплика не генерируется. Для модели разметка переписывается
выбранным способом (--stress-style): знак U+0301 сам по себе модель Qwen3-TTS читает как лишний звук.

Примеры:
  python tools/voice/generate.py --audition 2                  # кандидаты голоса: описания × 2 сида, с замером тона
  python tools/voice/generate.py --samples --reference-file <кандидат>.flac
  python tools/voice/generate.py --all                         # весь каталог (только отсутствующие файлы)
  python tools/voice/generate.py --only agata_win_01 --regen   # перегенерировать одну реплику
  python tools/voice/generate.py --only agata_win_01 --regen --seed-offset 1   # другой дубль
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
import shutil
import subprocess
import sys
import time
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STRESS_MARK = "́"


def load_catalog() -> list[dict]:
    # Тексты — только из каталога игры (единый источник).
    out = subprocess.run(["node", str(ROOT / "tools/voice/export-catalog.mjs")], check=True, capture_output=True, text=True, encoding="utf-8")
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


def median_f0(wav, sr: int) -> float | None:
    """Медиана основного тона по озвученным кадрам, Гц: объективная подсказка о «возрасте» голоса."""
    import librosa
    import numpy as np

    f0, voiced, _ = librosa.pyin(wav.astype("float32"), fmin=70, fmax=450, sr=sr)
    vals = f0[voiced & ~np.isnan(f0)]
    return round(float(np.median(vals)), 1) if len(vals) else None


STRESS_STYLES = ("plain", "acute", "upper", "plus")


def render_stress(marked: str, style: str) -> str:
    """Запись ударений для модели: plain — без разметки; acute — U+0301 после гласной; upper — ударная гласная
    заглавной («дурАчка»); plus — «+» перед ударной гласной («дур+ачка»)."""
    if style == "plain":
        return marked.replace(STRESS_MARK, "")
    if style == "acute":
        return marked
    out: list[str] = []
    for ch in marked:
        if ch == STRESS_MARK and out:
            vowel = out.pop()
            out.append(vowel.upper() if style == "upper" else "+" + vowel)
        else:
            out.append(ch)
    return "".join(out)


def spoken_text(cfg: dict, line_id: str, plain: str, style: str) -> str:
    """Текст для синтеза: разметка ударений из конфига (если есть), обязана совпадать с текстом каталога."""
    marked = cfg.get("stress", {}).get(line_id)
    if marked is None:
        return plain
    if marked.replace(STRESS_MARK, "") != plain:
        raise ValueError(f"разметка ударений не совпадает с текстом каталога: «{marked}» ≠ «{plain}»")
    return render_stress(marked, style)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", default=str(ROOT / "tools/voice/agata.voice.json"))
    sel = ap.add_mutually_exclusive_group(required=True)
    sel.add_argument("--samples", action="store_true", help="пробный набор из конфига")
    sel.add_argument("--all", action="store_true", help="весь каталог")
    sel.add_argument("--only", help="идентификаторы через запятую")
    sel.add_argument("--audition", type=int, metavar="N", help="кандидаты голоса: каждое описание × N сидов")
    ap.add_argument("--out", help="папка FLAC (по умолчанию assets-src/audio/<lang>/<character>)")
    ap.add_argument("--models-dir", help="локальная папка с весами (иначе — идентификаторы Hugging Face)")
    ap.add_argument("--reference-file", help="готовый эталон голоса (например, выбранный кандидат --audition)")
    ap.add_argument("--stress-style", choices=STRESS_STYLES, help="запись ударений для модели (по умолчанию — stressStyle из конфига)")
    ap.add_argument("--regen", action="store_true", help="перегенерировать уже созданные генератором файлы")
    ap.add_argument("--force", action="store_true", help="перезаписать и вручную исправленные файлы")
    ap.add_argument("--redesign", action="store_true", help="заново создать эталонную фразу голоса")
    ap.add_argument("--seed-offset", type=int, default=0, help="другой дубль тех же реплик")
    ap.add_argument("--device", default=None, help="cuda:0 / cpu (по умолчанию — cuda, если есть)")
    ap.add_argument("--persona", help="для --audition: номера описаний из personas через запятую (по умолчанию все)")
    ap.add_argument("--clone-model", help="другие веса для озвучки реплик (идентификатор Hugging Face или папка), вместо models.clone")
    args = ap.parse_args()

    cfg = json.loads(Path(args.config).read_text(encoding="utf-8"))
    if args.clone_model:
        cfg["models"]["clone"] = args.clone_model
    catalog = {l["id"]: l for l in load_catalog()}
    out_dir = Path(args.out) if args.out else ROOT / "assets-src/audio" / cfg["lang"] / cfg["character"]
    out_dir.mkdir(parents=True, exist_ok=True)
    style = args.stress_style or cfg.get("stressStyle", "plain")
    ref_cfg = cfg["reference"]
    ref_spoken = render_stress(ref_cfg["text"], style)

    if args.audition is None:
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
    else:
        ids = []

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

    if not plan and args.audition is None:
        return finish(out_dir, report)

    import torch
    from qwen_tts import Qwen3TTSModel

    device = args.device or ("cuda:0" if torch.cuda.is_available() else "cpu")
    dtype = torch.bfloat16 if device.startswith("cuda") else torch.float32

    def model_ref(key: str) -> str:
        name = cfg["models"][key]
        return str(Path(args.models_dir) / name.split("/")[-1]) if args.models_dir else name

    def load(key: str):
        return Qwen3TTSModel.from_pretrained(model_ref(key), device_map=device, dtype=dtype)

    language = cfg["language"]

    # Кандидаты голоса: каждое описание персонажа × N сидов, эталонная фраза, замер основного тона.
    if args.audition is not None:
        design = load("design")
        rows = []
        chosen = {int(x) for x in args.persona.split(",")} if args.persona else None
        for p_idx, persona in enumerate(cfg["personas"]):
            if chosen is not None and p_idx not in chosen:
                continue
            for k in range(args.audition):
                seed = ref_cfg["seed"] + k
                seed_all(seed)
                wavs, sr = design.generate_voice_design(text=ref_spoken, language=language, instruct=persona)
                name = f"_audition_p{p_idx}_s{seed}"
                write_flac(out_dir / f"{name}.flac", wavs[0], sr)
                row = {"file": f"{name}.flac", "personaIndex": p_idx, "seed": seed, "text": ref_spoken, "instruct": persona,
                       "model": cfg["models"]["design"], "durationSec": round(len(wavs[0]) / sr, 2), "medianF0Hz": median_f0(wavs[0], sr)}
                rows.append(row)
                print(f"[кандидат] {name}: {row['durationSec']} с, основной тон {row['medianF0Hz']} Гц")
        (out_dir / "_audition.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return 0

    # Эталон голоса: из файла кандидата, из кэша или заново по описанию.
    ref_path, ref_meta = out_dir / "_reference.flac", out_dir / "_reference.json"
    if args.reference_file:
        src = Path(args.reference_file)
        shutil.copyfile(src, ref_path)
        src_meta = src.with_suffix("").parent / "_audition.json"
        info = next((r for r in json.loads(src_meta.read_text(encoding="utf-8")) if r["file"] == src.name), {}) if src_meta.exists() else {}
        ref_meta.write_text(json.dumps({"text": info.get("text", ref_spoken), "from": src.name, **{k: info[k] for k in ("instruct", "seed", "medianF0Hz") if k in info},
                                        "model": cfg["models"]["design"], "sha256": sha256(ref_path)}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    elif args.redesign or not ref_path.exists():
        design = load("design")
        persona = cfg["personas"][ref_cfg.get("personaIndex", 0)]
        seed_all(ref_cfg["seed"])
        wavs, sr = design.generate_voice_design(text=ref_spoken, language=language, instruct=persona)
        write_flac(ref_path, wavs[0], sr)
        ref_meta.write_text(json.dumps({"text": ref_spoken, "instruct": persona, "seed": ref_cfg["seed"], "model": cfg["models"]["design"],
                                        "medianF0Hz": median_f0(wavs[0], sr), "sha256": sha256(ref_path)}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        del design
    ref_text = json.loads(ref_meta.read_text(encoding="utf-8"))["text"]

    clone = load("clone")
    prompt = clone.create_voice_clone_prompt(ref_audio=str(ref_path), ref_text=ref_text)
    for i in plan:
        line = catalog[i]
        ov = cfg.get("overrides", {}).get(i, {})
        plain = ov.get("text", line["text"])
        seed = line_seed(cfg["seed"], i, args.seed_offset + int(ov.get("seedOffset", 0)))
        t0 = time.time()
        try:
            text = spoken_text(cfg, i, plain, style)
            seed_all(seed)
            wavs, sr = clone.generate_voice_clone(text=text, language=language, voice_clone_prompt=prompt)
            flac = out_dir / f"{i}.flac"
            write_flac(flac, wavs[0], sr)
            meta = {
                "id": i, "text": text, "catalogText": line["text"], "stressStyle": style, "seed": seed,
                "engine": cfg["engine"], "models": cfg["models"], "reference": json.loads(ref_meta.read_text(encoding="utf-8")).get("sha256"),
                "sha256": sha256(flac), "sampleRate": sr, "durationSec": round(len(wavs[0]) / sr, 3),
                "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            (out_dir / f"{i}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            report[i] = {"status": "generated", "durationSec": meta["durationSec"], "seconds": round(time.time() - t0, 1)}
            print(f"[ok] {i}: {meta['durationSec']} с звука за {report[i]['seconds']} с")
        except Exception as e:  # noqa: BLE001 — одна неудачная реплика не останавливает пакет
            report[i] = {"status": "error", "error": f"{type(e).__name__}: {e}"}
            print(f"[ошибка] {i}: {e}", file=sys.stderr)
    return finish(out_dir, report)


def finish(out_dir: Path, report: dict[str, dict]) -> int:
    (out_dir / "_generate-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts: dict[str, int] = {}
    for r in report.values():
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    print("Итог:", ", ".join(f"{k}: {v}" for k, v in sorted(counts.items())) or "нечего делать")
    return 1 if counts.get("error") else 0


if __name__ == "__main__":
    sys.exit(main())
