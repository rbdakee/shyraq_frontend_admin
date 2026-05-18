# Shyraq Admin Web — Implementation Plan

Безопасный поэтапный план разработки фронтенда админки. **16 батчей (B0–B15)**, каждый ≈ одна Claude Code сессия, заканчивается рабочим коммитом с зелёным acceptance. Стек и конвенции — наше решение (§Foundations). Готовый дизайн `docs/design/handoff/shyraq-admin/*` — строим 1:1 по нему. `../frontend_superadmin/` — соседний сервис на похожем стеке: только пример при открытом архитектурном вопросе, не эталон.

**Source of truth контрактов** — [`ADMIN_FRONTEND_HANDOFF.md`](ADMIN_FRONTEND_HANDOFF.md) (далее **HANDOFF §X**). UI-спека — [`ADMIN_DESIGN_SPEC.md`](ADMIN_DESIGN_SPEC.md) (далее **DESIGN §X**). Визуал — `docs/design/handoff/shyraq-admin/project/` (далее **VIS**). Этот план **не дублирует** контракты — ссылается на § handoff/design. Backend live: `http://13.60.189.214:3000`.

---

## 0. Working agreement

1. **Один батч за сессию.** Не браться за следующий, пока acceptance текущего не зелёный.
2. **Safe & stable:** перед риском (миграция пакета, переписывание core) — zero-risk POC отдельным файлом, потом интеграция.
3. **Commit per batch:** в конце батча один commit по шаблону. Не амендить, не rebase'ить. Коммит — только по явной просьбе пользователя.
4. **Doc-first:** меняешь scope/контракт/UI — сначала правишь HANDOFF/DESIGN/OPEN_QUESTIONS, потом код, в одном изменении.
5. **Backend расхождение = blocker:** не «кодить наобум» — запись в [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md), обсудить.
6. **No skip:** acceptance обязателен, `[x]` только реально проверенное.
7. **TODO discipline:** каждый `// TODO(B<N>)` — parallel-запись в §«TODO backlog» этого файла.
8. **Gate каждого батча:** `pnpm typecheck` + `pnpm lint --max-warnings=0` + `pnpm test` — exit 0. Браузер-QA — пользователь (Playwright не заводим).

### Commit template

```
B<N>: <short title>

<2–4 lines high level>

Acceptance:
- [x] criterion 1
- [x] criterion 2

Refs: docs/IMPLEMENTATION_PLAN.md §B<N>
```

---

## Backend reality check

| Что                        | Значение                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| Backend base               | `http://13.60.189.214:3000`                                                                           |
| API prefix (все endpoints) | `/api/v1/`                                                                                            |
| Swagger UI / JSON          | `…/docs` · `…/docs-json` (на корне, **не** под `/api/v1`)                                             |
| Vite dev proxy             | `server.proxy['/api'] → http://13.60.189.214:3000`, `changeOrigin:true`                               |
| `.env.local`               | `VITE_API_BASE_URL=/api/v1` · `VITE_APP_VERSION=0.1.0`                                                |
| Auth                       | phone+OTP; access JWT 15m (in-memory); refresh hex64 30d (localStorage); silent single-flight refresh |
| Backend Phase              | A закрыта (всё на Mock-адаптерах). Контракты Phase B/C **не изменятся**. См. HANDOFF §29              |

**Контракты сверяются с live Swagger перед батчем.** Эндпоинты по разделам — HANDOFF §3,§5–§27. Если backend изменился — `pnpm gen:api` + ре-аудит затронутого батча.

**Известные backend-нюансы (держать в голове):** 422-vs-400 (nest-конверт `message[]` без стабильного `error`-кода, HANDOFF §2.3); JSONB i18n ключ `kz` vs DTO-locale `kk` (§2.4); cursor vs offset per-endpoint (§2.5); Fiscal B13 stub-ширина DTO vs B15 full (§17,§29); `/admin/*` RBAC-нюанс для DLQ (§24); Face/тест-камер/Fiscal-full — Phase B/C, строим как заглушки.

---

## Foundations (архитектурные решения)

### Стек (наше решение; в `../frontend_superadmin/` похожий — заглянуть как пример при открытом вопросе)

Vite + React 19 + TypeScript strict · React Router 7 (data router) · TanStack Query 5 (server-state) · `ky` + `openapi-fetch` + `openapi-typescript` · React Hook Form + Zod · shadcn/ui (Radix + Tailwind v4) · Lucide · TanStack Table v8 · Zustand (UI-state) · i18next + react-i18next (RU/KK) · `date-fns` + tz · `sonner` · Vitest + Testing Library (e2e/Playwright — НЕ заводим) · ESLint flat + Prettier + Husky + lint-staged · pnpm · Node 20.

**Не берём** (как в superadmin §2.1): Next.js, Redux/RTK, MUI/Mantine/AntD, Storybook (MVP), GraphQL-клиенты. `socket.io-client` — **берём** (Admin использует WS для тостов/инвалидации, в отличие от superadmin).

### Folder structure (`src/`)

```
src/
  main.tsx              entry: createRoot, провайдеры, router
  App.tsx               root layout (shell + outlet)
  env.ts                Zod-валидация import.meta.env
  router.tsx            дерево роутов (sitemap HANDOFF §28)
  api/                  HTTP-слой (ky + openapi-types, чистые async)
    client.ts           ky instance + silent single-flight refresh interceptor
    auth.ts children.ts enrollments.ts groups.ts staff.ts
    locations.ts cameras.ts schedule.ts meal-plans.ts content.ts
    invoices.ts payments.ts tariffs.ts holidays.ts refunds.ts
    custom-discounts.ts parent-requests.ts attendance.ts
    diagnostic-templates.ts face.ts qr.ts lifecycle-jobs.ts
    kindergarten.ts dashboard.ts users.ts notifications.ts
    errors.ts           AppError + envelope/422 parsing
    types/openapi.d.ts  generated (committed)
  hooks/                TanStack Query hooks per-domain (use-<entity>.ts) + query-keys.ts
  routes/               страницы (см. sitemap §28); _root, _403, _404, _500
  components/
    ui/                 shadcn primitives + icon.ts (handoff→Lucide map)
    layout/             Sidebar, Topbar, AuthGuard, Breadcrumbs
    data-table/         generic DataTable (offset+cursor) + sub-components
    forms/              PhoneInput, PairedI18nField, EntityCombobox, PeriodPicker, OtpInput, FileUpload
    feedback/           EmptyState, ErrorState, Skeletons, StateMachineButtons, DestructiveConfirm, JsonViewer
  lib/                  cn, format, error-map, jsonb-i18n, token-storage, time, routes, constants, i18n
  locales/{ru,kk}/      common,auth,errors,children,billing,… JSON namespaces
  stores/               ui-store (sidebar/theme/radius), session-store
  styles/               globals.css (токены+темы), fonts.css
```

### Layer/coding/naming/testing rules

См. **CLAUDE.md §4–§7**. Lint: `eslint-plugin-import` `no-restricted-paths` для layer-границ (настраивается в B0).

### Routing

Маршруты — канонично по **HANDOFF §28 sitemap** (`/`, `/login`, `/enrollments`, `/children`, `/groups`, `/staff`, `/structure/{locations,cameras}`, `/schedule/{templates,weeks}`, `/meal-plans`, `/content`, `/content/qundylyq`, `/billing/{invoices,payments,tariff-plans,tariff-assignments,holidays,refunds,discounts,fiscal-receipts}`, `/parent-requests`, `/attendance`, `/attendance/daily-status`, `/diagnostics/templates`, `/face`, `/operations/lifecycle-dlq`, `/settings`, `/profile`). VIS-роутер — только визуальный референс; при расхождении путей — §28 первичен.

### Design fidelity (закон, решение владельца)

Каждый экран строится **1:1** по готовому дизайну `docs/design/handoff/shyraq-admin/project/` (`screens-{core,billing,ops}.jsx`, `shell.jsx`, `ds.jsx`, `styles.css`, `tweaks-panel.jsx`). Перед UI-слайсом субагент **обязан** открыть соответствующий `Screen*`/`shell`/`ds` и воспроизвести layout/spacing/типографику/цвета(токены)/компоненты/состояния/поведение точно. Не упрощать, не «по мотивам». Технология своя (shadcn/Radix), результат визуально идентичен. Расхождение допускается только под backend-контракт → запись в `OPEN_QUESTIONS.md`. См. CLAUDE.md §6.

### Субагентная политика (решение владельца)

Дефолт исполнителя — **`coder-opus`** (качество > экономии). `coder-sonnet` — только бесспорная механика. Батч из преимущественно мелких слайсов **не дробить на sonnet-сессии — объединять с соседним батчем в одну Opus-оркестрацию** (волна = одна толковая Opus-сессия). Reviewer: `reviewer-opus` + обязательный `reviewer-codex` на нетривиале. См. CLAUDE.md §9.

### Theming (решение владельца)

Все темы из `app.jsx#THEMES` (green/orange/blue/mono/warmCream/forestMint/oceanBlue/dark) + радиусы (sharp/soft/round) — **сохраняем полностью**. User-facing: отдельная вкладка **«Дизайн»** в `/settings`. Выбор персистится в `ui-store` (localStorage), применяется на `:root` при загрузке (set CSS-vars). Темы — бандлы CSS-var override (`lib/themes.ts`), цвета не хардкодим. Базовая `:root` палитра — из `styles.css` (teal default).

### Token storage (решение владельца)

`lib/token-storage.ts`: access — module-scoped переменная (in-memory); refresh — `localStorage['shyraq_admin_refresh']`. Silent refresh: single-flight mutex в `api/client.ts`, на `401 invalid_token|token_revoked` один `/auth/refresh`, конкурентные запросы ждут; провал → очистка + redirect `/login`.

---

## B0 — Pre-flight & scaffold (one-time)

**Goal:** пустой проект собирается, тулинг = superadmin, типы сгенерированы.

**Inputs:** `../frontend_superadmin/` (package.json, eslint.config.js, .prettierrc, tsconfig\*, vite.config.ts, vitest.config.ts, components.json, .husky, .nvmrc, .gitignore как референс).

**Tasks:**

- `pnpm create vite . --template react-ts`; перенести версии deps из superadmin package.json (см. Foundations); добавить `socket.io-client`.
- Скопировать/адаптировать: eslint flat config (+ `no-restricted-paths` layer rules), prettier, tsconfig strict, vite.config (proxy `/api`→backend, `@`-alias, `__APP_VERSION__`), vitest.config, components.json (shadcn), `.husky` + lint-staged, `.nvmrc` (20), `.gitignore`, `.env.example`, `.env.local`.
- `scripts`: dev/build/preview/typecheck/lint/format/test/`gen:api`/prepare.
- `pnpm gen:api` → `src/api/types/openapi.d.ts` (коммитим).
- Создать пустой folder skeleton (Foundations) + `.gitkeep`.
- `env.ts` (Zod-валидация `VITE_API_BASE_URL`, падать с понятной ошибкой).
- `git init` (репо ещё не git) + initial commit `B0: scaffold`.

**Acceptance:**

- [ ] `pnpm dev` поднимает пустой root без ошибок консоли.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` (passWithNoTests) — exit 0.
- [ ] `src/api/types/openapi.d.ts` сгенерён из live `/docs-json`, закоммичен.
- [ ] `env.ts` падает с читаемой ошибкой при отсутствии `VITE_API_BASE_URL`.

---

## B1 — Foundation (infra ядро)

**Goal:** HTTP/auth/i18n/токены/темы/форматтеры — всё, на чём стоят экраны.

**Inputs:** HANDOFF §2 (тех. соглашения), §3 (auth-response shape), §2.4 (i18n), §2.6 (файлы); `styles.css` (`:root` токены), `app.jsx#THEMES`, `ds.jsx` (icon set, helpers).

**Tasks:**

- `api/client.ts` — ky instance, `x-custom-lang`, Bearer-инъекция, **silent single-flight refresh** (§3); `api/errors.ts` — `AppError` + парсинг envelope `{error,message,details}` и nest-422 `{statusCode,message[],error}`.
- `lib/token-storage.ts` (in-memory access + localStorage refresh) + unit-тесты.
- `lib/format.ts` — KZT `120 000 ₸`, даты `дд.мм.гггг чч:мм` в tz садика, phone `+7 700 123 45 67` E.164 + unit-тесты.
- `lib/jsonb-i18n.ts` — резолв `{ru,kz}` по locale (ключ `kz`!), fallback `ru` + unit-тесты.
- `lib/error-map.ts` — backend error-код → i18n key (реестр кодов HANDOFF §5–§24) + unit-тесты.
- `lib/i18n.ts` + `locales/{ru,kk}/{common,errors}.json` (скелет), namespace-структура.
- `styles/globals.css` — токены из `styles.css` как CSS-vars; Tailwind theme extend читает `var(--…)`; `fonts.css` (Manrope + JetBrains Mono).
- `lib/themes.ts` + `stores/ui-store.ts` — бандлы тем + радиусы, персист localStorage, apply на `:root` при boot.
- `components/ui/icon.ts` — mapping handoff `Icon.*` → Lucide.
- shadcn base install: button input textarea select dialog dropdown-menu badge skeleton alert toast(sonner) tabs popover checkbox switch radio-group.

**Acceptance:**

- [ ] `pnpm test` — token-storage/format/jsonb-i18n/error-map suites green.
- [ ] Переключение темы в рантайме (временная dev-кнопка/стор) меняет CSS-vars на `:root`, переживает reload.
- [ ] `client.ts`: при 401 `invalid_token` делает ровно один `/auth/refresh`, конкурентные запросы ждут (unit на mutex).
- [ ] typecheck/lint/test exit 0.

---

## B2 — Auth + App Shell

**Goal:** вход по OTP + каркас приложения.

**Inputs:** HANDOFF §3 (auth flow, auth-response, pending_role_select, OTP-ошибки), §27 (профиль/уведомления); DESIGN §3 (App Shell), §6.0 (Login), §6.17 (меню пользователя), §4.5 (состояния), §5 (sidebar nav); VIS `shell.jsx`, `screens-core.jsx` (LoginScreen).

**Tasks:**

- `api/auth.ts` + `hooks/use-auth.ts`: otp/request, otp/verify (+`X-Device-Id`), role/select, refresh, logout, `GET /users/me`.
- `routes/login.tsx` — wizard: телефон (E.164 маска) → OTP (6-cell input, resend-таймер, «изменить номер») → выбор садика (если `pending_role_select`). Экраны ошибок: invalid_otp, otp_expired, 429 otp_rate_limit/locked (таймер), `no_active_roles`/нет admin-роли → дружелюбный «не админ». Переключатель языка на login.
- `components/forms/otp-input.tsx`, `phone-input.tsx`.
- `components/layout/`: `AuthGuard` (in-memory access → иначе попытка refresh → login), `Topbar` (лого + имя садика + 🔔-stub + RU/KK + user-menu: Профиль/Мой QR/Сменить садик/Выход), `Sidebar` (grouped nav DESIGN §5, collapse, active highlight), `Breadcrumbs`.
- `routes/_403.tsx _404.tsx _500.tsx`; offline/session-expired баннеры; sonner toaster mount.
- `stores/session-store.ts` (current kg, roles, locale).
- i18n namespaces `auth`, `common` (RU + KK хотя бы placeholder).

**Acceptance:**

- [ ] OTP-флоу: request→verify→(role/select при multi-kg)→кабинет. Whitelist-телефон/код из логов backend.
- [ ] Reload сохраняет сессию (silent refresh из localStorage).
- [ ] Logout чистит токены → `/login`. Смена RU/KK ставит `x-custom-lang` в запросах.
- [ ] Нет admin-роли → экран «нет доступа», не в кабинет.
- [ ] Sidebar/Topbar/breadcrumbs/403/404 — по DESIGN §3,§4.5. Gate exit 0.

---

## B3 — DataTable + shared patterns + Dashboard

**Goal:** переиспользуемая инфраструктура списков/форм/подтверждений + первая страница (Дашборд, P0).

**Inputs:** HANDOFF §2.5 (пагинация), §26 (dashboard endpoints); DESIGN §4.4 (компоненты), §4.5 (состояния), §6.1 (Дашборд), §7 (сквозные паттерны); VIS `ds.jsx`, `screens-core.jsx` (Dashboard).

**Tasks:**

- `components/data-table/` — generic `<DataTable<T>>` (TanStack Table): колонки/сортировка/фильтр-панель/поиск, **offset И cursor** режимы пагинации, row-actions, bulk-select (опц.), states loading/empty/error/filtered-empty, sticky header.
- `components/feedback/destructive-confirm.tsx` — confirm-модал с опц. обязательным полем причины + счётчик (1..500); `state-machine-buttons.tsx` (disabled+tooltip для недопустимых переходов); `json-viewer.tsx` (свёрнутый); `empty-state.tsx`/`error-state.tsx`/skeletons.
- `components/forms/`: `entity-combobox.tsx` (поиск ребёнка/группы/сотрудника, debounce), `paired-i18n-field.tsx` (RU/KK), `period-picker.tsx` (пресеты), `file-upload.tsx` (presigned 3-step + multipart, dnd+progress), form-error helper (422→`setError`).
- `api/dashboard.ts` + `hooks/use-dashboard.ts`; `routes/dashboard.tsx` — KPI-карточки, donut посещаемости (recharts), финансы, payments-overview (period). Независимые скелетоны per-widget; 0 — валидное состояние.
- Component-тесты: DataTable (оба пагинаторы), DestructiveConfirm, state-machine-buttons.

**Acceptance:**

- [ ] DataTable работает в offset (`1–20 из N`) и cursor (`Загрузить ещё`) режимах; states покрыты.
- [ ] Дашборд рендерит реальные данные `/admin/dashboard/*`, виджеты грузятся независимо, KZT/tz форматы.
- [ ] DestructiveConfirm с обязательной причиной переиспользуем; component-тесты green. Gate exit 0.

---

## B4 — Дети (Children) · P0

**Goal:** карточка ребёнка — ядро домена.

**Inputs:** HANDOFF §5 (endpoints, transfer/archive/reactivate/status-history/guardians, ошибки); DESIGN §6.3 (список/создание/карточка 8 табов, модалы); VIS `screens-core.jsx` (ChildrenList/ChildCreate/ChildDetail).

**Tasks:**

- `api/children.ts` + `hooks/use-children.ts` (list+фильтры status/group/поиск, get, create, patch, transfer-group, archive, reactivate, status-history offset, guardians CRUD+revoke, group-history, timeline).
- `routes/children/index.tsx` (DataTable, фильтры, архивные приглушены), `children/new.tsx` (форма + presigned `child_photo`), `children/$id.tsx` (шапка + 8 табов: Профиль/Опекуны/Группа+история/Timeline/Платежи preview/Диагностика preview/Статус-история/Face ID).
- Модалы: Архивировать (обяз. причина 1..500, DestructiveConfirm), Реактивировать (→ баннер «назначьте тариф» → `/billing/tariff-assignments`), Перевести в группу (combobox+причина; 409 archived → «сначала реактивируйте»). Опекуны: добавить/изменить роль·can_pickup/отозвать + «Отозвать все QR» (§23 endpoint).
- i18n `children`, error-коды (`child_not_found`, `archived_child_not_transferable`, `child_already_archived`, `child_not_archived`, …).

**Acceptance:**

- [ ] Список фильтруется/ищется; архивные визуально отделены.
- [ ] Создание карточки + presigned-загрузка фото работает end-to-end.
- [ ] transfer/archive(причина)/reactivate отрабатывают, ошибки 404/409/422 → человекочитаемо; reactivate ведёт к назначению тарифа.
- [ ] Все 8 табов рендерят данные/preview; status-history пагинируется. Gate exit 0.

---

## B5 — Зачисление / Лиды · P0

**Goal:** воронка лид → карточка ребёнка.

**Inputs:** HANDOFF §6 (state machine `new→in_processing→{waitlist|card_created|cancelled}→archive`, endpoints, card_created создаёт child+guardian+invoice); DESIGN §6.2 (kanban + карточка лида); VIS `screens-core.jsx` (EnrollmentsKanban/EnrollmentDetail).

**Tasks:**

- `api/enrollments.ts` + `hooks/use-enrollments.ts` (list+filter+search, get+status_log, create, patch, transition, assign).
- `routes/enrollments/index.tsx` — kanban по статусам (+ табличный fallback, поиск телефон/ФИО, «Создать лид»).
- `routes/enrollments/$id.tsx` — двухколоночная: данные контакта/ребёнка (форма) + лог статусов (timeline from→to/кто/коммент/когда); StateMachineButtons (недопустимые переходы disabled+tooltip); назначение ответственного; `card_created` → confirm «создан ребёнок+guardian+первый счёт» → success-баннер со ссылкой на карточку ребёнка.
- i18n `enrollments`; «Лист ожидания» как отдельная колонка/тег.

**Acceptance:**

- [ ] Kanban отражает статусы; переходы строго по state machine; недопустимые задизейблены.
- [ ] `card_created` создаёт ребёнка/опекуна/счёт; ссылка ведёт в `/children/:id`.
- [ ] Создание/редактирование лида, назначение ответственного работают; пустая воронка → empty CTA. Gate exit 0.

---

## B6 — Группы + Сотрудники · P0

**Goal:** структура персонала (mentor↔group инвариант связывает их).

**Inputs:** HANDOFF §7 (groups, инварианты mentor↔group, deactivate 409 has_active_children), §8 (staff, роли, динамика specialist_type, assign/primary/deactivate, phone_conflict), §23 (qr/revoke-all); DESIGN §6.4 (Группы 4 таба), §6.5 (Сотрудники); VIS `screens-core.jsx` (GroupsList/GroupDetail/StaffList/StaffDetail).

**Tasks:**

- `api/groups.ts`,`api/staff.ts`,`api/qr.ts` + hooks.
- `routes/groups/index.tsx` (заполненность vs capacity, primary-mentor), `groups/$id.tsx` (табы Обзор/Менторы/Дети/История менторов; deactivate с обработкой 409 «переведите детей»).
- `routes/staff/index.tsx` (фильтры роль/активность/тип), `staff/new` форма с **динамическими полями** (mentor→группа опц., specialist→specialist_type whitelist, admin/reception→без), `staff/$id.tsx` (edit role×type валидация, mentor-назначения assign/primary/снять, активировать/деактивировать, «Отозвать все QR»).
- Инвариант-подсказки в UI (один mentor=1 активная группа; 1 primary). i18n `groups`,`staff`.

**Acceptance:**

- [ ] Группа: capacity-индикатор, deactivate блокируется при активных детях (409 → подсказка).
- [ ] Сотрудник: динамическая форма по роли; `staff_phone_conflict` → понятная ошибка; mentor assign/primary/снять.
- [ ] «Отозвать все QR» с confirm (последствия) для staff и guardian. Gate exit 0.

---

## B7 — Биллинг: Счета · P0

**Goal:** счета и ручные операции (Оплаты-страница — P1, в B9; здесь только embedded preview из `GET /invoices/:id`).

**Inputs:** HANDOFF §13 (invoices endpoints, state machine, manual-mark-paid, cancel, ошибки); DESIGN §6.10.1 (Счета список+карточка), §4.6 (бейджи); VIS `screens-billing.jsx` (InvoicesList/InvoiceDetail).

**Tasks:**

- `api/invoices.ts` + `hooks/use-invoices.ts` (list+filter status/type/child/due_date, get +line_items+payments+refunds+fiscal+discounts, create разовое начисление, manual-mark-paid, cancel).
- `routes/billing/invoices/index.tsx` (DataTable, статус-бейджи §4.6, «Создать начисление» с опц. line items), `invoices/$id.tsx` (шапка сумма/статус; секции позиции/оплаты/возвраты/чеки/скидки read-only; действия «Отметить наличными» confirm + 409 already_paid; «Отменить» destructive + 409 status_invalid).
- KZT-форматтер, i18n `billing`.

**Acceptance:**

- [ ] Список фильтруется, бейджи по семантике §4.6.
- [ ] Создание разового начисления (с line items) работает; карточка показывает все связанные секции.
- [ ] manual-mark-paid и cancel отрабатывают, 409 → человекочитаемо. Gate exit 0.

---

## B8 — Заявки родителей · P0

**Goal:** обработка заявок + двусторонний тред (cursor-пагинация).

**Inputs:** HANDOFF §19 (типы, state machine `pending→accepted|rejected|cancelled`, cursor `(created_at,id) DESC`, accept/reject/messages, late_pickup→invoice); DESIGN §6.11; VIS `screens-billing.jsx`/`screens-ops.jsx` (RequestsList/RequestDetail).

**Tasks:**

- `api/parent-requests.ts` + hooks (list cursor + filter status/type/child/group/recipient, get +messages, accept, reject, post message, list messages cursor).
- `routes/parent-requests/index.tsx` (DataTable cursor, тип-бейджи, фильтры), `parent-requests/$id.tsx` (данные по `request_type` — разные `details` JSONB; двусторонний тред пузырями + вложения + поле ответа; шапка Принять/Отклонить с review_note, только в pending; late_pickup — пояснение про счёт).
- Обработка `parent_request_already_processed`(409) → refresh+сообщение; `parent_request_cursor_invalid`(400). i18n `parent-requests`.

**Acceptance:**

- [ ] Список cursor-пагинируется, фильтры работают, невалидный cursor → 400 обработан.
- [ ] Детали рендерят тип-специфичные поля; тред с вложениями; ответ постится.
- [ ] accept/reject (race-409 → конфликт-сообщение); late_pickup-пояснение. Gate exit 0.

---

## B9 — Биллинг P1-a: Оплаты + Тарифные планы + Назначения · P1

**Inputs:** HANDOFF §13 (payments), §14 (tariff-plans/assignments, discount_rules, overlap-ошибки); DESIGN §6.10.2–§6.10.4; VIS `screens-billing.jsx`.

**Tasks:**

- `api/payments.ts`,`api/tariffs.ts` + hooks.
- `routes/billing/payments/index.tsx` + `$id.tsx` (provider_payload через JsonViewer, read-only).
- `routes/billing/tariff-plans` (список + форма: applies_to динамика, **конструктор `discount_rules`** sibling/prepay 3·6·12·24/benefit, deactivate; overlap 409).
- `routes/billing/tariff-assignments` (форма: child combobox, активные планы, `custom_amount`/`custom_reason`, период; overlap; связь с reactivate-флоу B4).

**Acceptance:**

- [ ] Payments список/деталь + provider_payload viewer.
- [ ] Tariff-plan форма с discount_rules-конструктором; overlap-ошибки человекочитаемы.
- [ ] Tariff-assignment с custom_amount; inted из reactivate-баннера. Gate exit 0.

---

## B10 — Биллинг P1-b: Возвраты + Скидки · P1

**Inputs:** HANDOFF §16 (refunds state machine approve/reject/process, pro-rata archive context), §18 (custom-discounts state machine, conditions JSONB типы, applications); DESIGN §6.10.6–§6.10.7; VIS `screens-billing.jsx` (RefundsList/DiscountsList/DiscountWizard).

**Tasks:**

- `api/refunds.ts`,`api/custom-discounts.ts` + hooks.
- `routes/billing/refunds` (список+бейджи, create payment≤amount, StateMachineButtons approve/reject(причина 1..500)/process; контекст pro_rata_archive «требует решения»).
- `routes/billing/discounts` (список) + `discounts/new|$id` **wizard/секции**: основное (RU/KK), визуальный конструктор условий (prepayment_months/siblings/age_range/benefit/payment_method/early_payment/birthday_month/date_range/first_invoice + all_of/any_of вложенность), таргетинг мультиселект, период, лимиты, priority+stackable, push RU/KK; state machine activate/pause/resume/cancel(необратимо confirm); статистика applications (превью «N детей» на клиенте).

**Acceptance:**

- [ ] Refund state machine кнопки по статусу; pro-rata archive виден как pending.
- [ ] Discount wizard: конструктор условий И/ИЛИ, таргетинг, state machine; applications-таблица. Gate exit 0.

---

## B11 — Расписание + Меню · P1

**Inputs:** HANDOFF §10 (schedule templates/slots/week-snapshots/activity-events, slot_time_conflict), §11 (meal-plans/items, copy-week, already_exists); DESIGN §6.7–§6.8; VIS `screens-ops.jsx` (Schedule/Meals).

**Tasks:**

- `api/schedule.ts`,`api/meal-plans.ts` + hooks.
- `routes/schedule/templates` (список + create) + `templates/$id` (недельная сетка Пн–Вс, слоты CRUD, конфликт времени inline 409), `schedule/weeks` (week-snapshots, copy идемпотентно, activity-events read-only календарь/список, статусы scheduled/in_progress/completed/cancelled).
- `routes/meal-plans` (весь садик/группа, неделя/месяц, редактор дня 5 приёмов, блюдо PairedI18nField + аллергены/калории/фото, copy-week, флаг publish, источник manual/auto).

**Acceptance:**

- [ ] Редактор слотов; дубль (template,day,start_time) → inline 409.
- [ ] Меню день-редактор RU/KK; copy-week идемпотентен (повтор → сообщение). Gate exit 0.

---

## B12 — Контент + Qundylyq · P1

**Inputs:** HANDOFF §12 (content multipart, ENUM, инвариант таргета, state machine draft→scheduled→published, cursor); DESIGN §6.9; VIS `screens-ops.jsx` (ContentFeed).

**Tasks:**

- `api/content.ts` + hooks (list cursor+filters, get, create/patch **multipart**, delete draft-only, publish, schedule, qundylyq/current).
- `routes/content/index.tsx` (DataTable cursor, тип/статус/таргет бейджи, фильтры), редактор поста (тип, таргет all/group/child динамика + EntityCombobox, title/body RU/KK, медиа upload image/video, Сохранить draft/Запланировать/Опубликовать; delete только draft; published read-only).
- `routes/content/qundylyq.tsx` (тема месяца). i18n `content`. Ошибки `media_type_invalid`/`content_target_invalid`(422)/`content_post_status_invalid`(409).

**Acceptance:**

- [ ] Лента cursor-пагинируется; редактор multipart-загружает медиа; state machine соблюдён (published read-only, delete draft-only).
- [ ] Инвариант таргета валидируется; Qundylyq current. Gate exit 0.

---

## B13 — Посещаемость + Диагностика-шаблоны · P1

**Inputs:** HANDOFF §20 (attendance-events patch, daily-status, summary), §21 (diagnostic-templates schema JSONB, template_has_entries lock, version bump); DESIGN §6.12–§6.13; VIS `screens-ops.jsx` (AttendanceJournal/Diagnostics).

**Tasks:**

- `api/attendance.ts`,`api/diagnostic-templates.ts` + hooks.
- `routes/attendance/index.tsx` (журнал check-in/out, фильтры child/method/диапазон, корректировка модал time/notes/pickup_user_id), `attendance/daily-status.tsx` (доска по дате+группе, бейджи intraday, сводка отсутствий).
- `routes/diagnostics/templates.tsx` — список по specialist_type + **конструктор формы** (секции→поля типов text/number/boolean/select/multiselect/date/scale, required/options/min/max, авто-version); баннер-блокер при `template_has_entries`(409) «структуру менять нельзя»; deactivate.

**Acceptance:**

- [ ] Журнал фильтруется, корректировка сохраняется; daily-status доска + сводка.
- [ ] Конструктор шаблона строит schema; при заполненных записях schema-редактирование заблокировано (409 баннер). Gate exit 0.

---

## B14 — Структура + Профиль/Уведомления/WS + системные состояния · P1

**Inputs:** HANDOFF §9 (locations/cameras, location_in_use, camera test Phase C), §27 (profile, qr, notifications, prefs), §2.7 (WS); DESIGN §6.6,§6.17,§4.5; VIS `screens-ops.jsx` (Structure/Profile), `shell.jsx` (NotificationsPanel).

**Tasks:**

- `api/locations.ts`,`api/cameras.ts`,`api/users.ts`,`api/notifications.ts` + hooks.
- `routes/structure/{locations,cameras}.tsx` (CRUD, location_in_use 409 блокер; камеры сгруппированы по локациям; «Тест камеры» disabled+tooltip «Phase C»).
- `routes/profile.tsx` (ФИО/avatar/locale/iin/dob, **Мой QR** рендер из токена `/users/me/qr`, notification preferences тумблеры push/in-app).
- WS-клиент (`socket.io-client`, JWT в handshake.auth.token; `auth_error`→refresh/logout; `user:{id}` события → тосты + query invalidation); колокол в Topbar (B2 stub → полноценный: счётчик, список, read-all, реал-тайм).
- Финализировать системные состояния (offline/session-expired/403/404/500) per DESIGN §4.5.

**Acceptance:**

- [ ] Locations/Cameras CRUD; location_in_use 409 блокирует удаление; тест-камеры заглушка.
- [ ] Профиль + Мой QR + notification prefs; колокол показывает историю/непрочитанные.
- [ ] WS: событие в `user:{id}` → тост + инвалидация; `auth_error` → refresh/logout. Gate exit 0.

---

## B15 — P2: Праздники + Фискальные(stub) + DLQ + Настройки(+Дизайн) + Face(Phase C) · P2

**Inputs:** HANDOFF §15 (holidays), §17 (fiscal-receipts read-only stub + B15-заглушки), §24 (lifecycle DLQ cursor, RBAC-нюанс), §25 (kindergarten settings), §22 (Face Phase C); DESIGN §6.10.5,§6.10.8,§6.15,§6.16,§6.14; VIS `screens-billing.jsx`/`screens-ops.jsx` (HolidaysList/FiscalList/DLQ/Settings/FaceId).

**Tasks:**

- `api/holidays.ts`,`api/lifecycle-jobs.ts`,`api/kindergarten.ts`,`api/face.ts` + hooks.
- `routes/billing/holidays.tsx` (календарь/список год/месяц, RU/KK name, is_billable, CRUD, unique-конфликт).
- `routes/billing/fiscal-receipts.tsx` — **read-only список** (фильтры), баннер «расширенные операции — Phase B», disabled-заглушки retry/queue/report.
- `routes/operations/lifecycle-dlq.tsx` (таблица cursor, payload JsonViewer, «Повторить» confirm→тост; RBAC-нюанс §24 — при 403 валидного админа эскалировать как backend-баг).
- `routes/settings.tsx` — форма садика (name/address/phone/settings; fiscal read-only «управляется платформой») + **вкладка «Дизайн»** (UI выбора темы/радиуса из `ui-store`, все варианты).
- `routes/face.tsx` — 3 таба (Согласия/Профили/Журнал) с баннером «Phase C — данные не обрабатываются»; consent→enroll порядок, enroll без активного consent заблокирован.

**Acceptance:**

- [ ] Holidays CRUD + конфликт; Fiscal read-only + Phase B заглушки видимы/disabled.
- [ ] DLQ cursor + retry; Settings сохраняет + вкладка «Дизайн» переключает тему (персист).
- [ ] Face — заглушка с правильным порядком consent→enroll и юр-предупреждением. Gate exit 0.

---

## Tracker

| Батч | Тема                                        | Приоритет | Статус |
| ---- | ------------------------------------------- | --------- | ------ |
| B0   | Scaffold & tooling                          | infra     | [x]    |
| B1   | Foundation (http/auth/i18n/темы/форматтеры) | infra     | [x]    |
| B2   | Auth + App Shell                            | infra/P0  | [ ]    |
| B3   | DataTable + patterns + Дашборд              | infra/P0  | [ ]    |
| B4   | Дети                                        | P0        | [ ]    |
| B5   | Лиды/Зачисление                             | P0        | [ ]    |
| B6   | Группы + Сотрудники                         | P0        | [ ]    |
| B7   | Биллинг: Счета                              | P0        | [ ]    |
| B8   | Заявки родителей                            | P0        | [ ]    |
| B9   | Оплаты + Тарифы + Назначения                | P1        | [ ]    |
| B10  | Возвраты + Скидки                           | P1        | [ ]    |
| B11  | Расписание + Меню                           | P1        | [ ]    |
| B12  | Контент + Qundylyq                          | P1        | [ ]    |
| B13  | Посещаемость + Диагностика                  | P1        | [ ]    |
| B14  | Структура + Профиль/Уведомления/WS          | P1        | [ ]    |
| B15  | Праздники/Фискальные/DLQ/Настройки/Face     | P2        | [ ]    |

---

## TODO backlog

Каждый `// TODO(B<N>): …` в коде — строка здесь (тот же текст + `file:line` + owner-батч). Пусто на старте.

| TODO | Файл:строка | Owner | Статус |
| ---- | ----------- | ----- | ------ |
| —    | —           | —     | —      |

---

## Risk register

| Риск                                           | Митигация                                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Backend контракт ≠ handoff                     | `pnpm gen:api` перед батчем + ре-аудит; расхождение → OPEN_QUESTIONS, не «наобум»             |
| 422-vs-400 (нет стабильного error-кода)        | `error-map.ts` парсит и envelope, и nest `message[]`; тест на оба                             |
| JSONB `kz` vs DTO `kk`                         | централизованный `jsonb-i18n.ts` + unit; запрет ручного резолва в routes                      |
| Phase B/C модули (Fiscal full/Face/тест-камер) | строим как видимые заглушки; DTO Fiscal — расширяемый тип                                     |
| Silent-refresh гонки                           | single-flight mutex в client.ts + unit на конкурентные 401                                    |
| localStorage refresh (Admin публичен)          | принято на MVP (HANDOFF §2.2); строгий CSP, error-map без утечки; cookie-flow — future задача |
| Скоуп B10/B12 (wizard/multipart) большой       | при перерасходе сессии — дробить слайсы, не растягивать батч                                  |

---

## Recovery plan (если батч пошёл не так)

1. Не комитить красное. `git stash` экспериментов.
2. Локализовать слайс-виновник (typecheck/lint/test вывод).
3. Если расхождение docs↔backend → `OPEN_QUESTIONS.md`, заморозить блокирующий кусок, продолжить остальное.
4. Если архитектурная ошибка инфры (B1–B3) → откат батча, пересмотр Foundations с пользователем перед повтором.
5. Не тащить незакрытый acceptance в следующий батч.
