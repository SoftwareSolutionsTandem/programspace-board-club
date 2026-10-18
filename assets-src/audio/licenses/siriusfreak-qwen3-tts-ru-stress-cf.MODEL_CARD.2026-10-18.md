---
license: apache-2.0
language:
- ru
base_model: Qwen/Qwen3-TTS-12Hz-1.7B-Base
pipeline_tag: text-to-speech
tags:
- text-to-speech
- tts
- russian
- stress
- lora
- qwen3-tts
---

# Qwen3-TTS-12Hz-1.7B-Base · Russian stress marks that are actually followed

A fine-tune of [Qwen/Qwen3-TTS-12Hz-1.7B-Base](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base)
that puts Russian word stress where the text marks it — including marks that contradict
the dictionary. The mark is the combining acute U+0301 after the stressed vowel:
«за́мок» / «замо́к», «сто́ит» / «стои́т», «до́кументы».

**Русский.** Дообучение Qwen3-TTS 1.7B: модель ставит ударение туда, где стоит знак U+0301
после ударной гласной, в том числе против словаря. Главное отличие от предыдущих адаптеров —
контрафактный штраф при обучении и метки, сверенные со звуком. Ниже — результаты и как обучали.

| | follows a mark **on** the dictionary vowel | follows a mark **against** the dictionary |
|---|---|---|
| Qwen3-TTS-12Hz-1.7B-Base | 65% | 17% |
| [voicy ru-stress LoRA](https://huggingface.co/sknyazev/qwen3-tts-12hz-1.7b-ru-stress-gguf) | 100% | 77% |
| **this model** | **100%** | **96%** |

Judged from the audio by a stress detector (see *Evaluation*), 130 sentences, ~730 marks against
the dictionary over two sampling seeds, 95% interval ±1.5 points. On ordinary text marked by
RUAccent the model departs from the marks in 0.1% of words (voicy 0.6%), with CER 2.9% through
Whisper (voicy 4.4%). Homographs
(за́мок/замо́к, му́ки/муки́, …) are followed in 98–100% of cases by all fine-tunes, voicy's included.

## Files

| path | what |
|---|---|
| `/` (root) | the merged checkpoint: a drop-in replacement for the base in `qwen_tts` or vLLM-Omni |
| `lora/` | the adapter alone (35 MB): LoRA r=16, alpha=32 on the talker's attention and MLP (`adapter.json`) |
| `scripts/` | training, data and evaluation code (see *How it was trained*) |
| `scripts/merge_lora.py` | merge `lora/` into a base snapshot yourself |
| `meter/` | **meter2**, the audio stress detector used for evaluation and for cleaning the training data |
| `eval/` | the result tables behind the numbers here (every model we trained, judged by meter2) |

## Usage

```python
import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

tts = Qwen3TTSModel.from_pretrained("siriusfreak/qwen3-tts-12hz-1.7b-ru-stress-cf",
                                    device_map="cuda:0", dtype=torch.bfloat16)
text = "За́мок стои́т на холме́, а ма́стер почини́л замо́к в двери́."
wavs, sr = tts.generate_voice_clone(text=text, language="Russian",
                                    ref_audio="voice.wav", ref_text="transcript of voice.wav")
sf.write("out.wav", wavs[0], sr)
```

- Mark only what matters, or every word: unmarked words are read by the model's own judgement.
  For automatic marks we use [RUAccent](https://huggingface.co/ruaccent/accentuator) (MIT) and
  convert its «+» before the vowel to U+0301 after it.
- **Lowercase Title-case words before RUAccent.** It stresses a capitalized word worse than the
  same word in lower case («Ка́кая сегодня погода», «По́том мы пошли»): against what Russian
  LibriSpeech readers actually said it is right on 95.2% of capitalized words as written and on
  97.4% lowercased (lowercase words unchanged). With marks followed this faithfully, RUAccent's
  own errors (2–3% of words) are what is left.
- Trained and evaluated in the in-context voice-cloning layout (reference audio + its transcript),
  `language="Russian"`. Served in production with vLLM-Omni v0.30.0 as a plain Base model.

## How it was trained

The starting point is voicy's recipe (`stress_ft_train.py` in [olluorg/voicy](https://github.com/olluorg/voicy)):
LoRA r16 on `talker.model` attention + MLP, loss = codebook-0 CE + 0.3 × code-predictor CE, every example
in the ICL layout generation uses, ~12 h of Russian LibriSpeech with RUAccent marks on 70% of words plus
synthetic phrases with deliberately moved stress. That adapter follows a non-dictionary mark ~77% of the time.

**Why plain fine-tuning stalls.** On natural speech a mark repeats what the word already says: validation
loss is identical with and without marks, and stress changes 3–4 frames out of ~100. Nothing in the loss
asks the model to read the mark.

1. **Counterfactual mark loss.** For every example, the same audio is scored with one word's mark moved to
   another vowel; the summed codebook-0 NLL must be at least 5 nats higher than with the true mark
   (hinge, weight 0.1). Both sides keep their gradient: detaching the true side lets the model satisfy the
   hinge by degrading everything, and it collapsed within 40 steps. Moving a mark now costs the model
   ~10–12 nats on held-out audio, against 1.5–1.9 for the earlier adapters.
   → 77% → 94% (meter2) after one epoch.
2. **Marks checked against the audio.** meter2 re-judged every mark of the training set: 1.9% of RUAccent's
   marks on Russian LibriSpeech were wrong for what the reader said (Ива́нович, кака́я, пото́м, poetic
   stresses) and were moved; 20% of the synthetic shifted-stress phrases (ESpeech-TTS-1 renders that the
   older detector had let through) did not stress what their marks say and were dropped. Each such example
   taught "the mark may lie". Reading of unmarked text came back to the base model's level.
3. **Two epochs** (a third added nothing): 96%.
4. **The model's own hard cases.** The adapter read ~1.5k book sentences with marks against the dictionary,
   biased to where it still missed (last syllables, е/и endings), four takes each. meter2 kept 1515 takes
   where every such mark was followed (positives) and 186 confident misses with the frames of the missed
   word (negatives). One more epoch at lr 5e-5: CE + the counterfactual loss + a hinge pushing each
   negative's span log-likelihood 3 nats below the starting model. On the control test the change is within
   noise (95.8% → 96.3%; items missed in both seeds 7 → 3); by ear it is better on the hardest endings.

Tried and not kept: classifier-free guidance on the mark at inference, scaling the LoRA ×1.5, a 3× stronger
counterfactual loss (worse after the second epoch), replacing the marked word by its IPA in braces (works,
96%, but no better than the mark and a worse CER), and self-distillation in natural voices to remove a
"synthetic reference" shortcut that turned out not to exist (48% vs 48%).

## Evaluation

- **meter2** (`meter/`): the known text is force-aligned to the audio with
  [jonatasgrosman/wav2vec2-large-xlsr-53-russian](https://huggingface.co/jonatasgrosman/wav2vec2-large-xlsr-53-russian)
  (CTC), the hidden states of layers 12 and 19 are pooled over every vowel, and a small MLP picks the
  stressed vowel of each word. Exact-syllable accuracy: 98.3% on natural Russian LibriSpeech words
  (unseen readers), 99.3% on Silero renders with stress on non-dictionary vowels. The detector used before
  it (loudness contours vs Silero templates) was 68–77% and hid most of the differences between models.
- **Control test** (`scripts/control_big.py`, `scripts/sentences_big.py`): 130 sentences; in each, one word
  gets the mark on each of its vowels in turn, other words unmarked; ~2/3 of the marks contradict the
  dictionary.
- **Ordinary text** (voicy's evaluation set, 79 sentences, RUAccent marks on every word): share of words
  stressed off the marks; also CER through Whisper and speaker similarity, unchanged.
- **Caveat.** What is left concentrates on marks put on е/и endings («фотографии́», «задание́»), which
  are rare in real text and where unstressed and stressed vowels sound alike. On those cases meter2 itself
  agrees with Silero ground truth only ~83–88% of the time, so part of the remaining 4% is the detector.
  The numbers are meter2's view, not human ratings.

## License and data

Apache-2.0, as the base model and voicy's adapter.

- Russian LibriSpeech ([istupakov/russian_librispeech](https://huggingface.co/datasets/istupakov/russian_librispeech),
  CC-BY-4.0; public-domain LibriVox recordings).
- Shifted-stress phrases were voiced by [ESpeech-TTS-1 RL-V2](https://huggingface.co/ESpeech/ESpeech-TTS-1_RL-V2)
  (Apache-2.0).
- ⚠️ **The texts of those phrases (and 24 reference voice clips for ESpeech) come from
  [biggest-ru-book](https://huggingface.co/datasets/its5Q/biggest-ru-book), which declares no license**,
  through the stress annotation of [Balalaika](https://huggingface.co/datasets/lab260/biggest_ru_book_balalaika)
  (Apache-2.0). Check this before any commercial use.
- ⚠️ meter2's head was trained on Russian LibriSpeech and on audio rendered with
  [Silero TTS](https://github.com/snakers4/silero-models), whose models are distributed under a
  non-commercial license; treat the detector as a research tool.
- Stress marks for training and evaluation: [RUAccent](https://huggingface.co/ruaccent/accentuator) (MIT).

Thanks to voicy (sknyazev) for the recipe and the baseline adapter, the Qwen team, ESpeech, RUAccent,
the Russian LibriSpeech and Balalaika authors.
