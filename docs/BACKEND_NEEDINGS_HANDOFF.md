# Backend Needings Handoff — Shyraq Admin Web

Каталог того, что фронту **не хватает от backend** для полноты данных на уже построенных/ближайших экранах. Производный документ: первоисточники — [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) (§B/§C), [`ADMIN_FRONTEND_HANDOFF.md`](ADMIN_FRONTEND_HANDOFF.md), live OpenAPI `http://194.32.140.219:5678/docs-json`.

**Назначение.** Один список для backend-команды: чего ждёт фронт, что сейчас отдаёт live-бэкенд, на какие экраны это влияет, и предлагаемый контракт. Фронт **ничего не выдумывает** (CLAUDE §2): где backend не готов — деградируем честно, баг не «чиним» подгонкой, фичу делаем когда backend выкатит контракт.

**Как читать.** Каждая запись `N<n>` самодостаточна: _Нужно фронту_ → _Live backend (проверено)_ → _Влияние (экраны)_ → _Предлагаемый контракт_ → _Источник_ → _Действие владельца/backend_.

**Статусы:** `blocked` (фронт-функция не работает без backend) · `degraded` (работает урезанно, честная деградация) · `forward-looking` (сейчас не блокирует, понадобится в следующих батчах).

> Все факты ниже сверены с live `/docs-json` **2026-05-18**. При изменении backend-scope — обновлять этот файл + первоисточники.

---

## Сводка

| ID  | Тема                                                                          | Статус              | Затронутые экраны                                                |
| --- | ----------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| N1  | Дашборд: `summary` + `payments-overview` отсутствуют                          | `blocked`           | `/` (Дашборд) — KPI, Финансы, Обзор оплат                        |
| N2  | `GuardianDto` без ФИО/телефона пользователя                                   | `degraded`          | `/children/:id` → вкладка «Опекуны»                              |
| N3  | Storage `child_photo` не реализован                                           | `blocked` (подфича) | `/children/new`, `/children/:id` → фото                          |
| N4  | `GET /users/me` без `roles[]`/`kindergartens[]`; нет session-restore с ролями | `forward-looking`   | Восстановление сессии после hard-reload (роли для будущего RBAC) |
| N5  | Enrollments DTO без поля пола ребёнка                                         | `forward-looking`   | `/enrollments` → child после `card_created` с пустым `gender`    |
| N6  | `InvoiceResponseDto` без массивов payments/refunds/fiscal_receipts            | `degraded`          | `/billing/invoices/:id` → секции Оплаты/Возвраты/Фискальные      |
| N7  | Parent-request DTO без отображаемых имён автора/заявителя                     | `degraded`          | `/parent-requests`, `/parent-requests/:id` → тред, шапка, список |
| N8  | `StaffMemberDto` без user display-полей (`full_name`/`phone` null)            | `degraded`          | `/staff` → колонки ФИО, телефон, аватар-инициалы                 |

---

## N1 — Дашборд: `dashboard/summary` и `dashboard/payments-overview` отсутствуют · `blocked`

**Нужно фронту.** Главная страница (`/`) рисует:

- `GET /api/v1/admin/dashboard/summary` → `{active_children, enrollments_in_processing, invoices_overdue_count, invoices_overdue_amount, mtd_revenue, ytd_revenue, active_staff, active_groups}` — KPI-карточки + блок «Финансы».
- `GET /api/v1/admin/dashboard/payments-overview?from=&to=` → `{paid:{count,amount}, pending:{...}, overdue:{...}, refunded:{...}, providers:[{provider,count,amount}]}` — блок «Обзор оплат».

**Live backend (проверено).** Под `dashboard` существует **только** `GET /api/v1/admin/dashboard/attendance-today` → `{in_kindergarten, checked_out, absent, on_vacation, sick}` (опц. `?group_id=`). `summary` и `payments-overview` → **404** (нет ни под `dashboard`, ни под `summary/overview/stats/analytics`).

**Влияние.** `/` — ряд KPI, карточка «Финансы» и блок «Обзор оплат» отдают ошибку/пусто (посещаемость работает). Код фронта (`src/api/dashboard.ts`, `src/hooks/use-dashboard.ts`, `src/routes/dashboard.tsx`) написан верно по контракту, ждёт endpoint.

**Предлагаемый контракт.** Реализовать `GET /admin/dashboard/summary` и `GET /admin/dashboard/payments-overview` ровно по HANDOFF §26 (поля выше — это и есть ожидаемые Zod-схемы фронта).

**Источник.** OPEN_QUESTIONS §B3. **Действие.** Backend Phase A не выкатил — нужно решение владельца: ждать backend vs временно gracefully скрыть 2 виджета (отдельный B3-фиксап, не в acceptance B4).

---

## N2 — `GuardianDto` не содержит ФИО/телефон пользователя · `degraded`

**Нужно фронту.** Вкладка «Опекуны» в карточке ребёнка показывает по дизайну: **ФИО опекуна, телефон, связь (relationship)**, роль, статус, право забирать.

**Live backend (проверено).** `GuardianDto` = `{id, kindergarten_id, child_id, user_id, role, status, has_approval_rights, can_pickup, permissions, approved_by, approved_at, revoked_by, revoked_at, permissions_updated_by, permissions_updated_at, created_at, updated_at}`. Пользователь — только `user_id` (UUID). **Нет** `full_name`/`phone`/`relationship`. Batch-резолва users в scope нет.

**Влияние.** `/children/:id` → «Опекуны»: ФИО рендерится как «ID: f728aa95…», телефон «—». Роль/статус/can_pickup/has_approval_rights — корректны. Это согласованная честная деградация (не выдумываем имя из UUID).

**Предлагаемый контракт.** Встроить в `GuardianDto` отображаемые поля пользователя: `user_full_name`, `user_phone`, `relationship` — **или** дать users-lookup (`GET /users?ids=<uuid,uuid>` → `[{id, full_name, phone}]`).

**Источник.** OPEN_QUESTIONS §C4. **Действие.** Пересмотреть когда backend расширит `GuardianDto` или появится users-резолв (ожидается с профилем/B6/B14). Не блокирует B4.

---

## N3 — Storage `child_photo` (presigned/upload) не реализован · `blocked` (только подфича фото)

**Нужно фронту.** Загрузка фото ребёнка в `/children/new` и `/children/:id`. Код построен по HANDOFF §2 (стр.83) / DESIGN §183 — presigned 3-step: `POST /storage/presigned-upload` → PUT на `upload_url` → `POST /storage/confirm-upload`, `purpose=child_photo`; затем `POST /children/{id}/photo {photo_url}`.

**Live backend (проверено).** Presigned-эндпоинтов (`/storage/presigned-upload`, `/storage/confirm-upload`, `/storage/download/:key`) **нет**. Существует: `POST /api/v1/admin/content/upload-media` (multipart → `{url,key,bytes}`), `POST /api/v1/children/{id}/photo {photo_url}`, `GET /api/v1/media/{kgId}/{yyyyMm}/{filename}`. Backend (owner-confirmed): фича `child_photo` ещё не готова (presigned/S3 — Phase B, см. OPEN_QUESTIONS §C2; `upload-media` под `child_photo` backend не поддерживает).

**Влияние.** Загрузка фото → 404 (обработанная ошибка, не краш). Карточка создаётся/редактируется **без фото** (`photo_url?` опционален). Остальной CRUD/группы/опекуны/архив — работают.

**Предлагаемый контракт.** Выкатить presigned для `purpose=child_photo` (3-step как в HANDOFF §2) — **или** подтвердить, что `POST /admin/content/upload-media` принимает `child_photo`, и задокументировать 2-step (`upload-media` → `POST /children/{id}/photo {photo_url}`). НЕ переписывать фронт на `upload-media` до решения (CLAUDE §2).

**Источник.** OPEN_QUESTIONS §C5 (связано с §C2). **Действие.** Сделать фичу когда backend выкатит storage для `child_photo`; тогда обновить HANDOFF §2/§5 + DESIGN §183 под факт (first-document).

---

## N4 — `GET /users/me` без `roles[]`/`kindergartens[]`; нет session-restore с ролями · `forward-looking`

**Нужно фронту.** После hard-reload access-токен (in-memory) теряется, Zustand session пуст. Чтобы восстановить шапку/дашборд, фронту нужны: профиль пользователя, текущий садик и **роли** (для будущего RBAC-гейтинга UI).

**Live backend (проверено).**

- `GET /api/v1/users/me` → `UserResponseDto` = `{id, phone, full_name, avatar_url, iin, date_of_birth, locale}` — **плоский, без `roles[]` и `kindergartens[]`**. Это **противоречит HANDOFF §141** (там обещано `user + roles[] + kindergartens[]`). Прецедент §A7/§A8: live = факт → HANDOFF §141 правится под факт (см. ниже).
- `roles[]` и `kindergartens[]` отдаются **только** в `AuthResponseDto` (`POST /auth/otp/verify` | `/auth/refresh` | `/auth/role/select`).
- `GET /api/v1/kindergartens/me` → `KindergartenDto {id, name, slug, …}` **существует** — текущий садик восстанавливается с фронта (используется фиксом N4-фронт, см. ниже).

**Влияние.** Фикс reload-restore (см. IMPLEMENTATION_PLAN, B3-фиксап) восстанавливает: `user` ← `GET /users/me`, `currentKindergarten` ← `GET /kindergartens/me`. Это чинит имя/телефон/аватар в топбаре и user-menu, приветствие и название садика на дашборде. **`roles[]` после hard-reload НЕ восстанавливаются** этими двумя запросами. Сейчас **ни один отгруженный экран не гейтит UI по `roles[]`** (sidebar статичен, дашборд использует только садик, children не используют роли) → **не блокирует** MVP-поверхность. Станет блокером, когда появится RBAC-гейтинг (скрытие пунктов меню/действий по роли) в следующих батчах.

**Предлагаемый контракт.** Привести `GET /users/me` к HANDOFF §141 — возвращать `user + roles[] + kindergartens[]` — **или** добавить `GET /auth/session` → `AuthResponseDto` без ротации токенов (session-shell для гидрации после reload). Любой вариант делает roles восстановимыми без полного re-login.

**Источник.** Обнаружено 2026-05-18 при фиксе reload-restore. Связано с §A2 (token storage), §A7 (casing/контракт auth). **Действие.** До реализации — фронт восстанавливает user+садик (достаточно для текущей поверхности); RBAC-батчи должны учитывать, что roles появляются только после полного auth, пока backend не закроет N4.

---

## N5 — Enrollments DTO без поля пола ребёнка — child после `card_created` с пустым `gender` · `forward-looking`

**Нужно фронту.** Воронка лида при `card_created` авто-создаёт `children`. Чтобы у созданной карточки сразу был заполнен пол (не пустой), фронту нужно поле пола в контракте лида (на создании лида или в transition card_created).

**Live backend (проверено 2026-05-19).** `CreateEnrollmentDto` = `{contactName*, contactPhone*, childName?, childDob?, childIin?, source?, notes?, assignedTo?}`; `UpdateEnrollmentDto` = те же поля (все опц.); `TransitionEnrollmentDto` = `{toStatus*, comment?, currentGroupId?}`. **Поля `gender` нет ни в одном** (контракт enrollments — OPEN_QUESTIONS §A11). `ChildDto` (§A8) и `CreateChildDto`/`UpdateChildDto` пол **поддерживают** (`gender: male|female`, nullable).

**Влияние.** Ребёнок, созданный через `card_created`, имеет `gender = null`. Не блокирует B5 (acceptance закрыт). **Workaround (работает сейчас):** админ выставляет пол на карточке ребёнка — `routes/children/tabs/profile-tab.tsx` имеет рабочий gender-Select (B4, `PATCH /children/:id`).

**Предлагаемый контракт.** Добавить `gender?: 'male'|'female'` в `CreateEnrollmentDto` (и/или `TransitionEnrollmentDto` для card_created) — backend проставляет его в авто-создаваемый `children`. Тогда фронт добавит селект пола в форму лида.

**Источник.** OPEN_QUESTIONS §C13 (2026-05-19, W4/B5-fix, запрос владельца). **Действие.** Сделать когда backend расширит enrollment-DTO; тогда обновить HANDOFF §6 + добавить селект пола в форму лида (first-document).

---

## N6 — `InvoiceResponseDto` без массивов `payments`/`refunds`/`fiscal_receipts` · `degraded`

**Нужно фронту.** Карточка счёта (`/billing/invoices/:id`) по дизайну (DESIGN §6.10.1, `screens-billing.jsx` `InvoiceDetail`) рисует секции: Позиции, **Связанные оплаты, Возвраты, Фискальные чеки**, Применённые скидки.

**Live backend (проверено 2026-05-19).** `GET /api/v1/admin/invoices/:id` → `InvoiceResponseDto` содержит `line_items: InvoiceLineItemResponseDto[]` + плоские поля скидки (`discount_pct?, discount_reason?, amount_after_discount`). Массивов `payments`/`refunds`/`fiscal_receipts`/`discounts` в DTO **нет**; вложенных эндпоинтов (`/admin/invoices/:id/payments|refunds|fiscal-receipts`) тоже нет. (`GET /admin/payments` существует, но не связан с конкретным счётом в scope B7.)

**Влияние.** `/billing/invoices/:id`: секции Позиции + Скидка — корректны; секции Оплаты/Возвраты/Фискальные чеки — честная деградация (scaffold/лейаут прототипа сохранён, внутри информативный empty/info-state, данные не выдумываются).

**Предлагаемый контракт.** Встроить в `InvoiceResponseDto` массивы `payments[]`, `refunds[]`, `fiscal_receipts[]`, `applied_discounts[]` — **или** дать выделенные `GET /admin/invoices/:id/{payments,refunds,fiscal-receipts}`.

**Источник.** OPEN_QUESTIONS §C14. **Действие.** Пересмотреть когда backend расширит invoice-DTO/добавит эндпоинты → вернуть секции по факту, обновить HANDOFF §13 + DESIGN §6.10.1 (first-document). Не блокирует B7.

---

## N7 — Parent-request DTO без отображаемых имён автора/заявителя/ребёнка · `degraded`

**Нужно фронту.** `/parent-requests` (колонка ребёнка) и `/parent-requests/:id` (именованные пузыри треда, имя заявителя в шапке) по дизайну (`screens-ops.jsx` `RequestsList`/`RequestDetail`).

**Live backend (проверено 2026-05-19).** `ParentRequestResponseDto` — `requester_user_id`/`child_id` (UUID, без имён). `ParentRequestMessageResponseDto` — `author_user_id`/`author_staff_id` (UUID, ровно один; без имени). Batch-резолва users в scope B8 нет. (`GET /children/*` имя ребёнка отдаёт — фронт резолвит список детей отдельным запросом.)

**Влияние.** Тред: автор → обобщённый лейбл (родитель / администрация-сотрудник) по тому, какой `author_*_id` задан, без выдуманного имени. Шапка: заявитель → обобщённый лейбл. Список: имя ребёнка резолвится `useChildrenList`, fallback — усечённый идентификатор. Лейаут прототипа сохранён. Согласованная честная деградация (аналог N2).

**Предлагаемый контракт.** Встроить `author_display_name` в message-DTO и `requester_name`/`child_name` в `ParentRequestResponseDto` — **или** дать users-lookup (`GET /users?ids=…`, как предложено в N2).

**Источник.** OPEN_QUESTIONS §C15. **Действие.** Пересмотреть когда backend расширит DTO или появится users-резолв (связано с N2) → показать имена по факту, обновить HANDOFF §19. Не блокирует B8.

---

## N8 — `StaffMemberDto` без user display-полей (`full_name`/`phone` null) · `degraded`

**Нужно фронту.** Страница `/staff` (B6) рисует таблицу с колонками ФИО, Телефон, аватар-инициалы. Когда `staff_members.full_name|phone` null в БД — нужно показать display-поля из таблицы `users` (где значения фактически есть, что подтверждено соседним клиентом SuperAdmin).

**Live backend (проверено 2026-05-21 при ручном QA W6).** `GET /api/v1/admin/staff` → `StaffMemberDto[]` с `full_name: nullable, phone: nullable` (§A13.5). У записей, созданных без явного дублирования в `staff_members`, оба поля приходят null. SuperAdmin (соседний клиент того же backend) на `/admins` для тех же `user_id` показывает реальные `phone` (`+7 (777) 227-00-88`) и `full_name` (`asda qweq`) — то есть JOIN на `users` делает он сам. `/admin/staff/*` такого JOIN не делает.

**Влияние.** `/staff`: колонки ФИО и Телефон у некоторых записей рендерятся `—`, аватар — пустой fallback по инициалам (`?`); реальные поля (роль/статус/специальность) корректны. Это согласованная честная деградация (CLAUDE §6 / §C4-прецедент: не фабриковать имя из UUID/phone — иначе «Имя: +77772270088» путает оператора). При активной работе с большим штатом — заметная UX-проблема (нельзя глазами отличить администраторов друг от друга).

**Предлагаемый контракт.** Один из трёх вариантов (любой закрывает N8):

1. **Backend JOIN на `users`** в `StaffMemberDto`: добавить `user_full_name`, `user_phone` (симметрично предлагаемому N2 для Guardians). Минимальное изменение DTO.
2. **Backend заполняет `staff_members.full_name|phone`** при INSERT (берёт из `users`). Требует миграции существующих null-записей.
3. **Дать users-lookup** (`GET /users?ids=<uuid,uuid>` → `[{id, full_name, phone}]`) — единое решение для N2/N7/N8, фронт сам резолвит.

**Источник.** OPEN_QUESTIONS §C16 (W6/B9 ручной QA). Один шаблон с N2 (Guardians) и N7 (Parent-requests). **Действие.** Пересмотреть когда backend закроет один из вариантов → отрендерить ФИО/телефон по факту, обновить HANDOFF §8 (first-document). Не блокирует B6/B9.

---

## Что НЕ нужно от backend (доступно — не считать gap'ом)

Чтобы не плодить ложные «нехватки» — это **есть** на live и используется:

- `GET /api/v1/kindergartens/me` → `KindergartenDto` — текущий садик (reload-restore N4).
- `GET /api/v1/admin/dashboard/attendance-today` — донат посещаемости на дашборде.
- `GET /api/v1/children/*` — весь CRUD/группы/опекуны/архив/история (B4, §A8) работает.
- `AuthResponseDto` (`/auth/otp/verify|refresh|role/select`) содержит `user/roles/kindergartens` — полный сценарий логина/выбора садика.

---

_Производный документ. Обновлять при изменении backend-scope или решений владельца — синхронно с [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) и [`ADMIN_FRONTEND_HANDOFF.md`](ADMIN_FRONTEND_HANDOFF.md) (CLAUDE §2 first-document)._
