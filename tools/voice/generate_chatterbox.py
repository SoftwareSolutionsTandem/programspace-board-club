#!/usr/bin/env python3
"""Пробы голоса на Chatterbox Multilingual V3 (Resemble AI, MIT) — альтернатива Qwen3-TTS (docs/AUDIO.md §14).

Голос задаётся эталонной записью. Берём синтетический эталон, созданный Qwen3-TTS VoiceDesign по описанию
персонажа (assets-src/audio/ru/agata/audition/), — реальный человек не клонируется.
Выход в том же формате, что у generate.py: <id>.flac + <id>.json, поэтому check-asr.py и build-voice.mjs
работают без изменений. В каждый файл Chatterbox встраивает неслышимый водяной знак Perth.

  python tools/voice/generate_chatterbox.py --samples --models-dir <папка весов> --reference <эталон.flac> --out <папка>
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate import STRESS_STYLES, line_seed, load_catalog, seed_all, spoken_text, write_flac  # noqa: E402


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_model(ckpt: Path, t3_file: str, device: str):
    import torch
    from safetensors.torch import load_file
    from chatterbox.models.s3gen import S3Gen
    from chatterbox.models.t3 import T3
    from chatterbox.models.t3.modules.t3_config import T3Config
    from chatterbox.models.tokenizers import MTLTokenizer
    from chatterbox.models.voice_encoder import VoiceEncoder
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    ve = VoiceEncoder()
    ve.load_state_dict(load_file(ckpt / "ve.safetensors"))
    ve.to(device).eval()
    t3 = T3(T3Config.multilingual())
    state = load_file(ckpt / t3_file)
    if "model" in state:
        state = state["model"][0]
    t3.load_state_dict(state)
    t3.to(device).eval()
    s3 = S3Gen()
    s3.load_state_dict(load_file(ckpt / "s3gen.safetensors"), strict=False)
    s3.to(device).eval()
    tok = MTLTokenizer(str(ckpt / "grapheme_mtl_merged_expanded_v1.json"))
    torch.set_grad_enabled(False)
    return ChatterboxMultilingualTTS(t3, s3, ve, tok, device, conds=None)


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", default=str(root / "tools/voice/agata.voice.json"))
    sel = ap.add_mutually_exclusive_group(required=True)
    sel.add_argument("--samples", action="store_true")
    sel.add_argument("--only")
    ap.add_argument("--models-dir", required=True, help="папка с весами ResembleAI/chatterbox")
    ap.add_argument("--t3", default="t3_mtl23ls_v3.safetensors", help="веса T3 (по умолчанию Multilingual V3)")
    ap.add_argument("--reference", required=True, help="эталонная запись голоса")
    ap.add_argument("--out", required=True)
    ap.add_argument("--stress-style", choices=STRESS_STYLES, default="plain")
    ap.add_argument("--exaggeration", type=float, default=0.6)
    ap.add_argument("--cfg-weight", type=float, default=0.4)
    ap.add_argument("--temperature", type=float, default=0.8)
    ap.add_argument("--seed-offset", type=int, default=0)
    args = ap.parse_args()

    cfg = json.loads(Path(args.config).read_text(encoding="utf-8"))
    catalog = {l["id"]: l for l in load_catalog()}
    ids = list(cfg["samples"]) if args.samples else [x.strip() for x in args.only.split(",") if x.strip()]
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    model = load_model(Path(args.models_dir), args.t3, "cpu")
    model.prepare_conditionals(args.reference, exaggeration=args.exaggeration)
    ok = True
    for i in ids:
        line = catalog[i]
        ov = cfg.get("overrides", {}).get(i, {})
        plain = ov.get("text", line["text"])
        text = spoken_text(cfg, i, plain, args.stress_style)
        seed = line_seed(cfg["seed"], i, args.seed_offset)
        t0 = time.time()
        try:
            seed_all(seed)
            wav = model.generate(text, language_id="ru", exaggeration=args.exaggeration, cfg_weight=args.cfg_weight, temperature=args.temperature)
            data = wav.squeeze(0).cpu().numpy()
            flac = out / f"{i}.flac"
            write_flac(flac, data, model.sr)
            meta = {"id": i, "text": text, "catalogText": line["text"], "stressStyle": args.stress_style, "seed": seed,
                    "engine": {"package": "chatterbox-tts", "version": "0.1.7"}, "model": f"ResembleAI/chatterbox {args.t3}",
                    "params": {"exaggeration": args.exaggeration, "cfgWeight": args.cfg_weight, "temperature": args.temperature},
                    "reference": Path(args.reference).name, "sha256": sha256(flac), "sampleRate": model.sr,
                    "durationSec": round(len(data) / model.sr, 3), "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
            (out / f"{i}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"[ok] {i}: {meta['durationSec']} с звука за {time.time() - t0:.1f} с")
        except Exception as e:  # noqa: BLE001
            ok = False
            print(f"[ошибка] {i}: {type(e).__name__}: {e}", file=sys.stderr)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
