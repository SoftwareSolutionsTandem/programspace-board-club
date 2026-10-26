# Игротека (рабочее название)

Мультяшный сборник классических настольных и карточных игр с озвученными персонажами — для Яндекс Игр. Разработчик: ProgramSpace.

Состояние работ — [`docs/PROGRESS.md`](docs/PROGRESS.md), план — [`docs/ROADMAP.md`](docs/ROADMAP.md), правила для ассистента и порядок веток — [`CLAUDE.md`](CLAUDE.md).

## Что есть сейчас
| Продукт | Игры | Персонаж | Сборка |
|---|---|---|---|
| «Игротека» (сборник) | подкидной дурак, домино, шахматы, шашки | Бабушка Агата, Дед Матвей, Харитон, Костян | `npm run build:igroteka` → `dist/igroteka/` |
| «Подкидной дурак» | подкидной дурак 1 на 1 | Бабушка Агата | `npm run build:durak` → `dist/durak/` |
| «Домино» | домино «с базаром» 1 на 1, до 101 | Дед Матвей | `npm run build:dominoes` → `dist/dominoes/` |
| «Шахматы» | классические шахматы на изометрической доске | Харитон | `npm run build:chess` → `dist/chess/` |
| «Шашки» | русские шашки на изометрической доске | Костян | `npm run build:checkers` → `dist/checkers/` |

У Харитона и Костяна пока нет записанного голоса: каталоги реплик и сценарии записи готовы (`docs/voice/`), в игре они отвечают мимикой и жестом. Ни один продукт ещё не выпущен; что осталось до выпуска — в `docs/PROGRESS.md`.

## Требования
- Node.js 22.13+ (проверено на 22.22) и npm 10+.
- VS Code (рекомендуемые расширения предлагаются автоматически: ESLint, Vitest).
- Для сборки голоса (`tools/audio/build-voice.mjs`) — ffmpeg с libopus. Для обычной разработки не нужен.

## Запуск
```bash
npm install          # один раз после клонирования и после изменения package.json
npm run dev          # «Игротека»: откройте адрес из консоли (обычно http://localhost:5173)
npm run dev:durak    # самостоятельный «Дурак»
npm run dev:dominoes # самостоятельное «Домино»
npm run dev:chess    # самостоятельные «Шахматы»
npm run dev:checkers # самостоятельные «Шашки»
```
Демо анимаций (только режим разработки): `/?anim` — Агата, `/?anim=matvey` — Матвей.

## Команды
| Команда | Что делает |
|---|---|
| `npm run dev`, `dev:durak`, `dev:dominoes`, `dev:chess`, `dev:checkers` | dev-сервер продукта с горячей перезагрузкой |
| `npm test` | автотесты (Vitest) |
| `npm run test:watch` | тесты в режиме наблюдения |
| `npm run typecheck` | проверка типов TypeScript |
| `npm run lint` | ESLint, включая правила чистоты кода правил и ИИ |
| `npm run check:assets` | права на каждый аудиофайл (`assets/audio/LICENSES.md`) и ссылки манифестов |
| `npm run build:all` | сборка всех пяти продуктов; по одному — `build:igroteka`, `build:durak`, `build:dominoes`, `build:chess`, `build:checkers` |
| `npm run check:bundle` | проверка состава собранных продуктов: только свои игры, персонажи и ресурсы |
| `npm run preview`, `preview:durak`, `preview:dominoes`, `preview:chess`, `preview:checkers` | локальный просмотр собранного продукта |
| `npm run check` | всё сразу: lint → typecheck → check:assets → test → build:all → check:bundle (то же, что CI) |
| `npm run test:e2e` | браузерные проверки Playwright всех продуктов (собирает их сам) |

## Документация
- Концепция — `docs/CONCEPT.md`; решения — `docs/DECISIONS.md`; архитектура и продукты — `docs/ARCHITECTURE.md`.
- Звук и озвучка — `docs/AUDIO.md`; сценарии реплик — `docs/voice/` (Матвей, Харитон, Костян); стиль и анимация — `docs/ART_STYLE.md`; персонажи — `docs/CHARACTERS.md`.
- Правила игр — `docs/games/`; компоновки для телефона и компьютера — `docs/LAYOUT.md`.
- Тестирование — `docs/TESTING.md`; локализация — `docs/LOCALIZATION.md`; платформа — `docs/YANDEX.md`; монетизация — `docs/MONETIZATION.md`.

## Структура
```
src/main.ts          запуск приложения (и dev-страниц анимации)
src/app/             приложение: клуб, загрузка, настройки, интерфейс игрового модуля (game.ts)
src/games/<игра>/    durak, dominoes, chess, checkers: rules/ (чистые правила), view.ts, ai/, match.ts, scene/, module.ts
src/board/           общее для шахмат и шашек: изометрическая доска, сеанс партии, контроллер
src/characters/      персонажи: agata/, matvey/, khariton/, kostyan/ (рисунок, марионетка, движения, реплики), режиссёр реакций
src/puppet/          общий движок марионетки персонажа
src/audio/           Web Audio и голосовой канал
src/layout/          геометрия экранов (computeLayout) — чистые функции
src/render/          твины, фон клуба, стол, растеризация SVG
src/products/        паспорта продуктов (<id>.json) и их состав игр (<id>.games.ts)
src/storage/, src/i18n/, src/core/, src/ui/   настройки, строки, ГСЧ, стили
src/dev/             демо-страницы анимации (только режим разработки)
public/audio/        голоса персонажей для игры (Opus + AAC + манифест)
assets/audio/        реестр прав на аудио
assets-src/          исходники: записи голосов (FLAC), концепты; в сборку не входят
tools/               сборка голоса, аудит сборок, проверка прав, запись видео анимаций
tests/               автотесты; tests/e2e/ — Playwright
docs/                документация проекта
```
