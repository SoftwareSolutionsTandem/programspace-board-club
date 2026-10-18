#!/usr/bin/env python3
"""Объективная проверка озвучки распознаванием речи (docs/AUDIO.md §14).

Каждый FLAC с метаданными (<id>.json) распознаётся моделью Whisper и сравнивается с текстом реплики:
доля ошибочных слов (WER), совпадение последнего слова (обрезанный конец фразы), длительность.
Это не замена прослушиванию: ударения, интонацию и характер голоса оценивает человек.

  python tools/voice/check-asr.py assets-src/audio/ru/agata/samples/clone --model <путь к whisper>
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


def norm_words(text: str) -> list[str]:
    t = text.replace("\u0301", "").lower().replace("ё", "е")
    t = re.sub(r"[^a-zа-я0-9\s-]", " ", t)
    t = t.replace("-", " ")
    return [w for w in t.split() if w]


def wer(ref: list[str], hyp: list[str]) -> float:
    # Расстояние Левенштейна по словам / число слов эталона.
    d = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        prev, d[0] = d[0], i
        for j, h in enumerate(hyp, 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (r != h))
            prev, d[j] = d[j], cur
    return d[len(hyp)] / max(1, len(ref))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dir")
    ap.add_argument("--model", default="openai/whisper-large-v3-turbo")
    ap.add_argument("--max-wer", type=float, default=0.25, help="порог доли ошибочных слов для статуса «проверить»")
    args = ap.parse_args()

    import soundfile as sf
    import torch
    from transformers import pipeline

    asr = pipeline("automatic-speech-recognition", model=args.model, device="cpu", torch_dtype=torch.float32)
    d = Path(args.dir)
    rows = []
    for meta_path in sorted(d.glob("*.json")):
        if meta_path.name.startswith("_"):
            continue
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        flac = d / f"{meta['id']}.flac"
        if not flac.exists():
            continue
        wav, sr = sf.read(str(flac), dtype="float32")
        heard = asr({"raw": wav, "sampling_rate": sr}, generate_kwargs={"language": "russian", "task": "transcribe"})["text"].strip()
        ref, hyp = norm_words(meta["text"]), norm_words(heard)
        w = wer(ref, hyp)
        last_ok = bool(ref) and bool(hyp) and ref[-1] == hyp[-1]
        status = "ok" if w <= args.max_wer and last_ok else "проверить"
        rows.append({"id": meta["id"], "text": meta["text"], "heard": heard, "wer": round(w, 3), "lastWordOk": last_ok, "durationSec": meta.get("durationSec"), "status": status})
        print(f"[{status}] {meta['id']}: WER {w:.2f}, конец {'да' if last_ok else 'НЕТ'} | «{heard}»")
    (d / "_asr-report.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    bad = [r for r in rows if r["status"] != "ok"]
    print(f"Итог: {len(rows) - len(bad)}/{len(rows)} без замечаний распознавания")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
