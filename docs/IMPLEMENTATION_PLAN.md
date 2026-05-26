# Shyraq Admin Web — Implementation Plan

Безопасный поэтапный план разработки фронтенда админки. **23 батча (B0–B22)**: B0–B15 — desktop (16 батчей), B16–B22 — mobile-адаптация (7 батчей). Каждый ≈ одна Claude Code сессия, заканчивается рабочим коммитом с зелёным acceptance. Стек и конвенции — наше решение (§Foundations). Готовый дизайн: desktop `docs/design/handoff/shyraq-admin/*`, mobile `docs/design/handoff-with-mobile/shyraq-admin/*` — строим 1:1 по ним. `../frontend_superadmin/` — соседний сервис на похожем стеке: только пример при открытом архитектурном вопросе, не эталон.

**Source of truth контрактов** — [`ADMIN_FRONTEND_HANDOFF.md`](ADMIN_FRONTEND_HANDOFF.md) (далее **HANDOFF §X**). UI-спека — [`ADMIN_DESIGN_SPEC.md`](ADMIN_DESIGN_SPEC.md) (далее **DESIGN §X**). Визуал — `docs/design/handoff/shyraq-admin/project/` (далее **VIS**). Этот план **не дублирует** контракты — ссылается на § handoff/design. Backend live: `http://194.32.140.219:5678`.

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
| Backend base               | `http://194.32.140.219:5678`                                                                          |
| API prefix (все endpoints) | `/api/v1/`                                                                                            |
| Swagger UI / JSON          | `…/docs` · `…/docs-json` (на корне, **не** под `/api/v1`)                                             |
| Vite dev proxy             | `server.proxy['/api'] → http://194.32.140.219:5678`, `changeOrigin:true`                              |
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
- [x] Reload сохраняет сессию (silent refresh из localStorage). _(B3-фиксап 2026-05-18: на boot шелла `user` ← `GET /users/me`, `currentKindergarten` ← `GET /kindergartens/me` — топбар/дашборд имя+садик. `roles[]` после reload forward-looking — backend-need, см. OPEN_QUESTIONS §A9 / BACKEND_NEEDINGS N4.)_
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

**Inputs:** HANDOFF §5 (endpoints, transfer/archive/reactivate/status-history/guardians, ошибки); DESIGN §6.3 (список/создание/карточка 8 табов, модалы); VIS `screens-core.jsx` (ChildrenList/ChildCreate/ChildDetail). **Канонический контракт — OPEN_QUESTIONS §A8** (live-verified): пути `/children/*` (timeline = `/admin/children/{id}/timeline`), request-DTO **snake_case**, list `{data,meta}`, detail `{child,guardians[]}` + отдельные эндпоинты (group-history/status-history offset / timeline cursor), опекун = invite по phone/user_id, guardian.status `pending_approval|…`. error-map += `archive_reason_required`.

**Tasks:**

- `api/children.ts` + `hooks/use-children.ts` (list+фильтры status/group/поиск, get, create, patch, transfer-group, archive, reactivate, status-history offset, guardians CRUD+revoke, group-history, timeline).
- `routes/children/index.tsx` (DataTable, фильтры, архивные приглушены), `children/new.tsx` (форма + presigned `child_photo`), `children/$id.tsx` (шапка + 8 табов: Профиль/Опекуны/Группа+история/Timeline/Платежи preview/Диагностика preview/Статус-история/Face ID).
- Модалы: Архивировать (обяз. причина 1..500, DestructiveConfirm), Реактивировать (→ баннер «назначьте тариф» → `/billing/tariff-assignments`), Перевести в группу (combobox+причина; 409 archived → «сначала реактивируйте»). Опекуны: добавить/изменить роль·can_pickup/отозвать + «Отозвать все QR» (§23 endpoint).
- i18n `children`, error-коды (`child_not_found`, `archived_child_not_transferable`, `child_already_archived`, `child_not_archived`, …).

**Acceptance:**

- [ ] Список фильтруется/ищется; архивные визуально отделены.
- [ ] Создание карточки работает end-to-end. _(Загрузка фото — presigned backend не готов, parked OPEN_QUESTIONS §C5; карточка создаётся без фото, `photo_url?` опц. — НЕ входит в acceptance B4.)_
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

- [x] Payments список/деталь + provider*payload viewer. *(B9 wave 2026-05-21: live `PaymentResponseDto` БЕЗ поля `provider_payload` — JSON-viewer показывает полный snake*case DTO; OPEN_QUESTIONS §A16 live=факт.)*
- [x] Tariff-plan форма с discount*rules-конструктором; overlap-ошибки человекочитаемы. *(Структурированные 5 number-полей + benefit*category — НЕ wizard И/ИЛИ; wizard остаётся для B10 custom-discounts.)*
- [x] Tariff-assignment с custom*amount; inted из reactivate-баннера. Gate exit 0. *(Deep-link `?child=<uuid>` auto-open модала; fixup `routes/children/$id.tsx:156`.)\_

**Wave-fixup (variant C UX):** cross-links между `/billing/tariff-plans` и `/billing/tariff-assignments` (правый блок header, ссылка primary-цветом + `ArrowRightIcon`) — после ручного QA уточнено, что sidebar содержит один пункт «Тарифы» и переход между парными страницами нужно сделать явным. Sitemap §28 не нарушен (два маршрута сохранены).

**Related finding (manual QA):** OPEN_QUESTIONS §C16 + BACKEND_NEEDINGS N8 — `StaffMemberDto` возвращает null `full_name`/`phone` (нет JOIN на `users`), на странице `/staff` колонки ФИО/телефон деградируют `—`. Аналог §C4/§C15, не блокирует.

---

## B10 — Биллинг P1-b: Возвраты + Скидки · P1

**Inputs:** HANDOFF §16 (refunds state machine approve/reject/process, pro-rata archive context), §18 (custom-discounts state machine, conditions JSONB типы, applications); DESIGN §6.10.6–§6.10.7; VIS `screens-billing.jsx` (RefundsList/DiscountsList/DiscountWizard).

**Tasks:**

- `api/refunds.ts`,`api/custom-discounts.ts` + hooks.
- `routes/billing/refunds` (список+бейджи, create payment≤amount, StateMachineButtons approve/reject(причина 1..500)/process; контекст pro_rata_archive «требует решения»).
- `routes/billing/discounts` (список) + `discounts/new|$id` **wizard/секции**: основное (RU/KK), визуальный конструктор условий (prepayment_months/siblings/age_range/benefit/payment_method/early_payment/birthday_month/date_range/first_invoice + all_of/any_of вложенность), таргетинг мультиселект, период, лимиты, priority+stackable, push RU/KK; state machine activate/pause/resume/cancel(необратимо confirm); статистика applications (превью «N детей» на клиенте).

**Acceptance:**

- [x] Refund state machine кнопки по статусу; pro-rata archive виден как pending.
- [x] Discount wizard: конструктор условий И/ИЛИ, таргетинг, state machine; applications-таблица. Gate exit 0.

---

## B11 — Расписание + Меню · P1

**Inputs:** HANDOFF §10 (schedule templates/slots/week-snapshots/activity-events admin CRUD, slot_time_conflict), §11 (meal-plans/items, copy-week, already_exists, MultiLangText `kk`); DESIGN §6.7–§6.8; VIS `screens-ops.jsx` (Schedule/Meals); OPEN_QUESTIONS **§A18 (casing per-module: schedule camelCase, meal-plans snake_case; copy DTO `{fromMonday}`; source enum `manual|cron|copied`; notes i18n)**, **§A19 (MultiLangText ключ `kk`)**, **§B1 (per-group copy — backend ask, на B11 — глобальный CTA)**, **§B2 (activity-events admin CRUD UI — минимальный на primitives)**.

**Backend status (live-verified 2026-05-26):** все endpoints HANDOFF §10/§11 существуют. Расхождения handoff↔live зафиксированы в §A18 (правка handoff — pre-B11 docs fixup, коммит до B11). `POST /admin/schedule/week-rollout/run` существует, но в Admin UI **не выставляется** (SuperAdmin scope).

**Tasks:**

- `api/schedule.ts` (camelCase DTO!) + `api/meal-plans.ts` (snake_case DTO!) + `hooks/use-schedule.ts` + `hooks/use-meal-plans.ts` (query-keys, list/get/create/patch/delete + copy-week mutations).
- `routes/schedule/templates/index.tsx` — список шаблонов по группам, create-форма (`groupId?`, `name`, `validFrom`, `validUntil?`, `isActive`).
- `routes/schedule/templates/$id.tsx` — недельная сетка Пн–Вс × time, CRUD слотов (`dayOfWeek`, `startTime`, `endTime`, `activityName`, `locationId?`, `description?`), конфликт времени → inline 409 `slot_time_conflict`. **Заменяет существующий mobile-stub** (TODO-`wire useSchedule`).
- `routes/schedule/weeks.tsx` — список week-snapshots (фильтр `groupId`, `weekStartDateFrom/To`), глобальный CTA «Скопировать неделю садика» (POST `/week-snapshots/copy` с `{fromMonday}`) + summary toast `{copiedGroups, skippedGroups, totalEvents}`. Календарь/список activity-events по диапазону дат (`groupId`, `dateFrom/To`, `status`-фильтр).
- **Activity events admin CRUD** (per §B2): кнопка «Добавить событие» → модал RHF (`groupId`, `activityName`, `startsAt`, `endsAt?`, `locationId?`, `notes?`); row-actions Редактировать/Удалить (`DestructiveConfirm`). Минимальный UI на токенах/primitives, без новых лекал.
- `routes/meal-plans/index.tsx` — выбор группы/«весь садик», переключатель неделя/месяц, день-редактор: 5 `meal_type` (`breakfast/snack_am/lunch/snack_pm/dinner`), для каждого — список блюд с `dish_name` (PairedI18nField → `{ru, kk}` через `MultiLangTextDto`), `description?`, `allergens?[]`, `calories?`, `photo_url?`, `position`. Создание плана дня (`{date, group_id?}` → 409 `meal_plan_already_exists`). PATCH `is_published`/`notes` (notes — i18n PairedI18nField). Кнопка «Скопировать неделю» (`fromMonday`) → summary `{plans_created, plans_skipped}`. Бейдж `source` (`manual`/`cron`/`copied`). **Заменяет существующий mobile-stub** (TODO-`wire useMealPlans`).
- i18n `schedule` + `meal-plans` namespaces (RU + KK).
- Перед стартом — проверить `lib/jsonb-i18n.ts` юнит-тестами: резолв и `{ru, kk}` (MultiLangText), и `{ru, kz}` (legacy JSONB). Если не покрыт — добавить кейс.

**Что НЕ делаем в B11:**

- `POST /admin/schedule/week-rollout/run` — НЕ выставляем в UI (SuperAdmin scope).
- Per-group week copy — заблокировано §B1; ждём backend, на B11 только глобальный CTA.
- Дизайн-апдейт VIS для activity-events admin CRUD — это design-task post-MVP §B2.

**Acceptance:**

- [ ] Список шаблонов + create; редактор слотов (camelCase!) с conflict-инлайном 409 `slot_time_conflict`.
- [ ] Week-snapshots: глобальный copy CTA → toast c summary; activity-events календарь/список с фильтрами; admin может create/edit/delete события (минимальный CRUD).
- [ ] Меню день-редактор RU/KK (через `MultiLangTextDto`, ключ `kk`); copy-week идемпотентен (повтор → `plans_skipped > 0` → информативный toast); `is_published`/`notes` (i18n) save.
- [ ] Mobile-stubs `routes/schedule/templates/$id.tsx`, `routes/meal-plans/index.tsx` переподключены к реальным хукам; TODO-строки `wire useSchedule`/`wire useMealPlans` удалены из `IMPLEMENTATION_PLAN.md` backlog.
- [ ] `jsonb-i18n.ts` юнит-тесты покрывают обе формы (`kk` + `kz`).
- [ ] Gate exit 0: `pnpm typecheck && pnpm lint --max-warnings=0 && pnpm test`.

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

---

## Mobile batches (B16–B22)

Mobile-адаптация 33 экранов Admin Web. Все mobile-батчи зависят от завершения desktop-батчей B11–B15 (desktop screens должны существовать, чтобы mobile-адаптация строилась поверх них). Mobile-дизайн: `docs/design/handoff-with-mobile/shyraq-admin/project/` (`mobile-app.jsx`, `mobile-screens.jsx`, `mobile-screens-2.jsx`, `mobile.css`). UI-спека: DESIGN §10.

**Resolved:** OPEN_QUESTIONS M1–M10 закрыты 2026-05-24. Mobile-батчи B16–B22 могут стартовать.

---

## B16 — Mobile foundation (shell)

**Goal:** адаптивный shell — mobile top bar, bottom tab bar, FAB, breakpoint hook, safe-area utilities. App корректно переключается между desktop и mobile shell.

**Inputs:** DESIGN §10.2–§10.4 (breakpoint, mobile shell, tabs); `mobile.css` (`.m-shell`, `.m-bar`, `.m-tabbar`, `.m-fab`, `.m-scroll`, `.m-iconbtn`); `mobile-screens.jsx` MBar/MTabBar primitives; OPEN_QUESTIONS M1 (breakpoint), M2 (tablet), M5 (adaptive vs separate routes), M8 (detection hook).

**Dependencies:** B0–B2 (scaffold, auth, desktop shell), B15 (settings/themes). Decisions: OPEN_QUESTIONS M1, M2, M5, M8 resolved.

**Tasks:**

- `hooks/use-breakpoint.ts` — `useBreakpoint()` hook based on `window.matchMedia` (OPEN_QUESTIONS M8 resolution). Returns `{ isMobile: boolean, isDesktop: boolean }`. Unit tests.
- `components/layout/mobile-shell.tsx` — MobileShell layout: `.m-bar` top bar component (back/title/sub/action), `.m-scroll` content area, `.m-tabbar` bottom tab bar (5 tabs with badges), safe-area paddings.
- `components/layout/mobile-top-bar.tsx` — reusable top bar with `back`, `title`, `sub`, `action` props; `.flat` variant.
- `components/layout/mobile-tab-bar.tsx` — bottom tab bar with 5 tabs (Главная/Дети/Заявки/Счета/Ещё), active state, badge counts (unread requests, overdue invoices).
- `components/ui/fab.tsx` — FAB component (`.m-fab`), primary color, absolute positioning.
- Port `.m-*` base styles from `mobile.css` into `src/styles/globals.css` (or Tailwind @layer utilities) preserving CSS-var token references: `.m-shell`, `.m-bar`, `.m-bar.flat`, `.m-scroll`, `.m-tabbar`, `.m-tab`, `.m-fab`, `.m-iconbtn`, `.m-btn`, `.m-section-h`, safe-area utilities.
- Integration in `App.tsx` / root layout: conditional render `<DesktopShell>` vs `<MobileShell>` based on `useBreakpoint`. Navigation works on both shells.
- Verify themes apply correctly on mobile (CSS-vars from `ui-store` apply to `:root` → mobile inherits automatically).

**Files to create/modify:**

- `src/hooks/use-breakpoint.ts` (create)
- `src/components/layout/mobile-shell.tsx` (create)
- `src/components/layout/mobile-top-bar.tsx` (create)
- `src/components/layout/mobile-tab-bar.tsx` (create)
- `src/components/ui/fab.tsx` (create)
- `src/styles/globals.css` (modify — add `.m-*` styles)
- `src/App.tsx` (modify — adaptive shell render)
- `src/router.tsx` (modify — add `/notifications` route for mobile)

**Design references:**

- `mobile.css` L1–108 (shell, bar, tabbar, iconbtn)
- `mobile.css` L369–381 (FAB)
- `mobile.css` L383–402 (m-btn)
- `mobile-screens.jsx` L10–43 (MBar, MTabBar primitives)

**Acceptance:**

- [ ] App renders correctly at 390px / 414px / 768px / 1024px / 1280px widths — mobile shell < 1024px, desktop shell >= 1024px.
- [ ] Bottom tab bar has 5 tabs, active state highlighted, badges show dynamic counts.
- [ ] Navigation works on both shells — same routes, different layout.
- [ ] FAB visible on list screens, positioned per design (bottom 96px, right 18px).
- [ ] Themes (all 8 + radii) apply correctly on mobile shell (inherited from `:root` CSS-vars).
- [ ] `useBreakpoint` hook responds to window resize (DevTools responsive mode).
- [ ] typecheck + lint + test exit 0.

---

## B17 — Mobile DataTable + forms infra

**Goal:** переиспользуемые mobile-адаптивные компоненты: DataTable mobile mode (card-list), filter bottom-sheet, full-screen sheet для модалов, sticky bottom action bar.

**Inputs:** DESIGN §10.6 (mobile UI-паттерны); `mobile.css` (`.m-card`, `.m-list-row`, `.m-chips`, `.m-search`, `.m-kv`, `.m-segmented`, `.m-att-grid`); OPEN_QUESTIONS M7 (date-picker), M9 (bottom-sheet).

**Dependencies:** B16 (mobile shell), B3 (DataTable desktop). Decisions: OPEN_QUESTIONS M7, M9 resolved.

**Tasks:**

- `components/data-table/data-table-mobile.tsx` — mobile mode for DataTable: renders card-list (`.m-card.flush` + `.m-list-row`) instead of `<table>`. Accept `renderMobileRow` prop for custom row rendering. Integrates with existing DataTable — adaptive based on `useBreakpoint`.
- `components/forms/filter-bottom-sheet.tsx` — bottom-sheet for filters on mobile (replaces filter sidebar/popover). Uses Radix `Sheet` with `side="bottom"` (per M9 resolution).
- `components/forms/full-screen-sheet.tsx` — full-screen sheet for modals on mobile (replaces Dialog on mobile). Back button in top bar, scroll content, optional sticky bottom actions.
- `components/layout/sticky-bottom-bar.tsx` — sticky bottom action bar for create/save forms (position absolute, bottom 88px, left/right 8px, flex gap 8).
- Port mobile component styles from `mobile.css`: `.m-card`, `.m-card.flush`, `.m-list-row`, `.m-row-title`, `.m-row-sub`, `.m-row-meta`, `.m-row-chev`, `.m-chips`, `.m-chip`, `.m-search`, `.m-kv`, `.m-segmented`, `.m-att-grid`, `.m-att-cell`, `.m-inv-row`, `.m-inv-amount`, `.m-kpi-row`, `.m-kpi`, `.m-lead`, `.m-req-row`, `.m-drawer-item`, `.m-drawer-ic`, `.m-tl`, `.m-tl-item`, `.m-tl-dot`, `.m-donut`, `.m-avatar`, `.m-status-dot`, `.m-profile-head`, `.m-qa-row`, `.m-quick-grid`, `.m-quick`, `.m-att-bar`, `.m-att-pill`, `.m-otp-row`, `.m-otp-cell`, `.m-auth`, `.m-empty`.
- Component tests: DataTable mobile mode, filter bottom-sheet open/close.

**Files to create/modify:**

- `src/components/data-table/data-table-mobile.tsx` (create)
- `src/components/forms/filter-bottom-sheet.tsx` (create)
- `src/components/forms/full-screen-sheet.tsx` (create)
- `src/components/layout/sticky-bottom-bar.tsx` (create)
- `src/styles/globals.css` (modify — add remaining `.m-*` component styles)
- `src/components/data-table/data-table.tsx` (modify — integrate mobile mode)

**Design references:**

- `mobile.css` L128–201 (cards, list rows)
- `mobile.css` L203–244 (chips)
- `mobile.css` L246–267 (search)
- `mobile.css` L507–530 (segmented)
- `mobile.css` L578–588 (KV-list)
- `mobile.css` L480–504 (invoice row, request row)

**Acceptance:**

- [ ] DataTable renders card-list on mobile, table on desktop — same data, same hooks.
- [ ] Filter bottom-sheet opens from filter icon on mobile, closes on overlay tap / swipe.
- [ ] Full-screen sheet used for forms/modals on mobile, Dialog on desktop.
- [ ] Sticky bottom action bar visible on form screens (InvoiceDetail, DiscountWizard style).
- [ ] All `.m-*` component styles ported and rendering per design.
- [ ] Component tests green. typecheck + lint + test exit 0.

---

## B18 — Mobile core screens (8 экранов)

**Goal:** ScreenLogin, ScreenOtp, ScreenDashboard, ScreenNotifications, ScreenMore, ScreenChildren, ScreenChildDetail, ScreenLeads.

**Inputs:** DESIGN §10.5 (#1–#8); `mobile-screens.jsx` (ScreenLogin L72–106, ScreenOtp L111–153, ScreenDashboard L158–316, ScreenChildren L321–378, ScreenChildDetail L383–483, ScreenLeads L489–539, ScreenMore L776–902, ScreenNotifications L907–972).

**Dependencies:** B16 (mobile shell), B17 (mobile infra), B2 (auth), B3 (dashboard), B4 (children), B5 (enrollments). Decision: OPEN_QUESTIONS M10 resolved (notifications route).

**Tasks:**

- `routes/login.tsx` — add mobile-adaptive layout: `.m-auth` hero + `.m-auth-card` + phone input on mobile. Desktop layout unchanged.
- `routes/login.tsx` — OTP step: `.m-otp-row` + `.m-otp-cell` on mobile. Back button, timer, change-number link.
- `routes/dashboard.tsx` — mobile layout: MBar (greeting + notifications bell + QR), KPI row (2-col grid), overdue alert card, donut attendance, quick actions grid, activity timeline. Reuse existing dashboard hooks.
- `/notifications` route (create) — mobile: full-screen with segmented (Все/Непрочитанные), grouped by day. Desktop: redirect or page (per M10 resolution).
- ScreenMore — mobile drawer menu: profile card, grouped nav items (Воспитанники/Режим дня/Биллинг/Операции), logout. This is the mobile equivalent of sidebar.
- `routes/children/index.tsx` — mobile: MBar + search + chips filter + card-list (avatar + name + age/group + status dot/badge). FAB for create.
- `routes/children/$id.tsx` — mobile: flat bar + profile header (avatar, name, group, badge) + quick actions row + KV sections (Guardians, Billing, Timeline). Desktop tabs become scrollable sections.
- `routes/enrollments/index.tsx` — mobile: MBar + segmented (Воронка/Список/Архив) + chips by stage + lead cards with stage-colored strip. Kanban becomes list.

**Files to create/modify:**

- `src/routes/login.tsx` (modify — mobile layout)
- `src/routes/dashboard.tsx` (modify — mobile layout)
- `src/routes/notifications.tsx` (create)
- `src/routes/children/index.tsx` (modify — mobile layout)
- `src/routes/children/$id.tsx` (modify — mobile layout)
- `src/routes/enrollments/index.tsx` (modify — mobile layout)
- `src/components/layout/mobile-more-menu.tsx` (create)
- `src/locales/ru/common.json` (modify — mobile tab/drawer labels)
- `src/locales/kk/common.json` (modify — same)

**Design references:**

- `mobile-screens.jsx` L72–106 (Login)
- `mobile-screens.jsx` L111–153 (OTP)
- `mobile-screens.jsx` L158–316 (Dashboard)
- `mobile-screens.jsx` L321–378 (Children list)
- `mobile-screens.jsx` L383–483 (Child detail)
- `mobile-screens.jsx` L489–539 (Leads)
- `mobile-screens.jsx` L776–902 (More menu)
- `mobile-screens.jsx` L907–972 (Notifications)

**Acceptance:**

- [ ] Login/OTP mobile layout matches design (hero, card, OTP cells).
- [ ] Dashboard mobile: KPI row, overdue alert, donut, quick actions, activity — real data.
- [ ] Notifications full-screen: grouped by day, segmented Все/Непрочитанные.
- [ ] More menu: profile + grouped nav + logout — taps navigate to correct routes.
- [ ] Children list: search + chips + card-list; child detail: profile header + sections.
- [ ] Leads: segmented + chips + lead cards (kanban -> list).
- [ ] All screens use real data from existing hooks (no new API calls).
- [ ] typecheck + lint + test exit 0. Browser QA TBD by user.

---

## B19 — Mobile ops screens (2 экрана)

**Goal:** ScreenRequests, ScreenAttendance.

**Inputs:** DESIGN §10.5 (#17, #18); `mobile-screens.jsx` (ScreenRequests L617–655, ScreenAttendance L661–770).

**Dependencies:** B16–B17 (mobile infra), B8 (parent-requests desktop), B13 (attendance desktop).

**Tasks:**

- `routes/parent-requests/index.tsx` — mobile: MBar + segmented (Новые/В работе/Закрытые) + request inbox cards (unread dot, avatar, type badge, body preview 2-line clamp, timestamp). Filter icon → bottom-sheet.
- `routes/attendance/index.tsx` + `daily-status.tsx` — mobile: MBar + date strip (h-scroll pills, active = primary) + overall stats card (total/fill %) + stat pills (В саду/Опозд./Болеют/Нет) + per-group capacity bars + child grid (2-col, avatar + status dot + name + group).

**Files to create/modify:**

- `src/routes/parent-requests/index.tsx` (modify — mobile layout)
- `src/routes/attendance/index.tsx` (modify — mobile layout)
- `src/routes/attendance/daily-status.tsx` (modify — mobile layout)

**Design references:**

- `mobile-screens.jsx` L617–655 (Requests)
- `mobile-screens.jsx` L661–770 (Attendance)

**Acceptance:**

- [ ] Requests: segmented tabs + inbox cards with unread indicator; taps navigate to detail.
- [ ] Attendance: date strip scrollable, stats card, group capacity bars, child grid.
- [ ] Data from existing hooks; no new API calls.
- [ ] typecheck + lint + test exit 0. Browser QA TBD by user.

---

## B20 — Mobile billing screens (10 экранов)

**Goal:** ScreenInvoices, ScreenInvoiceDetail, ScreenPayments, ScreenPaymentDetail, ScreenTariffs, ScreenRefunds, ScreenDiscounts, ScreenDiscountWizard, ScreenHolidays, ScreenFiscal.

**Inputs:** DESIGN §10.5 (#19–#28); `mobile-screens.jsx` ScreenInvoices (L545–611); `mobile-screens-2.jsx` (ScreenInvoiceDetail L515–568, ScreenPayments L574–624, ScreenPaymentDetail L630–692, ScreenTariffs L698–739, ScreenRefunds L745–790, ScreenDiscounts L796–839, ScreenDiscountWizard L845–905, ScreenHolidays L911–978, ScreenFiscal L984–1034).

**Dependencies:** B16–B17 (mobile infra), B7 (invoices desktop), B9 (payments/tariffs desktop), B10 (refunds/discounts desktop), B15 (holidays/fiscal desktop). Decisions: OPEN_QUESTIONS M3 (tariff merge), M6 (discount wizard) resolved.

**Tasks:**

- `routes/billing/invoices/index.tsx` — mobile: MBar + KPI summary row (Выставлено/Оплачено/Долг) + chips filter + invoice rows + FAB.
- `routes/billing/invoices/$id.tsx` — mobile: hero amount card (status gradient bg) + KV details + line items + payments + fiscal + sticky bottom actions (PDF + Отправить).
- `routes/billing/payments/index.tsx` — mobile: MBar + KPI row (Сумма/Успех/Ошибок) + provider chips + payment rows.
- `routes/billing/payments/$id.tsx` — mobile: hero status circle + KV details + event timeline.
- `routes/billing/tariff-plans/index.tsx` + `routes/billing/tariff-assignments/index.tsx` — mobile: segmented «Планы / Назначения» (per M3 resolution); plan cards with price/status/kids count.
- `routes/billing/refunds/index.tsx` — mobile: Phase A warning banner + segmented (Ожидают/В работе/История) + refund cards.
- `routes/billing/discounts/index.tsx` — mobile: discount cards with type/stats/period.
- `routes/billing/discounts/new.tsx` (or `$id.tsx`) — mobile: 4-step wizard with stepper bar + conditions + preview + sticky bottom nav (Назад / Далее).
- `routes/billing/holidays.tsx` — mobile: month nav + calendar grid (7-col, holiday dates danger-colored) + holiday list with KK names.
- `routes/billing/fiscal-receipts.tsx` — mobile: Phase A info banner + KPI row + receipt list.

**Files to create/modify:**

- `src/routes/billing/invoices/index.tsx` (modify)
- `src/routes/billing/invoices/$id.tsx` (modify)
- `src/routes/billing/payments/index.tsx` (modify)
- `src/routes/billing/payments/$id.tsx` (modify)
- `src/routes/billing/tariff-plans/index.tsx` (modify)
- `src/routes/billing/tariff-assignments/index.tsx` (modify)
- `src/routes/billing/refunds/index.tsx` (modify)
- `src/routes/billing/discounts/index.tsx` (modify)
- `src/routes/billing/discounts/new.tsx` or `$id.tsx` (modify)
- `src/routes/billing/holidays.tsx` (modify)
- `src/routes/billing/fiscal-receipts.tsx` (modify)

**Design references:**

- `mobile-screens.jsx` L545–611 (Invoices)
- `mobile-screens-2.jsx` L515–568 (InvoiceDetail)
- `mobile-screens-2.jsx` L574–624 (Payments)
- `mobile-screens-2.jsx` L630–692 (PaymentDetail)
- `mobile-screens-2.jsx` L698–739 (Tariffs)
- `mobile-screens-2.jsx` L745–790 (Refunds)
- `mobile-screens-2.jsx` L796–839 (Discounts)
- `mobile-screens-2.jsx` L845–905 (DiscountWizard)
- `mobile-screens-2.jsx` L911–978 (Holidays)
- `mobile-screens-2.jsx` L984–1034 (Fiscal)

**Acceptance:**

- [ ] Invoices: KPI + chips + rows + FAB; detail: hero + KV + sticky bottom actions.
- [ ] Payments: KPI + chips + rows; detail: hero + KV + timeline.
- [ ] Tariffs: segmented Plans/Assignments, plan cards.
- [ ] Refunds: Phase A banner + segmented + cards.
- [ ] Discounts: card list + wizard (4-step stepper + sticky nav).
- [ ] Holidays: calendar grid + holiday list with KK names.
- [ ] Fiscal: Phase A banner + KPI + list.
- [ ] All data from existing hooks. typecheck + lint + test exit 0. Browser QA TBD by user.

---

## B21 — Mobile secondary screens (8 экранов)

**Goal:** ScreenGroups, ScreenGroupDetail, ScreenStaff, ScreenStaffDetail, ScreenStructure, ScreenSchedule, ScreenMeals, ScreenContent.

**Inputs:** DESIGN §10.5 (#9–#16); `mobile-screens-2.jsx` (ScreenGroups L24–71, ScreenGroupDetail L99–159, ScreenStaff L165–211, ScreenStaffDetail L217–277, ScreenStructure L283–327, ScreenSchedule L332–387, ScreenMeals L392–456, ScreenContent L461–509).

**Dependencies:** B16–B17 (mobile infra), B6 (groups/staff desktop), B11 (schedule/meals desktop), B12 (content desktop), B14 (structure desktop).

**Tasks:**

- `routes/groups/index.tsx` — mobile: KPI row (Групп/Детей/Перепол.) + group cards (emoji + name + age + mentor + location + capacity bar).
- `routes/groups/$id.tsx` — mobile: gradient header (capacity) + KV info + segmented (Дети/Расписание/История) + child list.
- `routes/staff/index.tsx` — mobile: search + chips (role filter) + staff card-list (avatar + name + role badge + group) + FAB.
- `routes/staff/$id.tsx` — mobile: profile header + quick actions + KV sections (Контакты/Трудовая/Документы).
- `routes/structure/index.tsx` — mobile: segmented (Локации/Камеры) + location list (icon + name + desc + group/cam counts). Phase C info banner for cameras.
- `routes/schedule/templates/$id.tsx` — mobile: day strip (h-scroll Пн–Вс) + time-slot list (time grid + colored slot cards).
- `routes/meal-plans/index.tsx` — mobile: day strip + calories summary card + meal cards (type + time + KK name + items list + cal badge) + allergen chips.
- `routes/content/index.tsx` — mobile: segmented (Лента/Запланированные/Черновики) + social-feed cards (author avatar + title + body + image placeholder + likes/comments) + FAB.

**Files to create/modify:**

- `src/routes/groups/index.tsx` (modify)
- `src/routes/groups/$id.tsx` (modify)
- `src/routes/staff/index.tsx` (modify)
- `src/routes/staff/$id.tsx` (modify)
- `src/routes/structure/index.tsx` (modify)
- `src/routes/schedule/templates/$id.tsx` (modify)
- `src/routes/meal-plans/index.tsx` (modify)
- `src/routes/content/index.tsx` (modify)

**Design references:**

- `mobile-screens-2.jsx` L24–71 (Groups)
- `mobile-screens-2.jsx` L99–159 (GroupDetail)
- `mobile-screens-2.jsx` L165–211 (Staff)
- `mobile-screens-2.jsx` L217–277 (StaffDetail)
- `mobile-screens-2.jsx` L283–327 (Structure)
- `mobile-screens-2.jsx` L332–387 (Schedule)
- `mobile-screens-2.jsx` L392–456 (Meals)
- `mobile-screens-2.jsx` L461–509 (Content)

**Acceptance:**

- [ ] Groups: KPI + cards with capacity bars; detail: gradient header + segmented.
- [ ] Staff: search + chips + card-list; detail: profile header + KV sections.
- [ ] Structure: segmented Локации/Камеры + list; Phase C banner.
- [ ] Schedule: day strip + time-slot cards.
- [ ] Meals: day strip + meal cards with KK names + allergen chips.
- [ ] Content: segmented + social-feed cards + FAB.
- [ ] All data from existing hooks. typecheck + lint + test exit 0. Browser QA TBD by user.

---

## B22 — Mobile system + i18n + QA (5 экранов)

**Goal:** ScreenDiagnostics, ScreenFaceId, ScreenDlq, ScreenSettings, ScreenError. Полный i18n sweep RU+KK всех mobile-specific строк. Manual QA pass на ключевых брейкпоинтах.

**Inputs:** DESIGN §10.5 (#29–#33), §10.8 (Phase placeholders), §10.10 (i18n); `mobile-screens-2.jsx` (ScreenDiagnostics L1040–1082, ScreenFaceId L1088–1156, ScreenDlq L1162–1211, ScreenSettings L1217–1314, ScreenError L1320–1341); OPEN_QUESTIONS M4 (i18n strategy).

**Dependencies:** B16–B17 (mobile infra), B13 (diagnostics desktop), B15 (face/DLQ/settings desktop). Decision: OPEN_QUESTIONS M4 resolved.

**Tasks:**

- `routes/diagnostics/templates.tsx` — mobile: specialist chips + template cards (spec badge + name + version + used count + active badge).
- `routes/face.tsx` — mobile: Phase C warning gradient banner + segmented (Согласия/Профили/Камеры) + KPI row + consent list.
- `routes/operations/lifecycle-dlq.tsx` — mobile: danger banner + task cards (icon + title + detail + error mono + retries + retry button).
- `routes/settings.tsx` — mobile: drawer-style sections (Садик/Биллинг/Уведомления/Внешний вид/Интеграции) + theme picker grid (2-col, color swatches + name + checkmark).
- `routes/_404.tsx` — mobile: centered 404 block (large mono number + title + description + CTA buttons).
- i18n sweep: add all mobile-specific keys to `src/locales/ru/common.json` and `src/locales/kk/common.json` (per M4 resolution). Keys include: tab labels (mobile_tab_home, mobile_tab_children, mobile_tab_requests, mobile_tab_invoices, mobile_tab_more), drawer section headers, quick action labels, mobile-specific button labels.
- Full review of all mobile screens for hardcoded strings, missing translations.

**Files to create/modify:**

- `src/routes/diagnostics/templates.tsx` (modify)
- `src/routes/face.tsx` (modify)
- `src/routes/operations/lifecycle-dlq.tsx` (modify)
- `src/routes/settings.tsx` (modify)
- `src/routes/_404.tsx` (modify)
- `src/locales/ru/common.json` (modify)
- `src/locales/kk/common.json` (modify)

**Design references:**

- `mobile-screens-2.jsx` L1040–1082 (Diagnostics)
- `mobile-screens-2.jsx` L1088–1156 (FaceId)
- `mobile-screens-2.jsx` L1162–1211 (Dlq)
- `mobile-screens-2.jsx` L1217–1314 (Settings)
- `mobile-screens-2.jsx` L1320–1341 (Error/404)

**Acceptance:**

- [ ] Diagnostics: chips + template cards per design.
- [ ] Face ID: Phase C banner + segmented + KPI + consent list.
- [ ] DLQ: danger banner + task cards + retry action.
- [ ] Settings: drawer sections + theme picker grid.
- [ ] 404: centered layout with CTA.
- [ ] All mobile-specific strings localized RU + KK (no hardcoded text).
- [ ] Manual QA pass: all 33 screens verified at 390px and 414px widths — layout, spacing, badges, actions.
- [ ] typecheck + lint + test exit 0. Browser QA TBD by user.

---

## Tracker

| Батч | Тема                                        | Приоритет | Статус |
| ---- | ------------------------------------------- | --------- | ------ |
| B0   | Scaffold & tooling                          | infra     | [x]    |
| B1   | Foundation (http/auth/i18n/темы/форматтеры) | infra     | [x]    |
| B2   | Auth + App Shell                            | infra/P0  | [x]    |
| B3   | DataTable + patterns + Дашборд              | infra/P0  | [x]    |
| B4   | Дети                                        | P0        | [x]    |
| B5   | Лиды/Зачисление                             | P0        | [x]    |
| B6   | Группы + Сотрудники                         | P0        | [x]    |
| B7   | Биллинг: Счета                              | P0        | [x]    |
| B8   | Заявки родителей                            | P0        | [x]    |
| B9   | Оплаты + Тарифы + Назначения                | P1        | [x]    |
| B10  | Возвраты + Скидки                           | P1        | [x]    |
| B11  | Расписание + Меню                           | P1        | [ ]    |
| B12  | Контент + Qundylyq                          | P1        | [ ]    |
| B13  | Посещаемость + Диагностика                  | P1        | [ ]    |
| B14  | Структура + Профиль/Уведомления/WS          | P1        | [ ]    |
| B15  | Праздники/Фискальные/DLQ/Настройки/Face     | P2        | [ ]    |
| B16  | Mobile foundation (shell)                   | mobile    | [x]    |
| B17  | Mobile DataTable + forms infra              | mobile    | [x]    |
| B18  | Mobile core screens (8 экранов)             | mobile    | [x]    |
| B19  | Mobile ops screens (2 экрана)               | mobile    | [x]    |
| B20  | Mobile billing screens (10 экранов)         | mobile    | [x]    |
| B21  | Mobile secondary screens (8 экранов)        | mobile    | [x]    |
| B22  | Mobile system + i18n + QA (5 экранов)       | mobile    | [x]    |

---

## TODO backlog

Каждый `// TODO(B<N>): …` в коде — строка здесь (тот же текст + `file:line` + owner-батч). Пусто на старте.

| TODO                                                                                                                                     | Файл:строка                                       | Owner | Статус |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----- | ------ |
| ~~expand groups domain (CRUD, mentors, children, deactivate) — minimal read created in B4 for child list filter/transfer/create select~~ | `src/api/groups.ts:25`                            | B6    | done   |
| child_photo storage: presigned backend не готов — 404 оставлен как есть (обработанная ошибка), переписать по факту когда backend выкатит | `src/api/storage.ts:1`                            | C5    | parked |
| Replace useMockNotifications with real useNotifications hook once backend endpoint is available                                          | `src/routes/notifications.tsx:39`                 | B18   | open   |
| wire useAttendance hook to backend GET /api/v1/attendance/daily-status when B13 desktop batch runs                                       | `src/routes/attendance/index.tsx:1`               | B13   | open   |
| wire useAttendance hook to backend GET /api/v1/attendance/daily-status when B13 desktop batch runs                                       | `src/routes/attendance/daily-status.tsx:1`        | B13   | open   |
| wire useStructure hook when B14 (Structure desktop) is built                                                                             | `src/routes/structure/locations/index.tsx:1`      | B14   | open   |
| wire useStructure hook when B14 (Structure desktop) is built                                                                             | `src/routes/structure/cameras/index.tsx:1`        | B14   | open   |
| wire useSchedule hook when B11 (Schedule desktop) is built                                                                               | `src/routes/schedule/templates/$id.tsx:1`         | B11   | open   |
| wire useMealPlans hook when B11 (Schedule + Meals desktop) is built                                                                      | `src/routes/meal-plans/index.tsx:1`               | B11   | open   |
| wire useContent hook when B12 (Content desktop) is built                                                                                 | `src/routes/content/index.tsx:1`                  | B12   | open   |
| wire useHolidays hook when holidays API + desktop page is built                                                                          | `src/routes/billing/holidays/index.tsx:1`         | B15   | open   |
| wire useFiscalReceipts hook when fiscal API + desktop page is built                                                                      | `src/routes/billing/fiscal-receipts/index.tsx:1`  | B15   | open   |
| wire useDiagnosticsTemplates hook when B13 (Diagnostics desktop) is built                                                                | `src/routes/diagnostics/templates/index.tsx:1`    | B13   | open   |
| wire useFace hooks when B15 (Face ID desktop) is built                                                                                   | `src/routes/face/index.tsx:1`                     | B15   | open   |
| wire useLifecycleDlq hook when B15 (DLQ desktop) is built                                                                                | `src/routes/operations/lifecycle-dlq/index.tsx:1` | B15   | open   |
| wire useSettings/useKindergarten hooks when B15 (Settings desktop) is built                                                              | `src/routes/settings/index.tsx:1`                 | B15   | open   |

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
