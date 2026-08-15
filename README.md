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

## Локальная разработка (Dev)

```bash
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL + Redis
cp .env.example server/.env                       # подстройте под себя
npm run dev:server
npm run dev:client
```

Применить миграции и наполнить БД демо-данными:

```bash
npx prisma migrate deploy --schema server/prisma/schema.prisma
npm run db:seed -w server
```

## Деплой (Production, Docker Compose)

Стек поднимается целиком: `db` (PostgreSQL), `redis`, `api` (Express),
`web` (nginx со статикой SPA), `nginx` (входной reverse-proxy на порту 80).

```bash
# 1. Настройте переменные (JWT_SECRET обязателен, остальное по умолчанию)
cp .env.example .env

# PowerShell:
#   $env:JWT_SECRET = (openssl rand -hex 32)
# bash/zsh:
#   export JWT_SECRET=$(openssl rand -hex 32)

# 2. Соберите и запустите все сервисы
docker compose up -d --build

# 3. Примените миграции (автоматически при старте api) и засейте демо-данные
docker compose exec api sh -c "node node_modules/.bin/tsx server/prisma/seed.ts"
```

Проверка после запуска:

- `http://localhost/health` — healthcheck API
- `http://localhost/api/v1/products` — JSON-список товаров
- `http://localhost/` — SPA

Демо-аккаунты (создаются seed-скриптом):

| Роль  | Email             | Пароль   |
| ----- | ----------------- | -------- |
| admin | admin@example.com | admin123 |
| user  | user@example.com  | user123  |

Тестовая карта Stripe (test mode): **4242 4242 4242 4242**, любой срок и CVC.
Для реальной интеграции задайте `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
и `PAYMENTS_PROVIDER=stripe`.

Переменные окружения — в `.env.example` (`HTTP_PORT`, `POSTGRES_PASSWORD`,
`JWT_SECRET`, `PAYMENTS_PROVIDER`, `CLIENT_ORIGIN` и др.).

## Email-уведомления (SMTP)

Отправка писем настроена через `nodemailer` + SMTP. Письма:

- **ссылка для сброса пароля** (при запросе `/auth/password/reset`);
- **смена статуса заказа** (при переходе статуса в админ-панели: оплачен → в обработке → отправлен → доставлен).

Настройка (`.env`):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=redpendalff@gmail.com
SMTP_PASS=ваш-app-password
MAIL_FROM="Умная Корзина <redpendalff@gmail.com>"
```

Для Gmail: в Google Account → Security включите двухфакторную аутентификацию,
затем создайте «Пароль приложений» для Mail — это и есть `SMTP_PASS`
(обычный пароль Gmail не работает).

Если `SMTP_PASS` не задан, письма не отправляются: ссылка сброса пароля
логируется в консоль сервера (`[test-mode] ...`), а уведомления о статусе
пропускаются без ошибки — это удобно для локальной разработки и E2E.
В Docker Compose переменные `SMTP_*` и `MAIL_FROM` пробрасываются в контейнер api.