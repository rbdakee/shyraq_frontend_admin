# Backend Needings Handoff — Shyraq Admin Web

Каталог того, что фронту **не хватает от backend** для полноты данных на уже построенных/ближайших экранах. Производный документ: первоисточники — [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) (§B/§C), [`ADMIN_FRONTEND_HANDOFF.md`](ADMIN_FRONTEND_HANDOFF.md), live OpenAPI `http://194.32.140.219:5678/docs-json`.

**Назначение.** Один список для backend-команды: чего ждёт фронт, что сейчас отдаёт live-бэкенд, на какие экраны это влияет, и предлагаемый контракт. Фронт **ничего не выдумывает** (CLAUDE §2): где backend не готов — деградируем честно, баг не «чиним» подгонкой, фичу делаем когда backend выкатит контракт.

**Как читать.** Каждая запись `N<n>` самодостаточна: _Нужно фронту_ → _Live backend (проверено)_ → _Влияние (экраны)_ → _Предлагаемый контракт_ → _Источник_ → _Действие владельца/backend_.

**Статусы:** `blocked` (фронт-функция не работает без backend) · `degraded` (работает урезанно, честная деградация) · `forward-looking` (сейчас не блокирует, понадобится в следующих батчах).

> Все факты ниже сверены с live `/docs-json` **2026-05-18**. При изменении backend-scope — обновлять этот файл + первоисточники.

---

## Сводка

| ID  | Тема                                                                           | Статус              | Затронутые экраны                                                          |
| --- | ------------------------------------------------------------------------------ | ------------------- | -------------------------------------------------------------------------- |
| N1  | Дашборд: `summary` + `payments-overview` отсутствуют                           | `blocked`           | `/` (Дашборд) — KPI, Финансы, Обзор оплат                                  |
| N2  | ~~`GuardianDto` без ФИО/телефона пользователя~~ **resolved 2026-06-10**        | `resolved`          | `/children/:id` → вкладка «Опекуны»                                        |
| N3  | Storage `child_photo` не реализован                                            | `blocked` (подфича) | `/children/new`, `/children/:id` → фото                                    |
| N4  | `GET /users/me` без `roles[]`/`kindergartens[]`; нет session-restore с ролями  | `forward-looking`   | Восстановление сессии после hard-reload (роли для будущего RBAC)           |
| N5  | Enrollments DTO без поля пола ребёнка                                          | `forward-looking`   | `/enrollments` → child после `card_created` с пустым `gender`              |
| N6  | `InvoiceResponseDto` без массивов payments/refunds/fiscal_receipts             | `degraded`          | `/billing/invoices/:id` → секции Оплаты/Возвраты/Фискальные                |
| N7  | Parent-request DTO без отображаемых имён автора/заявителя                      | `degraded`          | `/parent-requests`, `/parent-requests/:id` → тред, шапка, список           |
| N8  | `StaffMemberDto` без user display-полей (`full_name`/`phone` null)             | `degraded`          | `/staff` → колонки ФИО, телефон, аватар-инициалы                           |
| N9  | Schedule week-snapshots copy без per-group фильтра (только глобально на садик) | `degraded`          | `/schedule/weeks` → CTA «Скопировать неделю» только глобальный             |
| N10 | ~~Schedule slot без поля `category` (тип слота)~~ **resolved 2026-06-11**      | `resolved`          | `/schedule/templates/:id` → цвет/категория слота (Урок/Активность/Еда/Сон) |

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

## N2 — `GuardianDto` без ФИО/телефон пользователя · `resolved` (2026-06-10)

**Нужно фронту.** Вкладка «Опекуны» в карточке ребёнка показывает по дизайну: **ФИО опекуна, телефон**, роль, статус, право забирать.

**Решение (live, deployed 2026-06-10).** Backend добавил в `GuardianDto` два поля, резолвящиеся из `users` по `child_guardians.user_id`: `user_full_name: string|null`, `user_phone: string|null` (E.164). Присутствуют во всех ответах с `GuardianDto` (list, child-detail `guardians[]`, invite, patch, approve/reject/revoke; а также parent-сторона). ⚠️ Для приглашённого по телефону юзера без профиля `user_full_name = <телефон>` (не `null`).

**Сделано на фронте.** `GuardianDtoSchema` += `user_full_name`/`user_phone` (`z.string().nullable()`); вкладка «Опекуны» рисует аватар-инициалы + ФИО + телефон (`formatPhone`). Кейс «имя = телефон» детектится (`resolveGuardianName`) и показывается как «—» (телефон — в своей колонке). HANDOFF §5.1 обновлён. `relationship` backend не отдаёт (вне scope) — связь не показываем.

**Источник.** OPEN_QUESTIONS §C4; реализовано в B25. Закрыто.

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

## N9 — Schedule week-snapshots copy без per-group фильтра (только глобально на садик) · `degraded`

**Нужно фронту.** Страница `/schedule/weeks` (B11) по дизайну VIS (`screens-ops.jsx` Schedule) и DESIGN §6.7 предполагает кнопку «Скопировать неделю» как операцию **по группе** — администратор смотрит конкретную группу, нажимает «скопировать её расписание на следующую неделю». Это совпадает с handoff §10 в его исходной (до правки) редакции.

**Live backend (проверено 2026-05-26).** `POST /api/v1/admin/schedule/week-snapshots/copy` принимает `CopyWeekDto = {fromMonday*}` (ISO date понедельника) — **только один параметр**, нет `groupId`. Бэкенд копирует расписание **всех групп садика** с указанной недели на следующую (`fromMonday + 7`), идемпотентно (если для целевой недели уже есть snapshot — группа skipped). Response: `WeekCopySummaryDto = {copiedGroups, skippedGroups, totalEvents}`.

**Влияние.** `/schedule/weeks`: на B11 фронт выставляет **один глобальный CTA** «Скопировать неделю садика» с дисклеймером «копирует расписания всех групп». Per-group action (`/schedule/weeks/$groupId` или action в строке группы) на B11 не делаем — UX неполный, но честный. Это решение владельца (2026-05-26).

**Предлагаемый контракт.** Добавить **опциональный** `groupId` в `CopyWeekDto`: при наличии копировать только указанную группу. `WeekCopySummaryDto` остаётся как есть (`copiedGroups ∈ {0, 1}`). Альтернатива: новый отдельный endpoint `POST /admin/schedule/week-snapshots/copy-group {groupId, fromMonday}`. Первый вариант предпочтительнее — меньше DTO/контрактов.

**Источник.** OPEN_QUESTIONS §B1 (2026-05-26, B11 pre-flight). **Действие.** Сделать когда backend расширит `CopyWeekDto` → добавить per-group action в строке группы на `/schedule/weeks`, обновить HANDOFF §10 + DESIGN §6.7 (first-document). Не блокирует B11.

---

## N10 — Schedule slot без поля `category` (тип слота) · `resolved` (2026-06-11)

> **Закрыто.** Backend a1522b0 (в `main`) добавил `category` аддитивно, фронт смигрирован: цвет читается из `slot.category`, добавлен Select «Категория» в форму слота, легенда обновлена (Прогулка → Активность), DTO в HANDOFF §10 обновлены. История ниже — для контекста.

**Нужно фронту.** На `/schedule/templates/:id` каждый слот в недельной сетке цветокодируется по типу: **Урок / Активность / Еда / Сон**. Сейчас у слота **нет поля типа** — фронт угадывает цвет, матча ключевые слова в `activityName` (`getSlotTone`: «завтрак/обед» → Еда, «прогулка/занятие» → ..., «сон» → Сон, иначе → Урок). Это хрупко (зависит от формулировки названия) и **админ не может явно выбрать тип**. Нужна явная категория, выбираемая в форме создания/редактирования слота.

**Live backend (было до a1522b0).** `CreateSlotDto` / `UpdateSlotDto` / `ScheduleTemplateSlotResponseDto` = `{dayOfWeek, startTime, endTime, activityName, locationId?, description?}` — поля типа/категории нет.

**Предлагаемый контракт.**

- **Enum `SlotCategory`** (канонические строковые значения; человекочитаемые лейблы — на фронте, i18n): `lesson` (Урок), `activity` (Активность), `meal` (Еда), `sleep` (Сон).
- **DB-миграция** `schedule_template_slots`: колонка `category` (enum/text), `NOT NULL DEFAULT 'activity'`; бэкфилл существующих строк → `'activity'` (или по желанию — keyword-эвристикой).
- **CreateSlotDto**: `category` — обязательное, enum из 4 значений (фронт всегда шлёт; серверный default `'activity'` как страховка).
- **UpdateSlotDto**: `category` — опциональное, enum.
- **ScheduleTemplateSlotResponseDto**: `category` — всегда присутствует, enum.
- **Валидация**: неизвестное значение → 400 (как для прочих enum-полей).

**Проекция в `activity_events` (рекомендуется, вторично).** Слоты проецируются в `activity_events` (week copy / rollout), а Staff/Parent рендерят дневное расписание. Для сквозного цветокодирования: добавить `category` в `activity_events` (копировать из слота при проекции) и вернуть его в DTO событий (admin/staff/parent). Можно отдельным follow-up — для админ-вью шаблонов не обязательно.

**Backward-compat.** Аддитивное изменение: бэкфилл default → нет null-обработки; прочие клиенты игнорируют незнакомое поле.

**Acceptance.** `POST/PATCH .../slots` с `category` персистит/возвращает; `GET …/templates/:id` отдаёт `category` на каждом слоте; невалидный `category` → 400.

**Источник.** Запрос владельца (2026-06-10). **Действие фронта (когда backend отдаст поле):** заменить keyword-`getSlotTone` на чтение `slot.category`; добавить Select «Категория» (Урок/Активность/Еда/Сон) в форму слота; обновить легенду (Прогулка → Активность); обновить HANDOFF §10 (DTO) + DESIGN. До этого — цвет по-прежнему угадывается по названию.

---

## Что НЕ нужно от backend (доступно — не считать gap'ом)

Чтобы не плодить ложные «нехватки» — это **есть** на live и используется:

- `GET /api/v1/kindergartens/me` → `KindergartenDto` — текущий садик (reload-restore N4).
- `GET /api/v1/admin/dashboard/attendance-today` — донат посещаемости на дашборде.
- `GET /api/v1/children/*` — весь CRUD/группы/опекуны/архив/история (B4, §A8) работает.
- `AuthResponseDto` (`/auth/otp/verify|refresh|role/select`) содержит `user/roles/kindergartens` — полный сценарий логина/выбора садика.

---

_Производный документ. Обновлять при изменении backend-scope или решений владельца — синхронно с [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) и [`ADMIN_FRONTEND_HANDOFF.md`](ADMIN_FRONTEND_HANDOFF.md) (CLAUDE §2 first-document)._
