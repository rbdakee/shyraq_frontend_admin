# CLAUDE.md — Shyraq Admin Web (frontend)

Onboarding for every Claude Code session in this repo. **Read top to bottom before editing.**

---

## 1. Project

**Shyraq Admin Web** — веб-кабинет управления **одним садиком** для сотрудника с ролью `admin` (заведующая/управляющий). Операционный, насыщенный данными инструмент ежедневного использования. Desktop-first (1280–1920, корректно на 1366×768), плюс **mobile-shell (<1024px, 33 экрана)** — см. `docs/design/handoff-with-mobile/`. RU + KK.

**1 из 4 клиентов одного backend:** SuperAdmin (`../frontend_superadmin/`), **Admin (этот репо)**, Staff App, Parent App. Backend один: `http://194.32.140.219:5678`.

**Первичны наши docs + готовый дизайн** (HANDOFF / DESIGN / `docs/design/handoff/`) и этот `CLAUDE.md` + `docs/IMPLEMENTATION_PLAN.md`. Стек и конвенции — наше решение, зафиксировано в плане (§Foundations). `../frontend_superadmin/` — соседний сервис на похожем стеке: заглядывать туда как в **пример**, только если возник открытый вопрос по архитектуре/тулингу и ответа нет в наших docs. Не «эталон», не копировать вслепую.

---

## 2. Sources of truth (читать ДО того как что-то выдумывать)

Никогда не выдумывать endpoint, поле DTO, бизнес-логику или экран.

| Аспект                                                    | Файл                                                                                                                                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Контракты API + бизнес-процессы + статус backend          | [`docs/ADMIN_FRONTEND_HANDOFF.md`](docs/ADMIN_FRONTEND_HANDOFF.md)                                                                                                                              |
| UI-спека (страницы, состояния, поведение, дизайн-система) | [`docs/ADMIN_DESIGN_SPEC.md`](docs/ADMIN_DESIGN_SPEC.md)                                                                                                                                        |
| Implementation tracker (батчи, acceptance, TODO backlog)  | [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)                                                                                                                                    |
| Открытые вопросы / blocker'ы (что НЕ делать без решения)  | [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md)                                                                                                                                              |
| Backend-нехватки для полноты данных (каталог)             | [`docs/BACKEND_NEEDINGS_HANDOFF.md`](docs/BACKEND_NEEDINGS_HANDOFF.md)                                                                                                                          |
| Визуальный handoff (HTML/JSX прототип всех 28 экранов)    | [`docs/design/handoff/shyraq-admin/project/`](docs/design/handoff/shyraq-admin/project/)                                                                                                        |
| Визуальный handoff (mobile, 33 экрана)                    | [`docs/design/handoff-with-mobile/shyraq-admin/project/`](docs/design/handoff-with-mobile/shyraq-admin/project/) (`mobile-app.jsx`, `mobile-screens.jsx`, `mobile-screens-2.jsx`, `mobile.css`) |
| Дизайн-токены / темы / Tweaks-панель                      | [`docs/design/handoff/shyraq-admin/project/styles.css`](docs/design/handoff/shyraq-admin/project/styles.css), [`app.jsx`](docs/design/handoff/shyraq-admin/project/app.jsx) (`THEMES`)          |
| Backend OpenAPI (live)                                    | `http://194.32.140.219:5678/docs-json` · Swagger `…/docs`                                                                                                                                       |

**Backend code** (`../backend_shyraq_v2/`) — читать **только** при критической неопределённости или подозрении на расхождение с handoff. После расхождения — обновить наши docs.

**First-document rule.** Документы первичны, код вторичен. Порядок любого нетривиального изменения:

1. Решить в `docs/ADMIN_FRONTEND_HANDOFF.md` / `docs/ADMIN_DESIGN_SPEC.md` / `docs/OPEN_QUESTIONS.md` (контракт, edge-cases, открытые вопросы).
2. Добавить task/acceptance в нужный батч `docs/IMPLEMENTATION_PLAN.md`.
3. Только потом — код, строго по обновлённым docs.

Противоречие docs↔код или внутри docs → **остановить батч**, запись в `OPEN_QUESTIONS.md`, обсудить, обновить docs, потом продолжить. «Закодим, потом обновим docs» — антипаттерн.

---

## 3. Backend integration

API base — `/api/v1`. Полный путь endpoint'а — `/api/v1/<route>`. Swagger живёт на корне домена, **не** под `/api/v1`.

- **Dev:** Vite proxy `'/api' → http://194.32.140.219:5678` (`vite.config.ts`) — пишем `fetch('/api/v1/...')`, CORS не нужен. Хост никогда не хардкодим — через `env.ts` (`VITE_API_BASE_URL=/api/v1`).
- **Типы:** `pnpm gen:api` генерит `src/api/types/openapi.d.ts` из live `/docs-json`. Артефакт коммитим. Backend изменился → `gen:api` + `pnpm typecheck` зелёный.
- **Auth:** телефон + OTP. Access JWT (15m) — **in-memory**. Refresh opaque hex 64 (30d) — **localStorage** (Admin публичен, не за VPN; принято на MVP, cookie-flow — future). Silent single-flight refresh на `401 invalid_token|token_revoked`; провал → разлогин на `/login`. `pending_role_select` → экран выбора садика.
- **i18n данные:** канонический ключ — **`kk`** (BCP 47) во всех новых и legacy модулях (backend B22b sweep, см. OPEN_QUESTIONS §A19). Legacy `kz` принимается на input один релиз (backend нормализует → `kk` через `normalizeLegacyKzLocale`), удаляется в backend B23. Фронт **шлёт и читает только `kk`**. `lib/jsonb-i18n.ts` сохраняет fallback на `kz` для чтения непромигрированных старых записей (DB-миграция `B22I18nKzToKk` идёт параллельно). Заголовок `x-custom-lang: ru|kk` (никогда `en`/`kz`) из текущей локали.
- **Пагинация:** offset (`limit/offset`+`total`, большинство) vs cursor (`cursor/limit`+`next_cursor`: parent-requests, content, lifecycle DLQ, notifications). Режим — per-endpoint в handoff §2.5.
- **Ошибки:** envelope `{error, message, details?}` ИЛИ nest-422 `{statusCode, message[], error}`. Мапим **код** → i18n через `lib/error-map.ts`. Никогда не показываем `err.message`/stack.
- **WS:** `wss://<host>/ws`, JWT в `socket.handshake.auth.token`. `auth_error` → refresh/разлогин. События в `user:{id}` → тосты/инвалидация.

---

## 4. Layer rules (lint-checked + review)

Folder structure — `docs/IMPLEMENTATION_PLAN.md` §«Foundations».

| Слой                                                 | Разрешено                                     | Запрещено                                                  |
| ---------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| `api/`                                               | `ky`, openapi-types, чистые async-функции     | TanStack Query, React, JSX, i18n                           |
| `hooks/`                                             | TanStack Query, вызовы `api/*`, query keys    | прямой `fetch`, JSX                                        |
| `routes/`                                            | React, JSX, `hooks/*`, `components/*`, router | прямой `fetch`, прямой импорт `api/*` (только через hooks) |
| `components/ui/`                                     | shadcn primitives                             | бизнес-логика, backend-доступ                              |
| `components/{layout,data-table,forms,feedback,...}/` | UI + переиспользуемые wrappers                | доменная бизнес-логика (она в routes)                      |
| `lib/`                                               | чистые функции, без React                     | TanStack Query, JSX                                        |
| `stores/`                                            | Zustand UI-state                              | server-state (он в TanStack Query)                         |

---

## 5. Coding rules

- **DRY.** UI-паттерн в 2+ местах → компонент в `components/`. Логика формата/валидации → `lib/`. Query/mutation в 2+ местах → hook в `hooks/`. Строки UI — только `t('ns.key')`.
- **No hardcode.** Хост → `env.ts`. Магические числа → `lib/constants.ts`. Цвета/радиусы → CSS-переменные (токены). Backend error-коды → `error-map.ts`. URL-пути → `lib/routes.ts` helper. Допустимо: неизменные спеки (E.164 regex, ISO 8601).
- **Naming.** Файлы `kebab-case.{ts,tsx}`; компоненты `PascalCase`; хуки `useCamelCase`; api-функции глагол `listChildren`/`createInvoice`; query keys `['children','list',filters]`; Zod `XSchema`; без суффикса `Type` у type-alias.
- **React.** Только function components, один экспорт-компонент на файл. State: local `useState` → поднимать при шаринге → Zustand при 3+ потребителях. Избегать `useEffect` (server-state в TanStack Query). Не префьюмить `useMemo/useCallback` без бенчмарка (React 19).
- **Forms.** Всегда RHF + Zod. 422 → `setError('field')` через mapping helper. Всегда `defaultValues`.
- **Errors.** Backend-ошибки → `AppError` в `api/client.ts`; ловим в `useMutation.onError`/`useQuery`; показываем `toast.error(t('errors.<code>'))`, fallback `errors.unknown_error` + `console.error`.
- **Комментарии.** Default — нет. Только WHY (workaround, неинтуитивная инверсия, скрытое требование RLS/race, внешний контракт). Не комментировать WHAT.
- **TODO discipline.** Каждый `// TODO(B<N>): …` — parallel-запись в `IMPLEMENTATION_PLAN.md` → «TODO backlog» (тот же текст + file:line). TODO без backlog-записи удаляется в review.

---

## 6. Style, tokens, theming

- **ЗАКОН: фронт строится ТОЧНО по готовому дизайну** `docs/design/handoff/shyraq-admin/project/*`. Перед каждым UI-слайсом — открыть соответствующий экран в `screens-{core,billing,ops}.jsx` / `shell.jsx` / `ds.jsx` / `styles.css` и воспроизвести **1:1**: layout, spacing, типографика, цвета (через токены), компоненты, состояния, поведение. Не «по мотивам», не упрощать, не додумывать. Технология своя (React+shadcn/Radix вместо прототип-JSX), **визуальный и поведенческий результат — идентичный**. Отклонение допустимо ТОЛЬКО если backend-контракт физически требует иного — тогда запись в `OPEN_QUESTIONS.md` и согласование, не молчаливый дрейф.
- Палитра/типографика/радиусы/тени — из [`docs/design/handoff/shyraq-admin/project/styles.css`](docs/design/handoff/shyraq-admin/project/styles.css) (`:root` токены) → переносим в `src/styles/globals.css` как CSS-переменные; Tailwind theme читает их (`var(--…)`). Никаких `style={{}}` кроме случаев где Tailwind не покрывает (dynamic transforms/animations).
- **Темы — оставляем ВСЕ как в дизайне** (`THEMES` в `app.jsx`: green/orange/blue/mono/warmCream/forestMint/oceanBlue/dark + радиусы sharp/soft/round). Это user-facing фича: отдельная вкладка **«Дизайн»** в Настройках садика (`/settings`). Выбор персистится (localStorage через Zustand `ui-store`) и применяется при загрузке (set CSS-vars на `:root`). Каждая тема — бандл CSS-var override, цвета не хардкодим.
- **Шрифты:** Manrope + JetBrains Mono (как в `index.html` handoff). **Иконки:** Lucide React; mapping handoff-иконок (`ds.jsx#Icon`) → Lucide в `components/ui/icon.ts`. Прототип-компоненты handoff не копируем — переписываем на shadcn/Radix, матчим визуал.
- Маршруты приложения — по sitemap `ADMIN_FRONTEND_HANDOFF.md` §28 (канонично). JSX-роутер handoff — только визуальный референс; расхождения путей решаем в пользу §28.
- **Mobile-дизайн** строится по тому же правилу «1:1 по готовому дизайну» — источник `docs/design/handoff-with-mobile/shyraq-admin/project/` (`mobile.html`, `mobile.css`, `mobile-app.jsx`, `mobile-screens.jsx`, `mobile-screens-2.jsx`). Mobile использует те же CSS-var токены из `styles.css` → темы автоматически применяются. Стили с префиксом `.m-*` из `mobile.css` переносятся в `src/styles/globals.css` (или Tailwind utilities) с сохранением token-ссылок.

---

## 7. Testing

Минимальный gate перед каждым batch-коммитом: `pnpm typecheck` + `pnpm lint --max-warnings=0` + `pnpm test` — все exit 0.

- **Vitest unit:** чистые функции `lib/` (`format`, `error-map`, `jsonb-i18n`, `token-storage`) — обязательно. Нетривиальные хуки (silent-refresh, debounce) — да.
- **Component (Vitest + RTL):** ключевые переиспользуемые компоненты (`DataTable` пагинация, `DestructiveConfirm`, state-machine кнопки, RHF-формы с 422) — да.
- **Браузер-QA делает пользователь.** Playwright/e2e **не заводим** (по решению владельца). Если фича требует именно браузер-проверки — явно скажи «нужен ручной QA».

---

## 8. Do not

- Не создавать файлы вне folder structure (см. plan §Foundations) без подтверждения.
- Не делать прямой `fetch`/`axios` мимо `api/client.ts`. Не импортить `api/*` в `routes/` (только через hooks).
- Access token — никогда в localStorage/cookie (только in-memory). Refresh — только localStorage через `token-storage.ts`.
- Не `any` без подтверждения (генери типы или `unknown`+Zod). Не показывать сырой `err.message`/stack. Не дублировать UI-строки (только `t()`).
- Не запускать `pnpm gen:api` против прод-backend. Не комитить `.env*` (только `.env.example`).
- Не амендить опубликованные коммиты / force-push без явной просьбы. Не пропускать husky (`--no-verify`) без просьбы. Коммит — только когда пользователь явно попросил.
- Не реализовывать то, что в `OPEN_QUESTIONS.md` не `resolved`. Не оставлять `// TODO` без backlog-записи.
- Phase B/C модули (Фискальные чеки full, Face ID, тест камер) — строить как видимые заглушки «доступно позже», не подключать к данным.
- Не отходить от готового дизайна `docs/design/handoff/shyraq-admin/*` (desktop) и `docs/design/handoff-with-mobile/shyraq-admin/*` (mobile) — визуал/лейаут/поведение 1:1; нужно отклонение → `OPEN_QUESTIONS.md`, не самовольно.

---

## 9. Sub-agentic workflow

**Активируется ТОЛЬКО по явному триггеру** пользователя («работай в субагентах», «оркестрируй B<N>», «делегируй»). Без триггера — обычный режим (сам пишешь код).

Агенты — в [`.claude/agents/`](.claude/agents/), вызываются через `Agent` tool параметром `subagent_type`:

| `subagent_type`   | Для чего                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `coder-opus`      | **Дефолт для любого слайса с кодом.** Все UI/api/hooks/архитектурные слайсы — сюда                                           |
| `coder-sonnet`    | Только тривиальная изолированная механика без решений (install зависимости, один i18n-файл, .gitignore). При сомнении — opus |
| `reviewer-opus`   | Глубокий review нетривиального изменения (READ-ONLY)                                                                         |
| `reviewer-sonnet` | Лёгкий review совсем мелкого слайса (READ-ONLY)                                                                              |
| `reviewer-codex`  | **Обязательный second-opinion** при любом code-review нетривиального батча (отдельная модельная семья, независимый взгляд)   |

**Политика моделей (решение владельца):** качество кодовой базы важнее экономии — **по умолчанию `coder-opus`**. `coder-sonnet` — исключение для бесспорно механических задач. Если батч состоит в основном из «sonnet-слайсов» — **не дроби его на отдельные мелкие sonnet-сессии, а объедини с соседним батчем в одну `coder-opus`-оркестрацию** (одна волна = одна толковая Opus-сессия вместо россыпи слабых). Reviewer'ы — `reviewer-opus` + обязательный `reviewer-codex` на нетривиале.

**Главный агент — оркестратор, не исполнитель.** В этом режиме он держит контекст (план + acceptance + handoff), декомпозирует батч на слайсы, запускает субагентов, собирает репорты, делает финальную верификацию. **Не пишет/не читает `src/` руками** кроме финального gate (`typecheck && lint && test`) и крошечных fixup'ов (1–2 строки). Исключение «может сам»: задача настолько мала, что делегировать дороже, ИЛИ контекст результата обязан жить в памяти оркестратора.

Бриф субагенту — **self-contained** (он не видит твою переписку): что+зачем, конкретные файлы, какие docs читать (CLAUDE.md §4/§5 всегда + handoff/design § + plan §B<N>), какие acceptance закрыть (цитата), self-verification mandate (typecheck+lint+test зелёные до «done»), лимит репорта ≤200 слов. Code-review нетривиального батча обязан включать `reviewer-codex` как second opinion. Opus 4.7 — уровень оркестратора, субагентам не отдаём (агент-файлы уже на нужных моделях).

---

## 10. Pointers

- [`docs/ADMIN_FRONTEND_HANDOFF.md`](docs/ADMIN_FRONTEND_HANDOFF.md) — контракты + BP + backend-статус
- [`docs/ADMIN_DESIGN_SPEC.md`](docs/ADMIN_DESIGN_SPEC.md) — UI-спека per-page
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — батчи + acceptance + TODO backlog
- [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md) — blocker'ы (что НЕ делать)
- [`docs/BACKEND_NEEDINGS_HANDOFF.md`](docs/BACKEND_NEEDINGS_HANDOFF.md) — каталог backend-нехваток для полноты данных (N1–N4)
- [`docs/design/handoff/shyraq-admin/`](docs/design/handoff/shyraq-admin/) — **готовый дизайн 28 desktop-экранов (строим 1:1 по нему)**
- [`docs/design/handoff-with-mobile/shyraq-admin/`](docs/design/handoff-with-mobile/shyraq-admin/) — **готовый дизайн 33 mobile-экранов (строим 1:1 по нему)**
- `../frontend_superadmin/` — соседний сервис на похожем стеке; пример при открытых архитектурных вопросах, не эталон
- `../backend_shyraq_v2/` — backend repo (read-only, только при критике)
