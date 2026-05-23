# Deploy → Vercel (быстрая инструкция)

SPA на Vite. Деплой — прямо из GitHub-репозитория, без CLI. Вся конфигурация уже в репо (`vercel.json`, CI). Делается один раз.

## Что уже настроено в репо

- **`vercel.json`** — build (`pnpm build` = `tsc -b && vite build`), output `dist`, и **reverse-proxy `/api/*` → `http://194.32.140.219:5678`** (точная копия dev-прокси из `vite.config.ts`). Поэтому фронт в проде ходит на относительный `/api/v1/...` — без CORS и без mixed-content (прокси на стороне Vercel, сервер-сервер).
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

     | Name                | Value     | Environments                     |
     | ------------------- | --------- | -------------------------------- |
     | `VITE_API_BASE_URL` | `/api/v1` | Production, Preview, Development |

     > Обязательна: Vite инлайнит `import.meta.env` на этапе build; без неё бандл упадёт в рантайме (`env.ts` Zod-проверка). Значение — то же, что в `.env.example`.
     > `VITE_APP_VERSION` добавлять не нужно (дефолт из `package.json`).

4. **Deploy**. Первый билд ~1–2 мин → выдаст URL `https://<project>.vercel.app`.

## Дальше (автоматически)

- **Push в `main`** → Production-деплой.
- **Pull Request** → отдельный Preview-деплой (ссылка в PR).
- Параллельно GitHub Actions гоняет гейт. _(Опционально: Vercel → Project → Settings → Git → включить «Wait for CI» / Required checks, чтобы Production не катился на красном CI.)_

## Проверка после первого деплоя

1. Открыть `https://<project>.vercel.app` → логин по телефону+OTP должен пройти (значит `/api/*` проксируется).
2. Hard-reload на `/` и `/children` → имя в топбаре и название садика на дашборде восстанавливаются (reload-fix).
3. Если API не отвечает: Vercel → Deployment → **Functions/Logs**, проверить `vercel.json` rewrite и что бэкенд `194.32.140.219:5678` доступен.

## Ограничения / на будущее

- **Бэкенд — голый HTTP по IP.** Прокси Vercel это терпит (сервер-сервер). Когда у бэка появится HTTPS-домен — поменять **только** `destination` в `vercel.json`, env `VITE_API_BASE_URL` остаётся `/api/v1`.
- **WebSockets (socket.io, B14 — ещё не отгружено).** Vercel rewrites **не проксируют** WS. Когда добавится realtime — коннектиться напрямую к бэкенду, и для этого бэку нужен `wss://` (TLS); с HTTPS-страницы `ws://` браузер заблокирует.
- **Custom domain** (опц.): Vercel → Project → Settings → Domains.
