# Игротека (рабочее название)

Мультяшный сборник классических настольных и карточных игр с озвученными персонажами — для Яндекс Игр. Разработчик: ProgramSpace.

Первая игра — подкидной дурак 1 на 1 с Бабушкой Агатой. Состояние работ — [`docs/PROGRESS.md`](docs/PROGRESS.md), план — [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Требования
- Node.js 22.13+ (проверено на 22.22) и npm 10+.
- VS Code (рекомендуемые расширения предлагаются автоматически: ESLint, Vitest).

## Запуск
```bash
npm install        # один раз после клонирования и после изменения package.json
npm run dev        # dev-сервер: откройте адрес из консоли (обычно http://localhost:5173)
```

## Команды
| Команда | Что делает |
|---|---|
| `npm run dev` | dev-сервер с горячей перезагрузкой |
| `npm test` | автотесты (Vitest) |
| `npm run test:watch` | тесты в режиме наблюдения |
| `npm run typecheck` | проверка типов TypeScript |
| `npm run lint` | ESLint, включая правила чистоты кода правил и ИИ |
| `npm run build` | production-сборка в `dist/` |
| `npm run preview` | локальный просмотр production-сборки |
| `npm run check` | всё сразу: lint → typecheck → test → build (то же, что CI) |

## Документация
- Концепция — `docs/CONCEPT.md`; решения — `docs/DECISIONS.md`; архитектура — `docs/ARCHITECTURE.md`.
- Звук и озвучка — `docs/AUDIO.md`; стиль — `docs/ART_STYLE.md`; персонажи — `docs/CHARACTERS.md`.
- Правила игр — `docs/games/`; платформа — `docs/YANDEX.md`; монетизация — `docs/MONETIZATION.md`.
- Компоновки для телефона и компьютера — `docs/LAYOUT.md`.
- Тестирование — `docs/TESTING.md`; локализация — `docs/LOCALIZATION.md`.
- Правила для ассистента — `CLAUDE.md`.

## Структура
```
src/core/      ГСЧ и общие типы (без DOM)
src/i18n/      каталог строк и t()
src/ui/        HTML-экраны поверх сцены
src/main.ts    запуск: Pixi-сцена + экраны
tests/         автотесты
assets-src/    исходники ассетов (в сборку не входят), в т.ч. концепт Агаты
docs/          документация проекта
```
