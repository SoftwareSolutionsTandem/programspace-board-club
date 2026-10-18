# Генерация голоса на своём компьютере (видеокарта NVIDIA)

Инструкция для компьютера с RTX 4090 (24 ГБ), 64 ГБ ОЗУ, Windows 11. Linux — в конце.
Всё бесплатно: модели с открытой лицензией Apache-2.0, интернет нужен только для установки и загрузки весов.
В игру попадают только готовые файлы; синтез во время игры не выполняется (docs/AUDIO.md §14).

## Какие модели и зачем

| Модель | Для чего | Лицензия | Объём |
|---|---|---|---|
| `Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign` | создать голос бабушки по текстовому описанию (эталонная фраза) | Apache-2.0 | ≈4,5 ГБ |
| `siriusfreak/qwen3-tts-12hz-1.7b-ru-stress-cf` | озвучить реплики этим голосом; дообучена на русском соблюдать знак ударения (U+0301) | Apache-2.0 | ≈4,5 ГБ |
| `Qwen/Qwen3-TTS-12Hz-1.7B-Base` | исходная модель для сравнения (необязательно) | Apache-2.0 | ≈4,5 ГБ |
| `openai/whisper-large-v3-turbo` | проверка распознаванием: все ли слова на месте (необязательно) | MIT | ≈1,6 ГБ |

Ударения для всех реплик уже расставлены вручную в `tools/voice/agata.voice.json` (раздел `stress`).
Режим `--stress-style acute` передаёт их модели как есть.

Видеокарта ускоряет работу (секунды на реплику вместо минут на процессоре), но качество у той же модели
остаётся прежним. Поэтому главное здесь — модель с поддержкой ударений, а не мощность.

## 1. Программы (один раз)

Откройте PowerShell и выполните:

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e        # Node 22.18 или новее
winget install --id Python.Python.3.12 -e
winget install --id Gyan.FFmpeg -e              # нужен для сборки .opus/.m4a
```

Обновите драйвер видеокарты через NVIDIA App или с сайта nvidia.com (версия 570 или новее).
Закройте и снова откройте PowerShell, затем проверьте:

```powershell
git --version; node --version; py -3.12 --version; ffmpeg -version | Select-Object -First 1; nvidia-smi
```

`nvidia-smi` должна показать RTX 4090. Отдельно ставить CUDA Toolkit не нужно: всё нужное идёт вместе с PyTorch.

## 2. Репозиторий

```powershell
cd $HOME
git clone https://github.com/SoftwareSolutionsTandem/programspace-board-club.git
cd programspace-board-club
git checkout voice-01/agata
npm ci
```

## 3. Окружение Python

```powershell
py -3.12 -m venv .venv-voice
.\.venv-voice\Scripts\Activate.ps1
```

Если PowerShell запрещает запуск скрипта, выполните один раз
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` и повторите активацию.
Дальше все команды — в этом же окне. Перед строкой должно стоять `(.venv-voice)`.

```powershell
python -m pip install --upgrade pip
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu128
pip install -r tools/voice/requirements.txt
python -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

Последняя команда должна вывести `True NVIDIA GeForce RTX 4090`. Если выводит `False`, значит, установился
PyTorch без поддержки видеокарты. Тогда выполните `pip uninstall -y torch torchaudio` и повторите строку с `--index-url`.

`flash-attn` не нужен. Без него модель работает и на 4090 укладывается в несколько гигабайт видеопамяти.
Если при запуске будет предупреждение о `sox`, его можно не трогать. Если вместо предупреждения будет ошибка,
выполните `winget install --id ChrisBagwell.SoX -e`.

## 4. Веса моделей

Папка `models` лежит рядом с репозиторием, а не внутри него, поэтому в git не попадает.

```powershell
mkdir ..\voice-models
hf download Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign --local-dir ..\voice-models\Qwen3-TTS-12Hz-1.7B-VoiceDesign
hf download siriusfreak/qwen3-tts-12hz-1.7b-ru-stress-cf --local-dir ..\voice-models\qwen3-tts-12hz-1.7b-ru-stress-cf --exclude "scripts/*" "meter/*" "eval/*"
hf download openai/whisper-large-v3-turbo --local-dir ..\voice-models\whisper-large-v3-turbo
# по желанию, для сравнения:
hf download Qwen/Qwen3-TTS-12Hz-1.7B-Base --local-dir ..\voice-models\Qwen3-TTS-12Hz-1.7B-Base
```

Если команды `hf` нет, используйте `huggingface-cli download …` с теми же аргументами. Регистрация на Hugging Face не нужна.

## 5. Голос: кандидаты

```powershell
python tools/voice/generate.py --audition 4 --models-dir ..\voice-models --out assets-src/audio/ru/agata/audition-gpu
```

Каждое из трёх описаний бабушки в `agata.voice.json` (`personas`) будет озвучено с четырьмя разными сидами.
Получится 12 файлов `_audition_p*_s*.flac`, а в `_audition.json` будет основной тон каждого кандидата.
У пожилого голоса он обычно ниже 200 Гц.
Послушайте кандидатов и выберите один. Можно оставить уже знакомый голос A:
`assets-src/audio/ru/agata/audition/_audition_p0_s1308.flac`.

## 6. Пробные реплики

```powershell
python tools/voice/generate.py --samples --stress-style acute `
  --models-dir ..\voice-models --clone-model siriusfreak/qwen3-tts-12hz-1.7b-ru-stress-cf `
  --reference-file assets-src/audio/ru/agata/audition/_audition_p0_s1308.flac `
  --out assets-src/audio/ru/agata/samples-gpu
python tools/voice/check-asr.py assets-src/audio/ru/agata/samples-gpu --model ..\voice-models\whisper-large-v3-turbo --device cuda:0
```

Другой дубль тех же реплик даёт `--seed-offset 1` (2, 3 и т. д.) вместе с `--regen`.
Неудачную реплику можно переделать отдельно: `--only agata_bito_01 --regen --seed-offset 2`.
Если ударение нужно поправить, исправьте строку в разделе `stress` файла `agata.voice.json`.
Знак ударения ставится сразу после ударной гласной. Без знаков текст должен совпадать с `lines.ts`, иначе генератор остановится.

## 7. Весь каталог — только после одобрения голоса

```powershell
python tools/voice/generate.py --all --stress-style acute `
  --models-dir ..\voice-models --clone-model siriusfreak/qwen3-tts-12hz-1.7b-ru-stress-cf `
  --reference-file <выбранный эталон> --out assets-src/audio/ru/agata/final
python tools/voice/check-asr.py assets-src/audio/ru/agata/final --model ..\voice-models\whisper-large-v3-turbo --device cuda:0
node tools/audio/build-voice.mjs --src assets-src/audio/ru/agata/final --no-manifest --report gpu-final
```

`build-voice.mjs` с `--no-manifest` только проверяет громкость и тишину и пишет отчёт. Выкладку в
`public/audio` с записью лицензии в `assets/audio/LICENSES.md` сделаю я после вашего одобрения.

## 8. Как передать результат

```powershell
git add assets-src/audio/ru/agata/samples-gpu tools/voice/agata.voice.json
git commit -m "voice: GPU samples"
git push
```

Можно и без git: заархивируйте папку и пришлите в чат.

## Linux (или WSL2)

```bash
sudo apt install git ffmpeg python3.12-venv   # Node 22.18+ — с nodejs.org или через nvm
python3.12 -m venv .venv-voice && source .venv-voice/bin/activate
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu128
pip install -r tools/voice/requirements.txt
```

Остальные команды те же, только `\` вместо `` ` `` для переноса строк и `/` в путях.

## Запасной вариант

Модель `openbmb/VoxCPM2` (Apache-2.0, 2 млрд параметров, апрель 2026) тоже говорит по-русски и умеет создавать голос
по описанию. Но ударения она расставляет сама, а наш генератор её пока не поддерживает.
Пробовать её стоит, только если доработанный Qwen не устроит.
