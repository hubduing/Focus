# E-commerce платформа

Полнофункциональный интернет-магазин: каталог, корзина, поиск/фильтры, личный кабинет,
админ-панель и тестовая оплата Stripe.

## Стек

- **Backend:** Node.js + Express (TypeScript, Prisma ORM)
- **Frontend:** React + Vite (SPA, TypeScript)
- **Shared:** общие типы и Zod-схемы
- **БД:** PostgreSQL (основная) + Redis (кэш/сессии/корзина)
- **Платежи:** Stripe test mode
- **Деплой:** Docker Compose

## Структура (monorepo)

```
client/    # React SPA
server/    # Express API (/api/v1)
shared/    # общие типы, Zod-схемы, константы
план/      # план разработки
```

## Соглашения

- **API:** REST, префикс `/api/v1`. Списки: `{ data, meta }`, ошибки: `{ error, message, details }`.
- **Код-стиль:** Prettier (без `;`, одинарные кавычки), ESLint (typescript-eslint).
- **Типизация:** строгий TypeScript, все входные данные валидируются через Zod в shared.
- **Git-flow:** ветка `main` — стабильная; фичи в ветках `feat/*`; коммиты на русском, в стиле "Этап N: ...".
- **Секреты:** только `.env` (шаблон — `.env.example`), в репозиторий не попадают.
- **Валюты/язык:** интерфейс русский, цены в рублях.

## Команды

```bash
npm run dev:server   # сервер (порт 4000)
npm run dev:client   # клиент Vite (порт 5173)
npm run lint         # ESLint по всем пакетам
npm run typecheck    # typecheck по всем пакетам
npm test             # тесты
npm run build        # сборка
```