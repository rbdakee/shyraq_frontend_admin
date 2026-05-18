# Admin Web — Frontend Handoff (Shyraq)

**Аудитория:** frontend-разработчик, который строит **Admin Web** с нуля.
**Цель:** один документ, из которого можно построить весь фронтенд админки — что такое админка, кто ею пользуется, все бизнес-процессы, все страницы, все эндпоинты с контрактами, все функции.

**Источники истины (при расхождении первичны они):**

- REST/WS контракт — [`../endpoints.md`](../endpoints.md)
- Бизнес-процессы — [`../Shyraq BP.md`](../Shyraq%20BP.md)
- БД-модель — [`../schema.dbml`](../schema.dbml)
- Архитектура — [`../architecture.md`](../architecture.md)
- Трекер реализации — [`../../IMPLEMENTATION_PLAN.md`](../../IMPLEMENTATION_PLAN.md)

**Парный документ:** [`ADMIN_DESIGN_SPEC.md`](ADMIN_DESIGN_SPEC.md) — ТЗ для дизайнера (визуал всех экранов). Этот файл — функциональный (контракты + поведение).

> **Статус backend (важно для планирования):** Phase A закрыта 2026-05-13 — весь функционал админки работает end-to-end на **Mock-адаптерах** (SMS, оплата, ОФД, файловое хранилище, push). Реальные интеграции (Halyk ePay, ОФД-чеки, SMS-провайдер, S3) — Phase B, отложены, но **контракты эндпоинтов не изменятся** при их подключении. Face ID и CCTV-стриминг — Phase C (edge), отложены: admin-эндпоинты конфигурации существуют, но фактическое распознавание/видеопоток в MVP не работают. Детали — §13.

---

## 1. Что такое Admin Web и кто ею управляет

**Shyraq** — multi-tenant SaaS для управления детскими садами. Один backend обслуживает много садиков. Есть 4 клиента: **SuperAdmin** (управление платформой, отдельный продукт — не сюда), **Admin Web** (этот документ), **Staff App** (мобильное для сотрудников), **Parent App** (мобильное для родителей).

**Admin Web** — веб-кабинет управления **одним конкретным садиком**. Это операционный центр садика.

**Кто пользователь:** сотрудник садика с ролью `admin` (заведующая / управляющий / администратор / методист с админ-доступом). Это **не технический пользователь** — он не знает про API/JWT. Может быть несколько админов в одном садике. Один человек по одному номеру телефона может быть админом в нескольких садиках (тогда после входа выбирает садик — см. §3).

**Что админ делает (зона ответственности):**

- ведёт воронку зачисления (лиды → карточка ребёнка);
- управляет детьми (карточки, группы, переводы, архив, опекуны);
- управляет сотрудниками (создание, роли, назначение менторов на группы);
- управляет структурой садика (группы, локации, камеры);
- ведёт биллинг (тарифы, начисления, оплаты, возвраты, скидки, праздники, фискальные чеки);
- ведёт расписание и меню;
- публикует контент (новости, Qundylyq, поздравления);
- обрабатывает заявки родителей;
- настраивает диагностические формы для специалистов;
- видит посещаемость и аналитику;
- решает безопасность (отзыв QR, разбор сбойных фоновых задач);
- настраивает свой садик.

**Чем админ НЕ управляет:** созданием самого садика и первого админа (это делает SuperAdmin), фискальными ключами (только SuperAdmin), другими садиками, платформенными подписками/фичефлагами.

---

## 2. Общие технические соглашения

### 2.1 База и окружение

- **Base URL:** `<host>/api/v1` (все пути в этом документе — относительно `/api/v1`).
- **Swagger:** `<host>/docs`, OpenAPI JSON — `<host>/docs-json`. Рекомендуется генерировать типы из `/docs-json`.
- Локальный backend: `http://localhost:3000` → `http://localhost:3000/api/v1`, Swagger `http://localhost:3000/docs`.

### 2.2 Аутентификация

- Вход — **по номеру телефона + OTP** (SMS-код). Тот же механизм, что у Staff App (см. §3). SuperAdmin (email+password) сюда не относится.
- **Access token** — JWT HS256, TTL **15 минут**. Передаётся `Authorization: Bearer <token>` в каждом запросе (кроме `@Public`).
- **Refresh token** — opaque hex (64 символа), TTL 30 дней. Хранить безопасно (на MVP за VPN допустим localStorage; cookie-flow — future). Ротация через `POST /auth/refresh`.
- JWT админа содержит `kindergarten_id` — всё автоматически скоупится на этот садик. Кросс-тенант невозможен на уровне backend (RLS).
- Реализуй **silent refresh**: при 401 `invalid_token`/`token_revoked` — попытка `/auth/refresh`, при неудаче — разлогин на экран входа.

### 2.3 Формат ответов и ошибок

- Тело ошибки: `{ "error": "<code>", "message": "<human text>", "details?": ... }`. Веди реестр кодов и маппинг на i18n-сообщения (бэкенд коды — стабильны, в этом документе они перечислены по разделам).
- Часть ошибок валидации DTO (class-validator) возвращается стандартным nest-конвертом: `{ statusCode: 422, message: [ ...строки... ], error: "Unprocessable Entity" }` — у них **нет** стабильного `error`-кода, парси `message[]`. (Подробно — `endpoints.md §3.10` «422-vs-400 contract».)
- HTTP-коды: 200/201/204 успех; 400 доменная ошибка; 401 не авторизован; 403 нет прав; 404 не найдено; 409 конфликт состояния; 422 ошибка валидации; 429 rate-limit.
- Timestamps — ISO 8601 (UTC, `...Z`). IDs — UUID v4. Деньги — `decimal(12,2)`, валюта `KZT`.

### 2.4 Локализация

- Заголовок `x-custom-lang: ru | kk` — ставить из выбранной локали интерфейса (никогда `en`).
- Локализованные данные приходят JSONB `{ "ru": "...", "kz": "..." }` — **в данных ключ `kz`**, а в DTO-enum локали пользователя — `kk` (исторический разнобой, учитывай). Резолв — по `users.locale`, fallback на `ru`.
- Интерфейс админки нужен минимум **RU + KK**.

### 2.5 Пагинация (разнится по эндпоинтам — смотри в каждом разделе)

- **Offset-based:** `?limit=&offset=`, ответ содержит `total`. Большинство списков.
- **Cursor-based:** `?cursor=&limit=`, ответ содержит `next_cursor` (base64). Используется в: parent-requests (`/admin/parent-requests`), content (`/admin/content`), lifecycle DLQ (`/admin/lifecycle/failed-jobs`), child status-history (offset), notifications. Невалидный cursor → 400 `*_cursor_invalid`.

### 2.6 Загрузка файлов (2 паттерна)

1. **Generic presigned** (аватары, фото ребёнка, скан согласия, видео enrollment): `POST /storage/presigned-upload {purpose, contentType}` → `{upload_url, key, expires_in:300}` → клиент `PUT`-ит файл на `upload_url` → `POST /storage/confirm-upload {key, ...target}` (обновляет ссылку в сущности). `GET /storage/download/:key` — приватный presigned GET (TTL 3600с).
2. **Multipart напрямую** (контент-посты): `POST /admin/content` и `PATCH /admin/content/:id` принимают `multipart/form-data` с полем `file`.

- `purpose` allowlist: `avatar, child_photo, story, diagnostic_attachment, face_enrollment_video, chat_media`.
- На Phase A файлы лежат локально и раздаются по `/static/<kg>/<yyyy-mm>/<file>`. При S3 (Phase B) URL поменяется — не хардкодь хост, бери URL из ответа.

### 2.7 WebSocket (реал-тайм)

- Подключение: `wss://<host>/ws`, JWT в `socket.handshake.auth.token` (НЕ в query).
- Слушать событие `auth_error` → при `token_expired`/`session_revoked` принудительный разлогин/рефреш.
- После handshake сервер шлёт `connected: { user_id, rooms: [...] }`. Админ авто-подписывается на `user:{user_id}` и `group:{group_id}` (по активным mentor-назначениям — у админа их обычно нет, основное — `user:{id}`).
- В B9 диспетчер шлёт события только в `user:{userId}` (события под именем = `event_key`, payload `{title_i18n, body_i18n, data}`). Используй для тостов/инвалидации (например, прилетела заявка, изменился статус оплаты).
- Полный каталог событий — `architecture.md §6.5`.

### 2.8 Rate limiting

- Все запросы проходят Redis sliding-window. На 429 показывай мягкий тост «слишком часто, повторите позже», бэкофф на ретраях. OTP — 5/час на телефон, после 3 неверных кодов — блокировка телефона на 15 минут.

---

## 3. Вход в админку (Auth flow)

Эндпоинты `/auth/*` — общие. Полный контракт — `endpoints.md §0.1`.

> **Соглашение об именовании (подтверждено live `/docs-json` 2026-05-18, см. OPEN_QUESTIONS §A7):** тела **request**-DTO — **camelCase** (NestJS class-validator); поля **response** — **snake_case**. Ниже тела показаны в фактическом (camelCase) виде. **⚠️ Casing — per-module, не глобален** (уточнение §A8, 2026-05-18): camelCase-request верен для auth/users; **модуль children — snake_case request-DTO**. Перед каждым data-слайсом сверять per-endpoint по live `/docs-json`, не экстраполировать конвенцию на новые модули.

| Шаг              | Метод | Путь                | Тело                                                                                                        | Ответ                         |
| ---------------- | ----- | ------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1. Запрос кода   | POST  | `/auth/otp/request` | `{ phone }` (E.164 `+7...`)                                                                                 | `202 { otp_ref, expires_in }` |
| 2. Проверка кода | POST  | `/auth/otp/verify`  | `{ phone, code }`, header `X-Device-Id` (опц., стабильный per-install)                                      | auth-response (см. ниже)      |
| 3a. Выбор садика | POST  | `/auth/role/select` | `{ kindergartenId, role? }` (`role` опц.: `"admin"` для Admin Web; обязателен только при ≥2 ролях в садике) | auth-response                 |
| 4. Рефреш        | POST  | `/auth/refresh`     | `{ refreshToken }` + текущий Bearer                                                                         | новая пара                    |
| 5. Выход         | POST  | `/auth/logout`      | `{ refreshToken? }` + Bearer                                                                                | `204`                         |

**Auth-response shape:**

```jsonc
{
  "access_token": "eyJ...",          // JWT HS256, 15m
  "refresh_token": "3a7f..." | null, // 64 hex; null если pending_role_select
  "token_type": "Bearer",
  "expires_in": 900,
  "pending_role_select": false,      // true у multi-role staff
  "roles": [ { "role": "admin", "kindergarten_id": "uuid", "group_id": null } ],
  "kindergartens": [ { "id":"uuid", "name":"Солнышко", "slug":"sunshine" } ],
  "user": { "id":"uuid", "phone":"+7...", "full_name":"...", "avatar_url":null, "iin":null, "date_of_birth":null, "locale":"ru" }
}
```

> `user` присутствует в auth-response live-бэкенда (additive vs ранний черновик). Поля `user`/`roles`/`kindergartens` — snake_case (response).

**Поведение фронта:**

- После `verify`: если `pending_role_select:true` (у пользователя ≥2 активных staff-роли в разных садиках) → `refresh_token=null`, показать экран **«Выберите садик»** по `kindergartens[]`, вызвать `/auth/role/select` → получить полноценную пару.
- Если ровно одна admin-роль — сразу в кабинет.
- Если у пользователя нет роли `admin` ни в одном садике — он не должен попасть в Admin Web (роль `parent`/`mentor`/`specialist` — это другие приложения). Показать сообщение «нет доступа к админке».
- Ошибки OTP: `400 otp_expired_or_missing`, `400 invalid_otp`, `400 invalid_phone_format`, `429 otp_rate_limit`, `429 otp_locked`, `403 no_active_roles`, `403 pending_role_select`, `403 role_not_available`, `403 role_select_not_required`. Покажи человекочитаемые сообщения, для 429 — таймер до разблокировки.

**Профиль текущего пользователя:** `GET /users/me` → **плоский** `UserResponseDto` (snake_case: `id, phone, full_name, avatar_url, iin, date_of_birth, locale`) — **без `roles[]`/`kindergartens[]`** (сверено с live `/docs-json` 2026-05-18; ранняя версия §141 обещала `+ roles[] + kindergartens[]` — расхождение, по прецеденту §A7/§A8 live = факт, §141 правлен под факт; см. OPEN_QUESTIONS §A9 + BACKEND_NEEDINGS N4). `roles[]`/`kindergartens[]` отдаются только в `AuthResponseDto` (`/auth/otp/verify|refresh|role/select`). Текущий садик — отдельным `GET /kindergartens/me` → `KindergartenDto {id, name, slug, …}`. `PATCH /users/me` тело **camelCase**: `{ fullName, avatarUrl, dateOfBirth, iin, locale(ru|kk) }`. `GET /users/me/qr` → личный Identity QR `{token(32 hex), issued_at, expires_at}` (рендерить QR на клиенте; авто-обновляется сервером).

---

## 4. Карта бизнес-процессов → разделы админки

| BP (Shyraq BP.md)                | Что делает админ в Admin Web                                              | Раздел/страница админки                    |
| -------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------ |
| §1 Enrollment & Onboarding       | Ведёт лиды по статусам, заполняет карточку, создаёт ребёнка + первый счёт | Зачисление (§6)                            |
| §3 Staff/Admin Provisioning      | Создаёт сотрудников, роли, назначает менторов на группы                   | Сотрудники (§8), Группы (§7)               |
| §4 Payments                      | Тарифы, начисления, оплаты, возвраты, праздники, фискальные чеки          | Биллинг (§13–§19)                          |
| §4.1 Custom Discounts            | Конструктор скидок, активация, статистика применения                      | Скидки (§18)                               |
| §5 Daily Operations / Attendance | Смотрит/корректирует посещаемость, дневной статус                         | Посещаемость (§20)                         |
| §6 Requests from Parents         | Принимает/отклоняет заявки, ведёт переписку                               | Заявки родителей (§21)                     |
| §7 Pickup / OTP                  | (в основном Staff App; админ видит pickup-заявки опосредованно)           | — (Staff App)                              |
| §8 Diagnostics                   | Настраивает диагностические шаблоны по специализациям                     | Диагностика (§22)                          |
| §9 Content Management            | Публикует новости/Qundylyq/ДР, ведёт меню и расписание                    | Контент (§11), Расписание (§9), Меню (§10) |
| §11 CCTV                         | Назначает камеры на локации                                               | Камеры (§..., внутри Структуры)            |
| §12 Lifecycle of Child           | Архив/реактивация/перевод ребёнка, история статусов                       | Дети (§5)                                  |
| §13 Identity QR                  | Отзывает скомпрометированные QR                                           | Безопасность / карточка пользователя       |
| §10 Notifications                | Получает push/WS о событиях садика                                        | Глобально (колокол)                        |

---

## 5. Дети (Children) — `/children/*`

**Назначение:** карточки детей, опекуны, переводы между группами, жизненный цикл (создание → активный → архив → реактивация), история статусов. BP §1 (дополнение manual creation), §12.

> **⚠️ Канонично — OPEN_QUESTIONS §A8 (resolved 2026-05-18, подтверждено live `/docs-json`).** Таблица §5.1 ниже исторична; при расхождении первичен §A8. Ключевые поправки факта: (1) префикс **`/children/*`** без `/admin` (исключение: timeline = `/admin/children/{id}/timeline`); (2) перевод = `POST /children/{id}/transfer` (не `…/transfer-group`); (3) request-DTO детей — **snake_case** (casing per-module, §A7-уточнение — не camelCase); (4) `GET /children` → `{data,meta}` (не `{items,total}`), поиск-параметр `q`; (5) `GET /children/{id}` → только `{child, guardians[]}` — группа/история/timeline/платежи/диагностика тянутся отдельными эндпоинтами/preview-заглушками, не embedded; (6) опекун добавляется через `InviteGuardianDto {user_phone XOR user_id, role, can_pickup}` — приглашение, **без поля ФИО**; (7) guardian.status enum = `pending_approval|approved|rejected|revoked`; (8) timeline — **cursor** (`{items,nextCursor}`). Полный фактический контракт со схемами — §A8.

### 5.1 Эндпоинты

| Метод | Путь                                               | Назначение                                                                                                                          |
| ----- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| GET   | `/admin/children`                                  | Список. Фильтры: `status`(card_created/active/archived), `current_group_id`, поиск по ФИО/ИИН.                                      |
| POST  | `/admin/children`                                  | Создать карточку вручную (вне enrollment). Статус `card_created`, без авто-счёта.                                                   |
| GET   | `/admin/children/:id`                              | Полная карточка: guardians, группа, история групп, timeline (preview), платежи (preview), диагностики (preview), `face_enrollment`. |
| PATCH | `/admin/children/:id`                              | Обновить ФИО, ИИН, DOB, photo, `medical_notes`, `allergy_notes`.                                                                    |
| POST  | `/admin/children/:id/transfer-group`               | Перевод в другую группу. Body `{to_group_id, reason?}`. → `child_group_history` + notify `child.transferred`.                       |
| POST  | `/admin/children/:id/archive`                      | Архивировать. Body `{archive_reason}` (1..500). Закрывает тарифы, enqueue pro-rata refund.                                          |
| POST  | `/admin/children/:id/reactivate`                   | Реактивировать. Body `{}`. Ответ `{child, requires_new_tariff_assignment:true}`.                                                    |
| GET   | `/admin/children/:id/status-history`               | Аудит изменений статуса. `?limit=(≤200)&offset=`. `{items:[...], total}`.                                                           |
| GET   | `/admin/children/:id/guardians`                    | Все опекуны + статус одобрения + `has_approval_rights`.                                                                             |
| POST  | `/admin/children/:id/guardians`                    | Добавить опекуна вручную (админ может создать primary).                                                                             |
| PATCH | `/admin/children/:id/guardians/:guardianId`        | Изменить `role`, `can_pickup`. (`has_approval_rights` — только через Parent flow.)                                                  |
| POST  | `/admin/children/:id/guardians/:guardianId/revoke` | Отозвать доступ (`revoked_at`, `revoked_by`).                                                                                       |
| GET   | `/admin/children/:id/group-history`                | История переводов.                                                                                                                  |
| GET   | `/admin/children/:id/timeline`                     | Полная timeline ребёнка.                                                                                                            |

**transfer-group:** `{ "to_group_id":"uuid", "reason":"Возрастная группа" }` → `200 { id, full_name, current_group_id, group_history_entry_id }`. Ошибки: 404 `child_not_found`, 404 `group_not_found`, 409 `child_already_in_group`, 409 `archived_child_not_transferable` (архивного нельзя — сначала reactivate).

**archive:** `{ "archive_reason":"Переезд семьи" }` → `200 { id, full_name, status:"archived", archived_at, archive_reason }`. Ошибки: 409 `child_already_archived`, 422 `archive_reason_required`.

**reactivate:** `{}` → `200 { child:{id,full_name,status:"active"}, requires_new_tariff_assignment:true }`. Ошибка 409 `child_not_archived`. `requires_new_tariff_assignment` всегда true → UI должен предложить назначить тариф (`POST /admin/tariff-assignments`).

**status-history item:** `{ id, previous_status, new_status, previous_archive_reason, archive_reason, changed_by_user_id, changed_at }`, сортировка `changed_at DESC`.

### 5.2 Страницы и поведение

- **Список детей:** таблица (ФИО, ИИН, группа, статус-бейдж, дата зачисления), фильтры по статусу/группе, поиск, кнопка «Создать карточку». Архивные — визуально приглушены/отдельный фильтр.
- **Карточка ребёнка** (детальная, табы):
  - _Профиль_ — ФИО, ИИН, DOB, пол, фото (presigned upload `purpose=child_photo`), мед.заметки, аллергии, текущая группа, статус, дата зачисления. Edit-режим (PATCH).
  - _Опекуны_ — список (роль primary/secondary/nanny, статус pending/approved/rejected/revoked, can_pickup, has_approval_rights). Действия: добавить опекуна (форма телефон/ФИО/роль), изменить роль/can_pickup, отозвать. Кнопка «Отозвать все QR пользователя» (§23).
  - _Группа / История групп_ — текущая группа + хронология `child_group_history`. Кнопка «Перевести в группу» (модал: выбор группы + причина).
  - _Timeline_ — лента событий дня/истории (check-in/out, активности, заметки, фото).
  - _Платежи_ — превью счётов/оплат ребёнка (ссылка в Биллинг с фильтром по child_id).
  - _Диагностика_ — превью последних записей.
  - _Статус-история_ — аудит (только админ видит), пагинация offset.
  - _Face ID_ — факт enrollment (`face_enrollment:{enrolled, enrolled_at}`) + переход в раздел Face (§24).
  - Шапка карточки: кнопки **Архивировать** (модал с обязательной причиной 1..500), **Реактивировать** (для архивных; после — подсказка назначить тариф), **Перевести в группу**.
- Состояния: пустой список (нет детей), архивный ребёнок (read-only баннер), ошибки 404 — «карточка не найдена/нет доступа».

---

## 6. Зачисление / Лиды (Enrollments) — `/admin/enrollments/*`

**Назначение:** воронка от заявки родителя до создания карточки ребёнка. BP §1.

**State machine лида:** `new → in_processing → {waitlist | card_created | cancelled} → archive`. Логируется в `enrollment_status_log`. При переходе в `card_created` система создаёт `children` + `child_guardians` (primary) + первый `invoice`.

> **Фактический контракт (подтверждено по live `/docs-json` 2026-05-18, §A11):**
>
> - **Casing:** request-DTO и response — **camelCase** (`contactName, contactPhone, childName, childDob, childIin, assignedTo, toStatus, currentGroupId, statusChangedAt, kindergartenId`). Это НЕ snake_case (как children) — per-module конвенция (прецедент §A8).
> - **Пагинация:** `GET /admin/enrollments` — **page-based** (`?page=1&limit=20`), response `{data, total, page, limit}`. НЕ offset-based.
> - **CreateEnrollmentDto:** `{contactName*(string), contactPhone*(string), childName?(string), childDob?(string ISO), childIin?(string), source?(string), notes?(string), assignedTo?(string UUID)}`. Required: только `contactName` + `contactPhone`.
> - **UpdateEnrollmentDto:** все поля optional (`contactName, contactPhone, childName, childDob, childIin, source, notes, assignedTo`). 409 при статусе `card_created|cancelled|archive` (locked).
> - **TransitionEnrollmentDto:** `{toStatus*(enum), comment?(string), currentGroupId?(string, required by service when card_created)}`. Response: `{enrollment: EnrollmentResponseDto, child: ChildDto|null}` — `child` is a full `ChildDto` (snake_case, `id` string UUID + all fields per §5) present only when `toStatus=card_created`; `null` otherwise.
> - **AssignEnrollmentDto:** `{assignedTo*(string UUID)}`. Response: `EnrollmentResponseDto`. 409 if archived.
> - **EnrollmentResponseDto:** все поля в required (nullable где помечено): `id, kindergartenId, childId(nullable), contactName, contactPhone, childName(nullable), childDob(nullable), childIin(nullable), status(enum), source(nullable), notes(nullable), assignedTo(nullable), statusChangedAt, createdAt, updatedAt`.
> - **EnrollmentDetailResponseDto:** `{enrollment: EnrollmentResponseDto, log: EnrollmentStatusLogResponseDto[]}`.
> - **EnrollmentStatusLogResponseDto:** `{id, enrollmentId, kindergartenId, fromStatus(nullable enum — null for initial creation), toStatus(enum), changedBy(string UUID), comment(nullable), createdAt}`.

| Метод | Путь                                | Назначение                                                                                                                         |
| ----- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| GET   | `/admin/enrollments`                | Список лидов. Фильтр `status`, поиск `q` по телефону/ФИО. Page-based: `?page&limit` → `{data, total, page, limit}`.                |
| POST  | `/admin/enrollments`                | Создать лид. `{contactName*, contactPhone*, childName?, childDob?, childIin?, source?, notes?, assignedTo?}`. Старт `new`.         |
| GET   | `/admin/enrollments/:id`            | Детали + `log` (enrollment_status_log). Response: `{enrollment, log[]}`.                                                           |
| PATCH | `/admin/enrollments/:id`            | Обновить данные. Все поля optional. 409 если статус locked (card_created/cancelled/archive).                                       |
| POST  | `/admin/enrollments/:id/transition` | Сменить статус. `{toStatus*, comment?, currentGroupId?}`. При `card_created` — создаёт ребёнка/guardian/invoice, возвращает child. |
| POST  | `/admin/enrollments/:id/assign`     | Назначить ответственного `{assignedTo: staff_member_uuid}`. 409 если archived.                                                     |

**Страницы:**

- **Доска/список лидов** — лучше канбан по статусам (Новая / В обработке / Лист ожидания / Создана карточка / Отменён / Архив) либо таблица с фильтром. Карточка лида: контакт, ребёнок, источник, ответственный, дата смены статуса.
- **Карточка лида** — данные контакта и ребёнка (ФИО ребёнка*, возраст/DOB*, основной законный представитель*: ФИО*, телефон*, связь с ребёнком*), выбор группы, кнопки смены статуса (с подтверждением), назначение ответственного, лог статусов (`enrollment_status_log`: from→to, кто, коммент, когда).
- Логика: при переводе в `card_created` показать результат (создан ребёнок + первый счёт), задизейблить недопустимые переходы по state machine. «Лист ожидания» — когда нет мест.
- Дополнение: создать карточку ребёнка можно и в обход лида — `POST /admin/children` (для перевода из другого садика / офлайн-договора).

---

## 7. Группы (Groups) — `/admin/groups/*`

**Назначение:** группы садика, менторы, локация, дети. BP §3 (mentor↔group), §12.3.

> **Фактический контракт (подтверждено по live `/docs-json` 2026-05-19, §A12):**
>
> - **Префикс:** `/groups/*` — **БЕЗ сегмента `/admin`** (в отличие от staff). snake_case request + response (per-module, прецедент §A8).
> - **Пагинация:** `GET /groups` — **plain array** `GroupDto[]` (НЕ offset/page). Filter: `?archived=<bool>`.
> - **GroupDto:** `{id, kindergarten_id, name, capacity, age_range_min(nullable), age_range_max(nullable), current_location_id(nullable UUID), archived_at(nullable), created_at, updated_at}`. `GET /groups/:id` возвращает **только GroupDto** — НЕ агрегирует менторов/локацию (имя ментора/локации резолвится отдельно: ментор — §A12.5 ниже + Staff §8; локация — нет endpoint, B14, деградирует, §C8).
> - **CreateGroupDto:** `{name*, capacity*, age_range_min?, age_range_max?, current_location_id?}`. **UpdateGroupDto:** все опц., nullable (`age_range_min/age_range_max/current_location_id`).
> - **Archive/Restore (НЕ deactivate):** `POST /groups/:id/archive` → GroupDto (`archived_at` set); `POST /groups/:id/restore` → GroupDto. Отдельного deactivate/activate нет. Enforce-на-archive `group_has_active_children`(409) — не подтверждён live, FE обрабатывает defensive (§C10).
> - **Менторы — на группе, НЕ на staff:** `POST /groups/:id/mentor {staff_member_id}` → GroupMentorDto; `DELETE /groups/:id/mentor` (снимает активного); `GET /groups/:id/mentor` → **один активный** GroupMentorDto; `GET /groups/:id/mentor-history` → GroupMentorDto[]. **GroupMentorDto:** `{id, kindergarten_id, group_id, staff_member_id, is_primary, assigned_at, unassigned_at(nullable), created_at}`. API-поверхность экспонирует **ровно одного активного ментора** на группу; отдельного make-primary endpoint нет (`is_primary` read-only из DTO) — multi-mentor/assistant/«сделать primary» прототипа не поддержаны live (§C9).
> - **Дети группы:** отдельного `/groups/:id/children` нет — `GET /children?current_group_id=:id` (B4).

| Метод  | Путь                         | Назначение                                                                                   |
| ------ | ---------------------------- | -------------------------------------------------------------------------------------------- |
| GET    | `/groups?archived=`          | Список `GroupDto[]` (plain array).                                                           |
| POST   | `/groups`                    | Создать `{name*, capacity*, age_range_min?, age_range_max?, current_location_id?}` (мес.).   |
| GET    | `/groups/:id`                | GroupDto (без агрегации менторов/локации).                                                   |
| PATCH  | `/groups/:id`                | Обновить (все опц., nullable).                                                               |
| POST   | `/groups/:id/archive`        | Архивировать → GroupDto (`archived_at`). `group_has_active_children`(409) — defensive, §C10. |
| POST   | `/groups/:id/restore`        | Восстановить → GroupDto.                                                                     |
| POST   | `/groups/:id/mentor`         | Назначить активного ментора `{staff_member_id}` → GroupMentorDto.                            |
| DELETE | `/groups/:id/mentor`         | Снять активного ментора.                                                                     |
| GET    | `/groups/:id/mentor`         | Текущий активный ментор → GroupMentorDto.                                                    |
| GET    | `/groups/:id/mentor-history` | История менторов `GroupMentorDto[]`.                                                         |

**Ошибки:** `group_not_found`(404), `group_has_active_children`(409, enforcement-on-archive не подтверждён — §C10), `invalid_age_range`(400, min≥max), `location_not_found`(404).

**Инварианты mentor↔group (показывать в UI):** один mentor = ровно одна активная группа; у группы — **ровно один активный ментор** (live-поверхность singular); `is_primary` — read-only из GroupMentorDto. Прототипный multi-mentor/assistant и явный «сделать primary» live не поддержаны (§C9) — UI показывает одного активного ментора + информативный баннер-инвариант.

**Страницы:**

- **Список групп** — карточки/таблица: название, возраст (мес.), вместимость vs кол-во активных детей (прогресс/индикатор переполнения), локация (деградирует — §C8), активный ментор (имя резолвится через Staff §8), статус (`archived_at`). Кнопка «Создать группу».
- **Карточка группы** (табы): _Обзор_ (поля + edit; локация деградирует §C8), _Воспитатели_ (один активный: назначить/снять через `/groups/:id/mentor`; multi/primary §C9), _Дети_ (`/children?current_group_id=`), _История воспитателей_. Кнопка «Деактивировать» → `archive` (с defensive-обработкой 409 — подсказать «переведите детей», §C10); «Восстановить» → `restore`.

---

## 8. Сотрудники (Staff) — `/admin/staff/*`

**Назначение:** сотрудники садика, роли, назначение менторов на группы. BP §3.

**Роли (`staff_role`):** `admin`, `mentor`, `specialist`, `reception`. `specialist_type` whitelist: `psychologist, speech_therapist, music_teacher, physical_ed, nutritionist`.

> **Фактический контракт (подтверждено по live `/docs-json` 2026-05-19, §A13):**
>
> - **Префикс:** `/admin/staff/*` — **С сегментом `/admin`** (в отличие от groups). snake_case request + response.
> - **Пагинация:** `GET /admin/staff` — **plain array** `StaffMemberDto[]` (НЕ offset/page). Filters: `role`, `is_active(bool)`, `specialist_type`, `archived(bool)`, **`search`** (строка — НЕ `q`).
> - **StaffMemberDto:** `{id, kindergarten_id, user_id, full_name(nullable), phone(nullable), role(enum), specialist_type(nullable string), is_active(bool), hired_at(nullable), fired_at(nullable), archived_at(nullable), created_at, updated_at}`. (`full_name`/`phone` nullable — UI деградирует «—», не выдумывает.)
> - **CreateStaffDto:** `{full_name*, phone*, role*, specialist_type?, hired_at?}` — **БЕЗ `group_id`**. Привязка mentor↔group НЕ атомарна с созданием: создать staff → затем `POST /groups/:id/mentor {staff_member_id}` (§7). UI делает это 2 шага (non-atomic, §C12). find-or-create user по phone; welcome-SMS best-effort.
> - **UpdateStaffDto:** `{full_name?, role?, specialist_type?(nullable), hired_at?(nullable), fired_at?(nullable)}`. role×specialist_type валидируется backend.
> - **Lifecycle:** `POST /admin/staff/:id/deactivate|activate` **и дополнительно** `POST /admin/staff/:id/archive|restore` — все → StaffMemberDto.
> - **Нет staff-side group endpoints:** `/admin/staff/:id/groups/assign` и `.../primary` НЕ существуют; нет reverse `staff→groups` листинга. Mentor-назначения управляются через §7 `/groups/:id/mentor`; список текущих групп ментора из контракта недоступен — UI деградирует (§C11). Make-primary endpoint отсутствует (§C9).

| Метод | Путь                          | Назначение                                                                                         |
| ----- | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| GET   | `/admin/staff`                | Список `StaffMemberDto[]`. Filters `role, is_active, specialist_type, archived, search`.           |
| POST  | `/admin/staff`                | Создать `{full_name*, phone*, role*, specialist_type?, hired_at?}` (без group_id). find-or-create. |
| GET   | `/admin/staff/:id`            | StaffMemberDto (без `assigned_groups[]` — reverse staff→groups нет).                               |
| PATCH | `/admin/staff/:id`            | `{full_name?, role?, specialist_type?(null), hired_at?(null), fired_at?(null)}`.                   |
| POST  | `/admin/staff/:id/deactivate` | `is_active=false` → StaffMemberDto. Повторно → 409 `staff_inactive`.                               |
| POST  | `/admin/staff/:id/activate`   | `is_active=true` → StaffMemberDto. НЕ восстанавливает прошлые назначения.                          |
| POST  | `/admin/staff/:id/archive`    | Архивировать → StaffMemberDto.                                                                     |
| POST  | `/admin/staff/:id/restore`    | Восстановить → StaffMemberDto.                                                                     |

**Ошибки:** `staff_not_found`(404), `staff_phone_conflict`(409, уже активный staff), `staff_inactive`(409), `invalid_specialist_type`(400), `role_not_assignable`(400, напр. specialist без specialist_type), `mentor_one_active_group_violation`(409), `group_primary_conflict`(409), `group_not_found`(404).

**Активация:** отдельного invite/magic-link нет — сотрудник входит в Staff App обычным OTP по своему телефону; welcome-SMS отправляется автоматически.

**Страницы:**

- **Список сотрудников** — таблица: ФИО (nullable «—»), телефон (nullable «—»), роль (бейдж), specialist_type, группы (для mentor — деградирует «—», reverse-endpoint нет, §C11), статус. Фильтры `role/is_active/specialist_type/search`. Кнопка «Добавить сотрудника».
- **Форма создания** — ФИО*, телефон* (E.164), роль*; динамически: `mentor` → выбор группы (опц., 2-шаговый non-atomic assign §C12); `specialist` → `specialist_type`* из whitelist; `reception`/`admin` → без группы/типа. Дата найма. 409 `staff_phone_conflict`.
- **Карточка сотрудника** — данные + edit; для mentor — назначить в группу (через `/groups/:id/mentor`; текущие назначения из контракта недоступны, блок деградирует §C11; make-primary нет §C9); кнопки активировать/деактивировать (+ archive/restore доступны контрактом); «Отозвать все QR» (§23, по `user_id`).

---

## 9. Структура садика — Локации и Камеры

### 9.1 Локации — `/admin/locations/*`

| Метод  | Путь                   | Назначение                                                                    |
| ------ | ---------------------- | ----------------------------------------------------------------------------- |
| GET    | `/admin/locations`     | Список.                                                                       |
| POST   | `/admin/locations`     | `{name, description?}`.                                                       |
| PATCH  | `/admin/locations/:id` | `name?, description?`.                                                        |
| DELETE | `/admin/locations/:id` | Hard delete. Пречек FK (группы/камеры/события/слоты) → 409 `location_in_use`. |

Ошибки: `location_not_found`(404), `location_in_use`(409).

### 9.2 Камеры (CCTV-конфиг) — `/admin/cameras/*`

| Метод  | Путь                      | Назначение                                                                      |
| ------ | ------------------------- | ------------------------------------------------------------------------------- |
| GET    | `/admin/cameras`          | Список (+ relation `location`). Фильтр `?location_id=`.                         |
| POST   | `/admin/cameras`          | `{location_id, name, stream_url?}` (RTSP формируется backend, если не передан). |
| PATCH  | `/admin/cameras/:id`      | `name?, stream_url?, location_id?`.                                             |
| DELETE | `/admin/cameras/:id`      | Hard delete.                                                                    |
| POST   | `/admin/cameras/:id/test` | **Отложено (Phase C / B20)** — не реализовано, в Swagger нет.                   |

Ошибки: `camera_not_found`(404), `location_not_found`(404).

**Страницы:** CRUD-таблицы Локаций и Камер (можно одной страницей «Структура садика» с двумя вкладками). Камеры группируются по локациям. Кнопку «Тест камеры» спроектировать как заглушку с подписью «доступно позже» (Phase C).

---

## 10. Расписание (Schedule) — `/admin/schedule/*`

**Назначение:** недельные шаблоны расписания групп + конкретные события. BP §9.3.

**Модель:** `schedule_templates` (недельный паттерн группы, `valid_from/until`, `recurrence=weekly`) → `schedule_template_slots` (день недели × время × активность) → проекция в `activity_events` (dated). `schedule_week_snapshots` — флаг наличия недели.

| Метод  | Путь                                          | Назначение                                                                                               |
| ------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| GET    | `/admin/schedule/templates`                   | `?group_id=&is_active=`. `[{id,name,group_id,recurrence,is_active,valid_from,valid_until,slots_count}]`. |
| POST   | `/admin/schedule/templates`                   | `{group_id?, name, recurrence='weekly', valid_from, valid_until?}`.                                      |
| PATCH  | `/admin/schedule/templates/:id`               | `name?, is_active?, valid_until?`.                                                                       |
| GET    | `/admin/schedule/templates/:id/slots`         | Слоты (сорт. day_of_week, start_time).                                                                   |
| POST   | `/admin/schedule/templates/:id/slots`         | `{day_of_week(mon..sun), start_time, end_time, activity_name, location_id?, description?}`.              |
| PATCH  | `/admin/schedule/templates/:id/slots/:slotId` | Обновить слот.                                                                                           |
| DELETE | `/admin/schedule/templates/:id/slots/:slotId` | Удалить слот.                                                                                            |
| GET    | `/admin/schedule/week-snapshots`              | `?group_id=&week_start_date_from=&week_start_date_to=`.                                                  |
| POST   | `/admin/schedule/week-snapshots/copy`         | `{group_id, source_week_start_date}` — копия расписания на следующую неделю. Идемпотентно.               |
| GET    | `/admin/schedule/activity-events`             | `?group_id=&date_from=&date_to=&status=`.                                                                |
| POST   | `/admin/schedule/week-rollout/run`            | Ручной общий rollout (super_admin scope в реале; админ видит результат).                                 |

Ошибки: `schedule_template_not_found`(404), `slot_not_found`(404), `slot_time_conflict`(409, дубль `(template,day,start_time)`), `source_week_snapshot_not_found`(404), `invalid_date_range`(400), `group_not_found`(404), `location_not_found`(404).

**Страницы:**

- **Шаблоны расписания** — список по группам, создание шаблона.
- **Редактор шаблона** — недельная сетка (пн–вс × время), добавление/редактирование слотов (время начала/конца, активность, локация, описание). Конфликт времени → inline-ошибка.
- **Недельный обзор** — какие недели имеют расписание (week-snapshots), кнопка «Скопировать на следующую неделю». Просмотр `activity_events` по диапазону дат (календарь/список, статусы scheduled/in_progress/completed/cancelled — read-only для админа; переключают статусы менторы в Staff App).

---

## 11. Меню (Meal Plans) — `/admin/meal-plans/*`

**Назначение:** структурированное меню по дням. BP §9.2.

**Модель:** `meal_plans` (один день, опц. группа; уникальность `(kg,date,group_id)`, `group_id=NULL` = общесадиковое) → `meal_items` (`meal_type`: breakfast/snack_am/lunch/snack_pm/dinner; `dish_name {ru,kz}`, `description`, `allergens[]`, `calories`, `photo_url`).

| Метод  | Путь                                  | Назначение                                                                                    |
| ------ | ------------------------------------- | --------------------------------------------------------------------------------------------- |
| GET    | `/admin/meal-plans`                   | `?date_from=&date_to=&group_id=`. С `items[]` вложенно.                                       |
| POST   | `/admin/meal-plans`                   | `{date, group_id?}`. 409 `meal_plan_already_exists`.                                          |
| PATCH  | `/admin/meal-plans/:id`               | `is_published?, notes?`.                                                                      |
| DELETE | `/admin/meal-plans/:id`               | Каскадно удаляет items.                                                                       |
| POST   | `/admin/meal-plans/:id/items`         | `{meal_type, dish_name:{ru,kz}, description?, allergens?, calories?, photo_url?, position?}`. |
| PATCH  | `/admin/meal-plans/:id/items/:itemId` | Обновить блюдо.                                                                               |
| DELETE | `/admin/meal-plans/:id/items/:itemId` | Удалить блюдо.                                                                                |
| POST   | `/admin/meal-plans/copy-week`         | `{source_week_start_date}` — копия ПН–ПТ на следующую неделю. Идемпотентно.                   |

Ошибки: `meal_plan_not_found`(404), `meal_plan_already_exists`(409), `meal_item_not_found`(404), `invalid_meal_type`(400), `group_not_found`(404).

**Страницы:** недельный/месячный вид меню (выбор группы или «весь садик»), редактор дня (5 приёмов пищи, для каждого — список блюд с ru/kz названиями, аллергенами, калориями, фото), кнопка «Скопировать неделю», флаг публикации. Авто-копирование на след. неделю делает cron — UI показывает источник `manual`/`auto_copied_from_previous_week`.

---

## 12. Контент (Content) — `/admin/content/*` + Qundylyq

**Назначение:** новости, Qundylyq, поздравления, публикации меню/расписания. BP §9.

**ENUM:** `content_type`: `news|menu|schedule_pub|qundylyq|birthday`; `content_target_type`: `all|group|child`; `content_status`: `draft|scheduled|published`.
**Инвариант таргетинга:** `child`→`target_child_id` обязателен; `group`→`target_group_id` обязателен; `all`→оба null.
**State machine:** `draft → scheduled → published` (только вперёд; published терминальный; удаление только из draft; PATCH только из draft/scheduled).

| Метод  | Путь                          | Назначение                                               |
| ------ | ----------------------------- | -------------------------------------------------------- |
| POST   | `/admin/content`              | Создать черновик. `multipart/form-data` (см. поля ниже). |
| GET    | `/admin/content`              | Список + фильтры + cursor-пагинация.                     |
| GET    | `/admin/content/:id`          | Детали.                                                  |
| PATCH  | `/admin/content/:id`          | Обновить (draft/scheduled). multipart.                   |
| DELETE | `/admin/content/:id`          | Удалить (только draft).                                  |
| POST   | `/admin/content/:id/publish`  | Немедленная публикация (draft/scheduled → published).    |
| POST   | `/admin/content/:id/schedule` | `{scheduled_for}` (draft → scheduled).                   |
| GET    | `/admin/qundylyq/current`     | Текущий активный Qundylyq (или null).                    |

**POST /admin/content (multipart):** `content_type*`, `target_type*`, `target_group_id?`, `target_child_id?`, `title_i18n?` (JSON-строка `{ru,kz}`), `body_i18n?`, `scheduled_for?` (ISO), `metadata?` (JSON-строка), `file?` (image/video).

**GET /admin/content query:** `content_type, status, target_type, target_group_id, target_child_id, scheduled_from/to, published_from/to, cursor, limit(≤100, def 20)`.

**Ошибки:** `file_upload_error`(400), `media_type_invalid`(400, не image/video), `content_post_not_found`(404), `content_post_status_invalid`(409), `content_target_invalid`(422), 422 validation.

**Страницы:**

- **Лента контента** — таблица/карточки: тип, заголовок (по локали), таргет, статус-бейдж (draft/scheduled/published), дата публикации/планирования. Фильтры. Cursor-пагинация.
- **Редактор поста** — выбор типа, таргет (all/группа/ребёнок — динамические селекты), title/body на ru+kz, медиа (загрузка файла), кнопки: Сохранить черновик / Запланировать (datepicker → schedule) / Опубликовать сейчас. Удаление только для draft.
- **Qundylyq** — отдельный экран «тема месяца» (создаётся как content_type=qundylyq), показывает текущий активный.
- День рождения — посты `birthday` авто-генерируются cron'ом; админ видит список и может опубликовать заранее запланированный.

---

## 13. Биллинг: Счета и Оплаты — `/admin/invoices/*`, `/admin/payments/*`

**Назначение:** просмотр и ручные операции по начислениям. BP §4. (Read + ручные действия; провайдер на Phase A — Mock.)

**State machine инвойса:** `pending → {partial, paid, overdue, refunded, cancelled}`. Платежи (`payments`): `initiated → {processing, completed, failed, refunded}`.

| Метод | Путь                                   | Назначение                                                                                                                                                                       |
| ----- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET   | `/admin/invoices`                      | `?status=&due_date=&child_id=&invoice_type=`. Полные поля инвойса.                                                                                                               |
| GET   | `/admin/invoices/:id`                  | + `invoice_line_items` + `payments`, `refunds`, `fiscal_receipts`, применённые скидки.                                                                                           |
| POST  | `/admin/invoices`                      | Разовое начисление: `{child_id, invoice_type, amount_due, due_date, description?, period_start?, period_end?, line_items?:[{description,tariff_plan_id?,quantity,unit_price}]}`. |
| POST  | `/admin/invoices/:id/manual-mark-paid` | Отметить оплату наличкой (`payments provider='cash' completed`). 409 `invoice_already_paid`.                                                                                     |
| POST  | `/admin/invoices/:id/cancel`           | Отменить (только pending/partial). 409 `invoice_status_invalid`.                                                                                                                 |
| GET   | `/admin/payments`                      | `?provider=&status=&child_id=&from=&to=`.                                                                                                                                        |
| GET   | `/admin/payments/:id`                  | Детали + `provider_payload`.                                                                                                                                                     |

Ошибки: `invoice_not_found`(404), `child_not_found`(404), `invoice_already_paid`(409), `invoice_status_invalid`(409), 422 validation.

**Страницы:**

- **Счета** — таблица: ребёнок, тип, период, сумма (amount_due / после скидки), статус-бейдж, due_date. Фильтры. Кнопка «Создать начисление».
- **Карточка счёта** — позиции (line items), связанные оплаты/возвраты/фискальные чеки/скидки, действия: «Отметить оплату наличными», «Отменить счёт» (с подтверждением, обработкой 409).
- **Оплаты** — таблица: ребёнок, сумма, провайдер, статус, дата. Детали платежа (provider_payload — для саппорта).

---

## 14. Биллинг: Тарифы — `/admin/tariff-plans/*`, `/admin/tariff-assignments/*`

| Метод | Путь                                 | Назначение                                                                                                                                                                                                                                                                                                                                 |
| ----- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET   | `/admin/tariff-plans`                | `?is_active=&tariff_type=`.                                                                                                                                                                                                                                                                                                                |
| POST  | `/admin/tariff-plans`                | `{name, tariff_type(monthly_base/additional_service/late_pickup/meal_upgrade), amount, currency?=KZT, applies_to(child/group/age_range), age_min_months?, age_max_months?, group_id?, discount_rules?:{sibling_discount_pct?,prepay_3m_pct?,prepay_6m_pct?,prepay_12m_pct?,prepay_24m_pct?,benefit_category?}, valid_from, valid_until?}`. |
| PATCH | `/admin/tariff-plans/:id`            | `name?, description?, amount?, discount_rules?, valid_until?` (нельзя менять type/applies_to/group_id).                                                                                                                                                                                                                                    |
| POST  | `/admin/tariff-plans/:id/deactivate` | `is_active=false`.                                                                                                                                                                                                                                                                                                                         |
| GET   | `/admin/tariff-assignments`          | `?child_id=&tariff_plan_id=&active_on=`.                                                                                                                                                                                                                                                                                                   |
| POST  | `/admin/tariff-assignments`          | `{child_id, tariff_plan_id, custom_amount?, custom_reason?, valid_from, valid_until?}`.                                                                                                                                                                                                                                                    |
| PATCH | `/admin/tariff-assignments/:id`      | `custom_amount?, custom_reason?, valid_until?`.                                                                                                                                                                                                                                                                                            |

Ошибки: `tariff_plan_not_found`(404), `tariff_assignment_not_found`(404), `tariff_plan_inactive`(409), `tariff_assignment_overlap`(409), `tariff_plan_overlap`(409).

**Страницы:** Тарифные планы (список + создание/редактирование, конструктор `discount_rules`, деактивация). Назначения тарифов (на ребёнка, период, льготная сумма `custom_amount`/`custom_reason`). После реактивации ребёнка — флоу «назначить новый тариф».

---

## 15. Биллинг: Праздники — `/admin/holidays/*`

Используются для pro-rata расчёта (дни с `is_billable=false` не тарифицируются).

| Метод  | Путь                  | Назначение                                                      |
| ------ | --------------------- | --------------------------------------------------------------- |
| GET    | `/admin/holidays`     | `?year=&month=`.                                                |
| POST   | `/admin/holidays`     | `{date, name:{ru,kz}, is_billable?=false}`. UNIQUE `(kg,date)`. |
| PATCH  | `/admin/holidays/:id` | `name?, is_billable?`.                                          |
| DELETE | `/admin/holidays/:id` | `204`.                                                          |

Ошибки: `holiday_already_exists`(409), `holiday_not_found`(404).

**Страница:** календарь/список праздников по году/месяцу, флаг «тарифицируется ли день», CRUD.

---

## 16. Биллинг: Возвраты — `/admin/refunds/*`

**State machine:** `pending → approved → processed` | `pending → rejected`.

| Метод | Путь                         | Назначение                                                                       |
| ----- | ---------------------------- | -------------------------------------------------------------------------------- |
| GET   | `/admin/refunds`             | `?status=&payment_id=`.                                                          |
| GET   | `/admin/refunds/:id`         | Детали.                                                                          |
| POST  | `/admin/refunds`             | `{payment_id, amount, reason}`. Чек: payment completed, amount ≤ payment.amount. |
| POST  | `/admin/refunds/:id/approve` | pending → approved.                                                              |
| POST  | `/admin/refunds/:id/reject`  | `{reason}` (1..500). pending → rejected.                                         |
| POST  | `/admin/refunds/:id/process` | approved → processed (через провайдера; правит payment/invoice/баланс).          |

Ошибки: `refund_not_found`(404), `payment_not_found`(404), `refund_already_processed`(409).

**Контекст:** pro-rata refund при архивации ребёнка создаётся автоматически (`status=pending`, reason `pro_rata_archive`) — админ его видит здесь и проводит через approve→process вручную.

**Страница:** список возвратов (статус-бейджи, причина, сумма), детали, кнопки approve/reject(с причиной)/process в зависимости от текущего статуса.

---

## 17. Биллинг: Фискальные чеки — `/admin/fiscal-receipts/*` (ОФД РК)

> **Статус:** на Phase A (B13) — **read-only stub**. Список строк `fiscal_receipts` (Mock, все `queued`/`mock_*`). Полный CRUD/retry/queue/report — **B15 (Phase B, отложено)**.

| Метод | Путь                                    | Батч | Назначение                                                |
| ----- | --------------------------------------- | ---- | --------------------------------------------------------- |
| GET   | `/admin/fiscal-receipts`                | B13  | Список (фильтр `status,provider,payment_id,fiscal_sign`). |
| GET   | `/admin/fiscal-receipts/:id`            | B15  | Детали + `ofd_payload`.                                   |
| POST  | `/admin/fiscal-receipts/:id/retry`      | B15  | Ручной retry failed.                                      |
| GET   | `/admin/fiscal-receipts/queue`          | B15  | Очередь pending/failed + ошибки.                          |
| GET   | `/admin/fiscal-receipts/report/monthly` | B15  | Месячный отчёт.                                           |

**Страница:** только список (read-only) с фильтрами; экраны retry/queue/report — заложить в дизайн как «доступно в Phase B» (заглушка).

---

## 18. Биллинг: Кастомные скидки — `/admin/custom-discounts/*`

**Назначение:** конструктор праздничных/льготных/промо-скидок. BP §4.1. **State machine:** `draft → active → paused ↔ active | cancelled; active/paused → expired (cron)`.

| Метод | Путь                                       | Назначение                                                                                                                                                                                                                                                               |
| ----- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET   | `/admin/custom-discounts`                  | Список (фильтр статус/период).                                                                                                                                                                                                                                           |
| POST  | `/admin/custom-discounts`                  | Создать (draft): `name{ru,kz}, description, discount_type(percentage/fixed_amount), amount, conditions(JSONB), target_type+target_ids[], valid_from/until, max_uses_per_child, total_max_uses, priority, stackable, notify_on_activation, notification_title/body_i18n`. |
| GET   | `/admin/custom-discounts/:id`              | Детали + статистика применений.                                                                                                                                                                                                                                          |
| PATCH | `/admin/custom-discounts/:id`              | Обновить (только draft).                                                                                                                                                                                                                                                 |
| POST  | `/admin/custom-discounts/:id/activate`     | draft → active. Если `notify_on_activation` — push родителям.                                                                                                                                                                                                            |
| POST  | `/admin/custom-discounts/:id/pause`        | active → paused.                                                                                                                                                                                                                                                         |
| POST  | `/admin/custom-discounts/:id/resume`       | paused → active.                                                                                                                                                                                                                                                         |
| POST  | `/admin/custom-discounts/:id/cancel`       | → cancelled (финал).                                                                                                                                                                                                                                                     |
| GET   | `/admin/custom-discounts/:id/applications` | Лог применений (`invoice_id, child_id, amount_applied`).                                                                                                                                                                                                                 |

**Типы условий (`conditions` JSONB):** `prepayment_months`, `siblings_count`, `age_range`, `benefit_category`, `payment_method`, `early_payment`, `birthday_month`, `date_range`, `first_invoice`, плюс композиты `all_of`/`any_of`. Таргет: `all|groups|children|tariff_types|age_range`.

**Страницы:**

- **Список скидок** — статус-бейджи (draft/active/paused/expired/cancelled), период, использований (`used_count` / лимиты).
- **Конструктор скидки** — визуальный билдер условий (each condition type → форма; AND/OR композиция), таргетинг (мультиселект групп/детей/тарифов/возраст), период, лимиты, приоритет+stackable, текст push (ru/kz). Кнопки по state machine: Активировать / Пауза / Возобновить / Отменить (необратимо — подтверждение).
- **Статистика применения** — таблица `applications` (какому ребёнку/счёту, сумма). Превью «N детей попадут» считается на клиенте через applications (dry-run preview backend отложен).

---

## 19. Заявки родителей — `/admin/parent-requests/*`

**Назначение:** обработка заявок (доверенное лицо, выходные, поздний забор, отпуск, открытое обращение). BP §6. Админ видит **все** заявки садика. **State machine:** `pending → accepted | rejected | cancelled` (терминальные, race-guarded).

| Метод | Путь                                  | Назначение                                                                                                                                                                                        |
| ----- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET   | `/admin/parent-requests`              | Все заявки. Фильтр `status,request_type,child_id,group_id,recipient_type`. **Cursor-paged** `(created_at DESC, id DESC)`; `next_cursor` base64; невалидный → 400 `parent_request_cursor_invalid`. |
| GET   | `/admin/parent-requests/:id`          | Детали + `parent_request_messages` (тред).                                                                                                                                                        |
| POST  | `/admin/parent-requests/:id/accept`   | `{review_note?}`. Conditional UPDATE WHERE pending; 409 при гонке.                                                                                                                                |
| POST  | `/admin/parent-requests/:id/reject`   | `{review_note?}`.                                                                                                                                                                                 |
| POST  | `/admin/parent-requests/:id/messages` | Ответить в треде `{body, attachments?}`.                                                                                                                                                          |
| GET   | `/admin/parent-requests/:id/messages` | Список сообщений (cursor-paged).                                                                                                                                                                  |

**Типы (`request_type`):** `trusted_person, day_off (ребёнок остаётся в саду в выходной), vacation (ребёнок НЕ ходит), late_pickup (генерит late_pickup_fee invoice при accept), open_request`. Семантика day_off vs vacation — не путать.

**Страница:** список заявок (тип-бейдж, ребёнок, статус, дата, получатель), фильтры, cursor-пагинация. Детальная: данные заявки по типу (`details` JSONB различается), двусторонний тред сообщений (родитель ↔ staff/admin, вложения), кнопки Принять/Отклонить (с review_note), поле ответа в тред. Ошибки: `parent_request_not_found`(404), `parent_request_already_processed`(409).

---

## 20. Посещаемость — `/admin/attendance-events/*`, `/admin/daily-status/*`

**Назначение:** журнал посещаемости, корректировки, сводка дневных статусов. BP §5.

| Метод | Путь                           | Назначение                                                      |
| ----- | ------------------------------ | --------------------------------------------------------------- |
| GET   | `/admin/attendance-events`     | Лог check-in/out. Фильтр `child_id, method, диапазон дат`.      |
| PATCH | `/admin/attendance-events/:id` | Корректировка `recorded_at, notes, pickup_user_id`.             |
| GET   | `/admin/daily-status`          | Сводка `child_daily_status` на дату по садику.                  |
| GET   | `/admin/daily-status/summary`  | Агрегированная сводка отсутствий (для заявок vacation/day_off). |

`attendance_method`: `face_id|manual|otp_pickup`. `child_intraday_status`: `present|absent|sick|late|early_pickup|on_vacation`.

**Страница:** журнал событий (фильтр по ребёнку/методу/дате), редактирование записи (модал: время, заметка, кто забрал). Доска дневного статуса на дату (по группам), сводка отсутствий.

---

## 21. Диагностика: Шаблоны — `/admin/diagnostic-templates/*`

**Назначение:** настройка форм диагностики по специализациям (специалисты заполняют в Staff App). BP §8.

| Метод | Путь                                         | Назначение                                                                                                                                                                        |
| ----- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------- | ------ | ----------- | ---- | ------- |
| GET   | `/admin/diagnostic-templates`                | `?specialist_type=&is_active=`.                                                                                                                                                   |
| POST  | `/admin/diagnostic-templates`                | `{specialist_type, name, description?, schema}`. schema JSONB: `{sections:[{title, fields:[{key,label,type,required,options?,min?,max?}]}]}`, `type: text                         | number | boolean | select | multiselect | date | scale`. |
| GET   | `/admin/diagnostic-templates/:id`            | Детали.                                                                                                                                                                           |
| PATCH | `/admin/diagnostic-templates/:id`            | Обновить (auto-bump version при изменении schema). Если есть записи против шаблона → 409 `template_has_entries` (schema-изменение блокируется; name/description/is_active можно). |
| POST  | `/admin/diagnostic-templates/:id/deactivate` | `is_active=false`.                                                                                                                                                                |

**Страница:** список шаблонов по типам специалистов, **конструктор формы** (секции → поля разных типов с required/options/min/max), версионирование, деактивация. Предупреждать: после появления заполненных записей schema менять нельзя (409) — только клонировать/новую версию.

---

## 22. Face ID — `/admin/face-profiles/*`, `/admin/face-enrollment-consents/*`

> **Статус:** admin-эндпоинты конфигурации существуют; фактическое распознавание/обработка видео — face-service на **edge (Phase C, B19, отложено)**. На Phase A enrollment поставит задачу в очередь, но embeddings не сгенерируются (face-service нет). Дизайн делать, к данным подключать осторожно — пометить как Phase C.

| Метод  | Путь                                         | Назначение                                                                                                             |
| ------ | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| GET    | `/admin/face-profiles`                       | Список (фильтр `subject_type,subject_id`).                                                                             |
| POST   | `/admin/face-enrollment-consents`            | Зафиксировать согласие до enrollment: `{subject_type(child/guardian/staff), subject_id, signature_url(S3 key скана)}`. |
| GET    | `/admin/face-enrollment-consents`            | Список (фильтр `subject_type,subject_id,revoked`).                                                                     |
| POST   | `/admin/face-enrollment-consents/:id/revoke` | Отзыв (`revoked_at, revoke_reason`) + деактивация связанного профиля.                                                  |
| POST   | `/admin/face-profiles/enroll`                | `{subject_type, subject_id, video_key(presigned), consent_id(обязателен, активный)}`.                                  |
| POST   | `/admin/face-profiles/:id/re-enroll`         | Новый video_key.                                                                                                       |
| DELETE | `/admin/face-profiles/:id`                   | Удалить профиль.                                                                                                       |
| POST   | `/admin/face-profiles/:id/deactivate`        | `is_active=false`.                                                                                                     |
| GET    | `/admin/face-recognition-events`             | Лог распознаваний (фильтр `camera_device_id,status,дата`).                                                             |

**Логика обязательна:** enrollment **только** после офлайн-фиксации consent (закон РК о биометрии). UI: сначала загрузить скан подписанного согласия → создать consent → потом enroll (видео 5–10 сек). Без активного consent enroll запрещён.

**Страница:** список face-профилей по subject, журнал согласий (создать/отозвать с причиной), форма enrollment (выбор subject + загрузка видео + привязка consent), журнал событий распознавания. Везде пометка «обработка — Phase C».

---

## 23. Безопасность: отзыв Identity QR — `POST /admin/qr/revoke-all/:userId`

**Назначение:** массовый отзыв всех активных QR-токенов пользователя при подозрении на компрометацию. BP §13.

- Auth: admin scope. Target user должен быть активным `staff_member` в kg админа ИЛИ approved non-revoked `child_guardian` ребёнка из kg админа, иначе **403 `user_no_relationship_to_kindergarten`**. 404 `user_not_found`.
- Ответ: `{ revoked_count: number }`.
- **UI:** кнопка «Отозвать все QR» в карточке сотрудника (§8) и в карточке опекуна ребёнка (§5). Подтверждение действия + объяснение последствий (следующий скан старого QR вернёт 410).

---

## 24. Операции: Lifecycle DLQ — `/admin/lifecycle/failed-jobs/*`

**Назначение:** оператор разбирает упавшие фоновые задачи очереди `lifecycle` (сейчас — pro-rata refund). B22a.

| Метод | Путь                                     | Назначение                                                                                                                                                                               |
| ----- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET   | `/admin/lifecycle/failed-jobs`           | `?limit(≤200,def50)=&cursor=`. `{items:[{id,name,payload,failed_reason,attempts_made,timestamp,finished_on}], next_cursor?}`. Per-kg админ видит только свои (`payload.kindergartenId`). |
| POST  | `/admin/lifecycle/failed-jobs/:id/retry` | Пустое тело. `202 {enqueued:true, job_id}`.                                                                                                                                              |

Ошибки: `lifecycle_job_not_found`(404), `lifecycle_job_not_in_failed_state`(409), `forbidden`(403, чужой kg).

> Известный нюанс: исторически routes `/admin/*` могут быть заскоплены строго на роль `admin`; убедись на проде, что роль входящего пользователя проходит RBAC (если 403 для валидного админа — это backend-баг, эскалируй).

**Страница:** таблица упавших задач (job id, тип, payload, причина, попытки, время), кнопка «Повторить». Cursor-пагинация. Фильтр по садику серверный не реализован — показывай UUID/имя как есть.

---

## 25. Настройки садика — `/admin/kindergarten`

| Метод | Путь                  | Назначение                                                              |
| ----- | --------------------- | ----------------------------------------------------------------------- |
| GET   | `/admin/kindergarten` | Настройки своего садика (без чувствительных fiscal-ключей).             |
| PATCH | `/admin/kindergarten` | Обновить `name, address, phone, settings` (fiscal — только SuperAdmin). |

`settings` (JSONB): timezone, currency, late_pickup_fee_amount, otp_expiry_seconds, prepay-скидки, payment_grace_days. **Страница:** форма настроек садика (название, адрес, телефон, базовые настройки). Fiscal-поля показывать read-only/«управляется платформой».

---

## 26. Аналитика / Дашборд — `/admin/dashboard/*`

| Метод | Путь                                 | Ответ                                                                                                                                                  |
| ----- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET   | `/admin/dashboard/summary`           | `{active_children, enrollments_in_processing, invoices_overdue_count, invoices_overdue_amount, mtd_revenue, ytd_revenue, active_staff, active_groups}` |
| GET   | `/admin/dashboard/attendance-today`  | `{in_kindergarten, checked_out, absent, on_vacation, sick}`. Опц. `?group_id=`.                                                                        |
| GET   | `/admin/dashboard/payments-overview` | `?from=&to=` → `{paid:{count,amount}, pending:{...}, overdue:{...}, refunded:{...}}` + breakdown по provider.                                          |

**Страница (главная по входе):** KPI-карточки (дети/сотрудники/группы/лиды), посещаемость сегодня (донат: в саду/ушли/отсутствуют/отпуск/болеют), финансы (просрочка кол-во+сумма, выручка MTD/YTD), обзор оплат за период с разбивкой по провайдерам. Быстрые переходы в разделы.

---

## 27. Профиль и уведомления (cross-cutting)

| Метод     | Путь                                                  | Назначение                                         |
| --------- | ----------------------------------------------------- | -------------------------------------------------- |
| GET/PATCH | `/users/me`                                           | Профиль (ФИО, avatar, locale, iin, dob).           |
| GET       | `/users/me/qr`                                        | Личный Identity QR.                                |
| POST      | `/push-tokens` / DELETE `/push-tokens/:id`            | Регистрация web-push токена (опц. для админки).    |
| GET       | `/notifications`                                      | История `?unread_only=&limit=&cursor=&event_key=`. |
| POST      | `/notifications/:id/read` / `/notifications/read-all` | Прочитано.                                         |
| GET/PATCH | `/notifications/preferences`                          | Per-event push/in-app настройки.                   |

**UI:** меню пользователя (профиль, смена локали, выход), колокол уведомлений (счётчик непрочитанных, список, read-all), реал-тайм через WS (тосты на важные события садика: новая заявка, оплата, и т.д.).

---

## 28. Полная карта страниц (sitemap)

```
/login                         — телефон → OTP → (выбор садика если multi-role)
/                              — Дашборд (KPI, посещаемость, финансы)
/enrollments                   — Лиды (канбан/список)
/enrollments/:id               — Карточка лида + лог статусов
/children                      — Список детей
/children/new                  — Создать карточку
/children/:id                  — Карточка (табы: профиль/опекуны/группа+история/timeline/платежи/диагностика/статус-история/face)
/groups                        — Список групп
/groups/:id                    — Карточка группы (обзор/менторы/дети/история менторов)
/staff                         — Список сотрудников
/staff/:id                     — Карточка сотрудника (+ назначения, активация, отзыв QR)
/structure/locations           — Локации (CRUD)
/structure/cameras             — Камеры (CRUD; тест — заглушка)
/schedule/templates            — Шаблоны расписания
/schedule/templates/:id        — Редактор слотов
/schedule/weeks                — Недельные снапшоты + activity events
/meal-plans                    — Меню (неделя/месяц) + редактор дня
/content                       — Лента контента + редактор
/content/qundylyq              — Qundylyq (тема месяца)
/billing/invoices              — Счета
/billing/invoices/:id          — Карточка счёта
/billing/payments              — Оплаты
/billing/payments/:id          — Карточка платежа
/billing/tariff-plans          — Тарифные планы
/billing/tariff-assignments    — Назначения тарифов
/billing/holidays              — Праздники
/billing/refunds               — Возвраты
/billing/discounts             — Кастомные скидки (список)
/billing/discounts/new|:id     — Конструктор скидки + статистика
/billing/fiscal-receipts       — Фискальные чеки (read-only stub)
/parent-requests               — Заявки родителей
/parent-requests/:id           — Заявка + тред
/attendance                    — Журнал посещаемости
/attendance/daily-status       — Дневной статус / сводка отсутствий
/diagnostics/templates         — Шаблоны диагностики + конструктор
/face                          — Face-профили + согласия + enrollment (Phase C)
/operations/lifecycle-dlq      — Упавшие фоновые задачи
/settings                      — Настройки садика
/profile                       — Профиль, локаль, мой QR, уведомления
```

---

## 29. Статус backend по модулям (что готово / mock / отложено)

| Модуль                                              | Статус                  | Примечание для фронта                                                                                        |
| --------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Auth/OTP, профиль, QR                               | ✅ готово               | SMS — Mock (код в логах backend; whitelist-телефоны возвращают тест-код). Реальный SMS — Phase B.            |
| Зачисление, дети, группы, сотрудники, локации       | ✅ готово               | Полностью функционально.                                                                                     |
| Расписание, меню, контент, Qundylyq                 | ✅ готово               | Файлы — LocalFileStorageAdapter; URL берём из ответа (S3 — Phase B, URL поменяется).                         |
| Тарифы, счета, оплаты, праздники, возвраты, скидки  | ✅ готово               | Платёжный провайдер — **Mock** (детерминированный, без денег). Halyk ePay — Phase B (контракт не изменится). |
| Фискальные чеки                                     | ⚠️ read-only stub (B13) | Только список. Retry/queue/report — Phase B (B15). Дизайнить как заглушку.                                   |
| Заявки родителей, посещаемость, диагностика-шаблоны | ✅ готово               | —                                                                                                            |
| Lifecycle DLQ, отзыв QR, дашборд, настройки         | ✅ готово               | —                                                                                                            |
| Face ID (admin-конфиг)                              | ⚠️ Phase C              | Эндпоинты есть; распознавание/обработка видео — edge, отложено. UI как «доступно позже».                     |
| Камеры — тест/стриминг                              | ⚠️ Phase C              | CRUD-конфиг работает; `/test` и видеопоток — B20, отложено.                                                  |
| WebSocket события                                   | ✅ готово (B9)          | Диспетчер шлёт в `user:{id}`. Используй для тостов/инвалидации.                                              |

**Принцип:** контракты эндпоинтов на Phase B/C **не меняются** — можно строить весь фронт сейчас на Mock; реальные провайдеры подключатся прозрачно. Исключение: ширина DTO фискальных чеков (B13 stub vs B15 full) — закладывай расширяемость.

---

## 30. Чеклист готовности фронта к интеграции

1. Сгенерировать TS-типы из `/docs-json`; держать в синке (`pnpm gen:api` при каждом изменении Swagger).
2. Auth: OTP-flow + silent refresh + role-select + WS auth_error → разлогин.
3. Глобально: error-envelope маппинг на i18n, RU/KK переключатель + `x-custom-lang`, обработка 429/403/404, скелетоны/empty/error-состояния таблиц.
4. Реестр стабильных error-кодов (перечислены по разделам §5–§24) → i18n-сообщения.
5. Пагинация: offset vs cursor по эндпоинту (§2.5).
6. Загрузка файлов: presigned (3 шага) + multipart для контента.
7. Денежные/датовые форматтеры (KZT, ISO8601 → локальное время садика; timezone из `/admin/kindergarten` settings).
8. Заглушки для Phase B/C модулей (фискальные чеки full, Face, тест камер) — видимы, помечены «доступно позже».

_Документ производный. При расхождении первичны [`endpoints.md`](../endpoints.md), [`Shyraq BP.md`](../Shyraq%20BP.md), [`schema.dbml`](../schema.dbml). Обновлять при изменении backend-scope._
