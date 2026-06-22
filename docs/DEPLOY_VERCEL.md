# Deploy → Vercel (быстрая инструкция)

SPA на Vite. Деплой — прямо из GitHub-репозитория, без CLI. Вся конфигурация уже в репо (`vercel.json`, CI). Делается один раз.

## Что уже настроено в репо

- **`vercel.json`** — build (`pnpm build` = `tsc -b && vite build`), output `dist`, SPA-fallback rewrite на `/index.html`. **Хост бэка тут НЕ хранится** (раньше был хардкод в `rewrites.destination`, убрали).
- **`middleware.ts`** (корень) — **reverse-proxy `/api/*` → бэк**, адрес читается из server-env `BACKEND_ORIGIN` (см. ниже), а не из репо. `rewrite()` проксирует на стороне сервера, поэтому фронт ходит на относительный `/api/v1/...` без CORS/mixed-content, и домен бэка не виден ни в коммитах, ни в браузере. Локальный `pnpm dev` middleware не использует — там Vite-прокси (`VITE_BACKEND_URL`).
- **`.github/workflows/ci.yml`** — на каждый push/PR в `main` гоняет `typecheck → lint → test → build` (гейт CLAUDE §7). Деплой Vercel и CI независимы.

## Шаги: подключить GitHub-репо к Vercel

1. Зайти на **[vercel.com](https://vercel.com)** → залогиниться через **GitHub** (тот же аккаунт, где `rbdakee/shyraq_frontend_admin`).
2. **Add New… → Project** → **Import Git Repository** → выбрать **`rbdakee/shyraq_frontend_admin`**.
   - Если репо не видно: **Adjust GitHub App Permissions** → дать Vercel доступ к этому репозиторию.
3. На экране конфигурации:
   - **Framework Preset** — определится как **Vite** (не менять).
   - **Build/Output/Install** — **не трогать**, всё берётся из `vercel.json`.
   - **Root Directory** — оставить корень (`.`). _(Репо = сам фронт.)_
   - **Environment Variables** → добавить:

     | Name                | Value                  | Environments                     |
     | ------------------- | ---------------------- | -------------------------------- |
     | `VITE_API_BASE_URL` | `/api/v1`              | Production, Preview, Development |
     | `BACKEND_ORIGIN`    | `https://<домен-бэка>` | Production, Preview, Development |

     > `VITE_API_BASE_URL` обязательна: Vite инлайнит `import.meta.env` на этапе build; без неё бандл упадёт в рантайме (`env.ts` Zod-проверка). Значение — то же, что в `.env.example`.
     > `BACKEND_ORIGIN` — адрес бэка для `middleware.ts` (reverse-proxy `/api/*`). **Без префикса `VITE_`** специально: не попадает в клиентский бандл. Значение задаётся **только тут** (и в локальном `.env`, который в `.gitignore`) — в репо домена нет.
     > `VITE_APP_VERSION` добавлять не нужно (дефолт из `package.json`).

4. **Deploy**. Первый билд ~1–2 мин → выдаст URL `https://<project>.vercel.app`.

## Дальше (автоматически)

- **Push в `main`** → Production-деплой.
- **Pull Request** → отдельный Preview-деплой (ссылка в PR).
- Параллельно GitHub Actions гоняет гейт. _(Опционально: Vercel → Project → Settings → Git → включить «Wait for CI» / Required checks, чтобы Production не катился на красном CI.)_

## Проверка после первого деплоя

1. Открыть `https://<project>.vercel.app` → логин по телефону+OTP должен пройти (значит `/api/*` проксируется).
2. Hard-reload на `/` и `/children` → имя в топбаре и название садика на дашборде восстанавливаются (reload-fix).
3. Если API не отвечает: Vercel → Deployment → **Functions/Logs** (там логи `middleware.ts`), проверить, что env `BACKEND_ORIGIN` задан и бэкенд по нему доступен. Частая причина 500 на `/api/*` — забыли добавить `BACKEND_ORIGIN` в Environment Variables.

## Ограничения / на будущее

- **Адрес бэка живёт в env `BACKEND_ORIGIN`, не в репо.** Сменить бэкенд (напр. dev → прод-домен) = поменять **только** значение `BACKEND_ORIGIN` в Vercel Environment Variables; код/`vercel.json` не трогаем, `VITE_API_BASE_URL` остаётся `/api/v1`. Текущий dev-бэк — HTTPS-домен с валидным сертификатом; старый IP `http://194.238.42.156:5678` пока отвечает, но мигрировали на домен (mixed-content / iOS ATS).
- **WebSockets (socket.io, B14 — ещё не отгружено).** Vercel rewrites **не проксируют** WS. Когда добавится realtime — коннектиться напрямую к бэкенду через `wss://balam-api-dev.innodev.kz` (TLS уже есть); с HTTPS-страницы `ws://` браузер заблокирует.
- **Custom domain** (опц.): Vercel → Project → Settings → Domains.
