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
- Событие `kaspi.session_expired` (payments-update 2026-06-05) → инвалидация `qk.kaspi.status` + тост (родители временно не могут платить, нужен reconnect — см. §25a).
- Полный каталог событий — `architecture.md §6.5`.

### 2.8 Rate limiting

- Все запросы проходят Redis sliding-window. На 429 показывай мягкий тост «слишком часто, повторите позже», бэкофф на ретраях. OTP — 5/час на телефон, после 3 неверных кодов — блокировка телефона на 15 минут.

---

## 3. Вход в админку (Auth flow)

Эндпоинты `/auth/*` — общие. Полный контракт — `endpoints.md §0.1`.

> **Соглашение об именовании (подтверждено live `/docs-json` 2026-05-18, см. OPEN_QUESTIONS §A7):** тела **request**-DTO — **camelCase** (NestJS class-validator); поля **response** — **snake_case**. Ниже тела показаны в фактическом (camelCase) виде. **⚠️ Casing — per-module, не глобален** (уточнение §A8, 2026-05-18): camelCase-request верен для auth/users; **модуль children — snake_case request-DTO**. Перед каждым data-слайсом сверять per-endpoint по live `/docs-json`, не экстраполировать конвенцию на новые модули.

> **⚠️ App-aware auth (backend CHANGELOG 2026-06-03):** один аккаунт может иметь роли в разных аппках (`parent`/`staff`/`admin`). Клиент **обязан** слать поле `app` в `request`/`verify`; бэкенд выдаёт токен строго под неё (claim `aud`). Для Admin Web `app` всегда **`"admin"`** (видит только роль `admin`). Без `app` → `422`. Admin — **closed-app**: `request` для не приглашённого телефона → `404 not_invited` (OTP не отправляется; админов заводит только суперадмин). `role` в `role/select` больше **не передаётся** — бэкенд выводит роль из audience-scoped токена.

| Шаг              | Метод | Путь                | Тело                                                                                                                     | Ответ                                        |
| ---------------- | ----- | ------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| 1. Запрос кода   | POST  | `/auth/otp/request` | `{ phone, app: "admin" }` (E.164 `+7...`)                                                                                | `202 { sent, registered, resend_after_sec }` |
| 2. Проверка кода | POST  | `/auth/otp/verify`  | `{ phone, code, app: "admin", kindergartenId? }`, header `X-Device-Id` (опц., стабильный per-install)                    | auth-response (см. ниже)                     |
| 3a. Выбор садика | POST  | `/auth/role/select` | `{ kindergartenId }` (**`role` больше не нужен**; при ≥2 admin-садиках, либо передать `kindergartenId` сразу в `verify`) | auth-response                                |
| 4. Рефреш        | POST  | `/auth/refresh`     | `{ refreshToken }` + текущий Bearer (audience держится на сервере, тело без изменений)                                   | новая пара                                   |
| 5. Выход         | POST  | `/auth/logout`      | `{ refreshToken? }` + Bearer                                                                                             | `204`                                        |

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
- Если у пользователя нет роли `admin` — `verify` вернёт `403 no_role_for_app` (фильтр аудитории по `app=admin`). Показать экран «нет доступа к админке».
- `404 not_invited` на `request` (телефон не приглашён как admin) — OTP не отправлен; показать сообщение «обратитесь к суперадмину», остаться на вводе телефона.
- Ошибки OTP: `400 otp_expired_or_missing`, `400 invalid_otp`, `400 invalid_phone_format`, `404 not_invited`, `422` (отсутствует/неверное `app`), `429 otp_rate_limit`, `429 otp_locked`, `403 no_active_roles`, `403 no_role_for_app`, `403 pending_role_select`, `403 role_not_available`, `403 role_select_not_required`. Покажи человекочитаемые сообщения, для 429 — таймер до разблокировки.

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

| Метод | Путь                                                | Назначение                                                                                                                                                                       |
| ----- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET   | `/admin/children`                                   | Список. Фильтры: `status`(card_created/active/archived), `current_group_id`, поиск по ФИО/ИИН.                                                                                   |
| POST  | `/admin/children`                                   | Создать карточку вручную (вне enrollment). Статус `card_created`, без авто-счёта.                                                                                                |
| GET   | `/admin/children/:id`                               | Полная карточка: guardians, группа, история групп, timeline (preview), платежи (preview), диагностики (preview), `face_enrollment`.                                              |
| PATCH | `/admin/children/:id`                               | Обновить ФИО, ИИН, DOB, photo, `medical_notes`, `allergy_notes`.                                                                                                                 |
| POST  | `/admin/children/:id/transfer-group`                | Перевод в другую группу. Body `{to_group_id, reason?}`. → `child_group_history` + notify `child.transferred`.                                                                    |
| POST  | `/admin/children/:id/archive`                       | Архивировать. Body `{archive_reason}` (1..500). Закрывает тарифы, enqueue pro-rata refund.                                                                                       |
| POST  | `/admin/children/:id/reactivate`                    | Реактивировать. Body `{}`. Ответ `{child, requires_new_tariff_assignment:true}`.                                                                                                 |
| GET   | `/admin/children/:id/status-history`                | Аудит изменений статуса. `?limit=(≤200)&offset=`. `{items:[...], total}`.                                                                                                        |
| GET   | `/admin/children/:id/guardians`                     | Все опекуны + статус одобрения + `has_approval_rights`.                                                                                                                          |
| POST  | `/admin/children/:id/guardians`                     | Добавить опекуна вручную (админ может создать primary).                                                                                                                          |
| PATCH | `/admin/children/:id/guardians/:guardianId`         | Изменить `role`, `can_pickup`. (`has_approval_rights` — только через Parent flow.)                                                                                               |
| POST  | `/admin/children/:id/guardians/:guardianId/revoke`  | Отозвать доступ (`revoked_at`, `revoked_by`).                                                                                                                                    |
| POST  | `/admin/children/:id/guardians/:guardianId/approve` | `pending_approval → approved`. Body опц. `{grant_approval_rights?:false}` (true — выдать опекуну право самому одобрять других, ≤2/реб.; для админ-кнопки не нужно — слать `{}`). |
| POST  | `/admin/children/:id/guardians/:guardianId/reject`  | `pending_approval → rejected` (терминально). Без body.                                                                                                                           |
| GET   | `/admin/children/:id/group-history`                 | История переводов.                                                                                                                                                               |
| GET   | `/admin/children/:id/timeline`                      | Полная timeline ребёнка.                                                                                                                                                         |

**transfer-group:** `{ "to_group_id":"uuid", "reason":"Возрастная группа" }` → `200 { id, full_name, current_group_id, group_history_entry_id }`. Ошибки: 404 `child_not_found`, 404 `group_not_found`, 409 `child_already_in_group`, 409 `archived_child_not_transferable` (архивного нельзя — сначала reactivate).

**archive:** `{ "archive_reason":"Переезд семьи" }` → `200 { id, full_name, status:"archived", archived_at, archive_reason }`. Ошибки: 409 `child_already_archived`, 422 `archive_reason_required`.

**reactivate:** `{}` → `200 { child:{id,full_name,status:"active"}, requires_new_tariff_assignment:true }`. Ошибка 409 `child_not_archived`. `requires_new_tariff_assignment` всегда true → UI должен предложить назначить тариф (`POST /admin/tariff-assignments`).

**status-history item:** `{ id, previous_status, new_status, previous_archive_reason, archive_reason, changed_by_user_id, changed_at }`, сортировка `changed_at DESC`.

**GuardianDto display-поля** (backend update 2026-06-10, закрывает N2): `GuardianDto` теперь содержит `user_full_name: string|null` и `user_phone: string|null` (E.164), резолвятся из `users` по `child_guardians.user_id`. Присутствуют во **всех** ответах с `GuardianDto` (list, child-detail `guardians[]`, invite, patch, approve/reject/revoke). ⚠️ Для приглашённого по телефону юзера без профиля backend кладёт `user_full_name = <телефон>` (а не `null`) → фронт детектит `user_full_name === user_phone` как «имя не задано» (показывает «—» + телефон в своей колонке). `relationship` backend по-прежнему не отдаёт (не входит в scope).

**guardians approve/reject** (backend update 2026-06-10): админ может подтвердить **и** отклонить заявку опекуна прямо из админки, не дожидаясь primary-родителя. Доп. прав не нужно (текущая admin-сессия). Оба эндпоинта → `200 GuardianDto` с новым `status` — обновлять строку **на месте** (без полной перезагрузки). approve body опц. `{grant_approval_rights?:false}`; для обычной кнопки «Подтвердить» — `{}`. reject — без body. Ошибки: 404 `guardian_not_found`; 422 `invalid_guardian_status_transition` (строка уже **не** в `pending_approval` — кто-то обработал → тост «заявка уже обработана» + перезагрузка списка); 409 `max_approval_rights_exceeded` (только approve + `grant_approval_rights:true`); 401/403 (сессия/роль). Кнопки показываются **только** для `pending_approval`.

### 5.2 Страницы и поведение

- **Список детей:** таблица (ФИО, ИИН, группа, статус-бейдж, дата зачисления), фильтры по статусу/группе, поиск, кнопка «Создать карточку». Архивные — визуально приглушены/отдельный фильтр.
- **Карточка ребёнка** (детальная, табы):
  - _Профиль_ — ФИО, ИИН, DOB, пол, фото (presigned upload `purpose=child_photo`), мед.заметки, аллергии, текущая группа, статус, дата зачисления. Edit-режим (PATCH).
  - _Опекуны_ — список (роль primary/secondary/nanny, статус pending/approved/rejected/revoked, can_pickup, has_approval_rights). Действия: добавить опекуна (форма телефон/ФИО/роль), для `pending_approval` — **подтвердить/отклонить заявку** (inline-кнопки; reject — с confirm, терминально), изменить роль/can_pickup, отозвать. Кнопка «Отозвать все QR пользователя» (§23).
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

**State machine лида** (точная таблица переходов, зеркалирует backend VO `EnrollmentStatus.TRANSITIONS`):

| Текущий статус  | Допустимые переходы                     |
| --------------- | --------------------------------------- |
| `new`           | `in_processing`                         |
| `in_processing` | `waitlist`, `card_created`, `cancelled` |
| `waitlist`      | `in_processing`                         |
| `card_created`  | `archive`                               |
| `cancelled`     | `archive`                               |
| `archive`       | _(терминальный — переходов нет)_        |

Логируется в `enrollment_status_log`. При переходе в `card_created` система создаёт `children` + `child_guardians` (primary) + первый `invoice`.

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

> **⚠️ Live-verified pre-B14 (2026-06-04, OPEN_QUESTIONS §A24, прецедент §A8/§A12 live=факт):** префикс **без `/admin`** (`/locations/*`, `/cameras/*`); casing **snake_case**; вместо hard-`DELETE` — **`archive`/`restore`** (как группы §A12); камера: `rtsp_url`+`hls_url` (не `stream_url`) + `link-location`. Списки — **bare-array, без пагинации** (defensive `z.array(Schema)`). Ниже — фактический контракт.

### 9.1 Локации — `/locations/*`

| Метод | Путь                     | Назначение                                                                                               |
| ----- | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| GET   | `/locations`             | `LocationDto[]` (bare array).                                                                            |
| POST  | `/locations`             | `CreateLocationDto {name*(1..255), description?}`.                                                       |
| PATCH | `/locations/:id`         | `UpdateLocationDto {name?, description?}`.                                                               |
| POST  | `/locations/:id/archive` | Архивировать (set `archived_at`). Возможен 409 `location_in_use` (defensive — FK группы/камеры/события). |
| POST  | `/locations/:id/restore` | Снять архив.                                                                                             |

`LocationDto` (snake_case) = `{id, kindergarten_id, name, description, archived_at(nullable), created_at, updated_at}`. `description` — **JSONB-object nullable** (резолв через `lib/jsonb-i18n.ts` defensive: i18n `{ru,kk}` ИЛИ plain — backend пример строкой, тип `object`; читать через jsonb-i18n с fallback). Hard-DELETE на live **нет** — «удалить» в UI = archive (прецедент §A12/§C10). Фильтр `?archived=` (boolean) — как группы.

Ошибки: `location_not_found`(404), `location_in_use`(409 — обрабатывать defensive на archive).

### 9.2 Камеры (CCTV-конфиг) — `/cameras/*`

| Метод    | Путь                         | Назначение                                                                      |
| -------- | ---------------------------- | ------------------------------------------------------------------------------- |
| GET      | `/cameras`                   | `CameraDto[]` (bare array). Фильтр `?location_id=`.                             |
| POST     | `/cameras`                   | `CreateCameraDto {location_id*, name*, rtsp_url?, hls_url?}`.                   |
| PATCH    | `/cameras/:id`               | `UpdateCameraDto {location_id?, name?, rtsp_url?, hls_url?}`.                   |
| POST     | `/cameras/:id/archive`       | Архивировать.                                                                   |
| POST     | `/cameras/:id/restore`       | Снять архив.                                                                    |
| POST     | `/cameras/:id/link-location` | `LinkLocationDto {location_id*}` — перепривязка к локации.                      |
| ~~POST~~ | ~~`/cameras/:id/test`~~      | **Отложено (Phase C)** — не реализовано, в Swagger нет. UI — disabled-заглушка. |

`CameraDto` (snake_case) = `{id, kindergarten_id, location_id, name, rtsp_url, hls_url(nullable), is_active, archived_at(nullable), created_at, updated_at}`.

Ошибки: `camera_not_found`(404), `location_not_found`(404).

**Страницы:** CRUD-таблицы Локаций и Камер (одна страница «Структура садика» с двумя вкладками `/structure/locations` + `/structure/cameras`). Камеры группируются по локациям (имя локации резолвится из `useLocations` — закрывает §C8). Кнопку «Тест камеры» — заглушка «доступно позже» (Phase C, disabled+tooltip).

---

## 10. Расписание (Schedule) — `/admin/schedule/*`

**Назначение:** недельные шаблоны расписания групп + конкретные события. BP §9.3.

**Модель:** `schedule_templates` (недельный паттерн группы, `validFrom/validUntil`, `recurrence=weekly`) → `schedule_template_slots` (день недели × время × активность) → проекция в `activity_events` (dated). `schedule_week_snapshots` — флаг наличия недели.

**Casing:** **camelCase** для всех request/response DTO этого модуля (см. OPEN_QUESTIONS §A18, прецедент §A11). Не путать с `/admin/meal-plans/*` (§11) — там snake_case.

| Метод  | Путь                                          | Назначение                                                                                                                                                                                                                                       |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/admin/schedule/templates`                   | `?groupId=&isActive=`. `ScheduleTemplateResponseDto[]` = `{id, kindergartenId, groupId?, name, recurrence, isActive, validFrom, validUntil?, createdAt, slots: ScheduleTemplateSlotResponseDto[]}`.                                              |
| POST   | `/admin/schedule/templates`                   | `CreateScheduleTemplateDto = {groupId?, name*, recurrence?='weekly', validFrom*, validUntil?, isActive?}`.                                                                                                                                       |
| PATCH  | `/admin/schedule/templates/:id`               | `UpdateScheduleTemplateDto = {name?, isActive?, validUntil?}`.                                                                                                                                                                                   |
| GET    | `/admin/schedule/templates/:id/slots`         | `ScheduleTemplateSlotResponseDto[]` = `{id, dayOfWeek, startTime, endTime, activityName, locationId?, description?}` (сорт. dayOfWeek, startTime).                                                                                               |
| POST   | `/admin/schedule/templates/:id/slots`         | `CreateSlotDto = {dayOfWeek*(mon..sun), startTime*, endTime*, activityName*, locationId?, description?}`.                                                                                                                                        |
| PATCH  | `/admin/schedule/templates/:id/slots/:slotId` | `UpdateSlotDto = {dayOfWeek?, startTime?, endTime?, activityName?, locationId?(nullable), description?(nullable)}`.                                                                                                                              |
| DELETE | `/admin/schedule/templates/:id/slots/:slotId` | Удалить слот.                                                                                                                                                                                                                                    |
| GET    | `/admin/schedule/week-snapshots`              | `?groupId=&weekStartDateFrom=&weekStartDateTo=`. `ScheduleWeekSnapshotResponseDto[]` = `{id, kindergartenId, groupId, weekStartDate, source('manual'\|'cron'), copiedFrom?, createdAt}`.                                                         |
| POST   | `/admin/schedule/week-snapshots/copy`         | `CopyWeekDto = {fromMonday*}` — копия расписания **всех групп садика** с указанной недели на следующую (целевой Monday = `fromMonday + 7`). Идемпотентно. Response: `WeekCopySummaryDto = {copiedGroups, skippedGroups, totalEvents}`. См. §A18. |
| GET    | `/admin/schedule/activity-events`             | `?groupId=&dateFrom=&dateTo=&status=`. `ActivityEventResponseDto[]`.                                                                                                                                                                             |
| GET    | `/admin/schedule/activity-events/:id`         | Карточка события.                                                                                                                                                                                                                                |
| POST   | `/admin/schedule/activity-events`             | `CreateActivityEventDto = {groupId*, activityName*, locationId?, startsAt*, endsAt?, notes?}` — ad-hoc событие. См. §B2.                                                                                                                         |
| PATCH  | `/admin/schedule/activity-events/:id`         | `UpdateActivityEventDto = {activityName?, locationId?, startsAt?, endsAt?, notes?}`.                                                                                                                                                             |
| DELETE | `/admin/schedule/activity-events/:id`         | Удалить событие.                                                                                                                                                                                                                                 |

`ActivityEventResponseDto` = `{id, kindergartenId, groupId, templateSlotId?, activityName, locationId?, startsAt, endsAt?, status('scheduled'\|'in_progress'\|'completed'\|'cancelled'), createdBy?, notes?, createdAt, updatedAt}`.

**НЕ в Admin UI:**

- `POST /admin/schedule/week-rollout/run` — существует на backend, но scope SuperAdmin (автоматический cron). В Admin Web **не выставляется** (решение владельца, B11-prep). Если позже понадобится — будет видимая disabled-заглушка «Phase B» по паттерну Fiscal/Face.

Ошибки: `schedule_template_not_found`(404), `slot_not_found`(404), `slot_time_conflict`(409, дубль `(template, dayOfWeek, startTime)`), `source_week_snapshot_not_found`(404), `invalid_date_range`(400), `group_not_found`(404), `location_not_found`(404). При live-расхождении 422-vs-400 — см. §2.3.

**Страницы:**

- **Шаблоны расписания** — список по группам, создание шаблона.
- **Редактор шаблона** — недельная сетка (пн–вс × время), добавление/редактирование слотов (время начала/конца, активность, локация, описание). Конфликт времени → inline-ошибка.
- **Недельный обзор** — какие недели имеют расписание (week-snapshots), кнопка «Скопировать неделю **садика** на следующую» (глобально, не per-group; per-group copy — backend-ask §B1 / BACKEND_NEEDINGS N9). Просмотр `activity_events` по диапазону дат (календарь/список, статусы scheduled/in_progress/completed/cancelled). **Admin может создавать/редактировать/удалять ad-hoc события** (мини-CRUD поверх primitives — статусы переключают менторы в Staff App; дизайн-спека UI — пост-MVP, см. §B2).

---

## 11. Меню (Meal Plans) — `/admin/meal-plans/*`

**Назначение:** структурированное меню по дням. BP §9.2.

**Модель:** `meal_plans` (один день, опц. группа; уникальность `(kg, date, group_id)`, `group_id=NULL` = общесадиковое) → `meal_items` (`meal_type`: breakfast/snack_am/lunch/snack_pm/dinner; `dish_name {ru, kk, en?}`, `description`, `allergens[]`, `calories`, `photo_url`).

**Casing:** **snake_case** для всех request/response DTO этого модуля (см. OPEN_QUESTIONS §A18). Не путать с `/admin/schedule/*` (§10) — там camelCase.

**i18n ключ:** для `dish_name`, `description`, `notes` используется `MultiLangTextDto = {ru*, kk?, en?}` — ключ **`kk`** (BCP 47), НЕ `kz` (см. §A19, §A17.5; прецедент: `kz` остаётся только в legacy JSONB children/content).

| Метод  | Путь                                  | Назначение                                                                                                                                                                            |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/admin/meal-plans`                   | `?date_from=&date_to=&group_id=`. `MealPlanResponseDto[]` с `items[]` вложенно.                                                                                                       |
| POST   | `/admin/meal-plans`                   | `CreateMealPlanDto = {date*, group_id?, is_published?, notes?(MultiLangTextDto), items?[]}`. 409 `meal_plan_already_exists`.                                                          |
| PATCH  | `/admin/meal-plans/:id`               | `UpdateMealPlanDto = {is_published?, notes?(MultiLangTextDto)}` — **notes локализованы** (PairedI18nField в UI).                                                                      |
| DELETE | `/admin/meal-plans/:id`               | Каскадно удаляет items.                                                                                                                                                               |
| POST   | `/admin/meal-plans/:id/items`         | `CreateMealItemDto = {meal_type*, dish_name*(MultiLangTextDto), description?(MultiLangTextDto), allergens?[], photo_url?, calories?, position?}`.                                     |
| PATCH  | `/admin/meal-plans/:id/items/:itemId` | `UpdateMealItemDto` — те же поля опц.                                                                                                                                                 |
| DELETE | `/admin/meal-plans/:id/items/:itemId` | Удалить блюдо.                                                                                                                                                                        |
| POST   | `/admin/meal-plans/copy-week`         | `CopyWeekDto = {fromMonday*}` (camelCase, общий с §10!) — копия ПН–ПТ с указанной недели на следующую. Идемпотентно. Response: `CopyWeekSummaryDto = {plans_created, plans_skipped}`. |

`MealPlanResponseDto` = `{id, date, group_id?, is_published, notes?(MultiLangTextDto), source('manual'\|'cron'\|'copied'), copied_from?, items: MealItemResponseDto[], created_at, updated_at}`.

`MealItemResponseDto` = `{id, meal_type, dish_name(MultiLangTextDto), description?(MultiLangTextDto), allergens?[], photo_url?, calories?, position}`.

Ошибки: `meal_plan_not_found`(404), `meal_plan_already_exists`(409), `meal_item_not_found`(404), `invalid_meal_type`(400), `group_not_found`(404).

**Страницы:** недельный/месячный вид меню (выбор группы или «весь садик»), редактор дня (5 приёмов пищи, для каждого — список блюд с ru/kk названиями, аллергенами, калориями, фото), кнопка «Скопировать неделю», флаг публикации. Авто-копирование на след. неделю делает cron — UI показывает источник через `source` enum (`manual` / `cron` / `copied`).

---

## 12. Контент (Content) — `/admin/content/*` + Qundylyq

**Назначение:** новости, Qundylyq, поздравления, публикации меню/расписания, истории (stories с expiry). BP §9.

**Casing:** **snake_case** для request + response.

**i18n ключ:** `kk` (canonical, BCP 47). Backend нормализует legacy `kz` → `kk` через shim (удаляется в backend B23, см. CLAUDE §3, OPEN_QUESTIONS §A19). Фронт **шлёт и читает только `kk`**.

**ENUM:**

- `content_type`: `news | menu | schedule_pub | qundylyq | birthday`.
- `target_type`: `all | group | child`.
- `status`: `draft | scheduled | published`.

**Инвариант таргетинга:** `child`→`target_child_id` обязателен; `group`→`target_group_id` обязателен; `all`→оба null. 422 `content_target_invalid` при нарушении.

**State machine:** `draft → scheduled → published` (только вперёд; `published` терминальный — ни текст, ни media НЕЛЬЗЯ редактировать). `DELETE` — только из `draft` (scheduled удалить нельзя — сначала отзыв/PATCH). `PATCH` — из draft/scheduled (на published → 409 `content_already_published`).

| Метод  | Путь                          | Назначение                                                                                                                                                                                               |
| ------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/admin/content`              | Создать пост (draft по умолчанию; scheduled если `scheduled_for`). multipart **или** JSON.                                                                                                               |
| GET    | `/admin/content`              | Список с фильтрами + cursor-пагинация.                                                                                                                                                                   |
| GET    | `/admin/content/:id`          | Карточка.                                                                                                                                                                                                |
| PATCH  | `/admin/content/:id`          | Обновить (только draft/scheduled). multipart **или** JSON. PATCH media → **полный replace**.                                                                                                             |
| DELETE | `/admin/content/:id`          | Удалить (только draft → 409 `content_cannot_delete_published` если scheduled/published).                                                                                                                 |
| POST   | `/admin/content/:id/publish`  | Немедленная публикация (draft/scheduled → published). 409 `content_already_published` если уже опубликован.                                                                                              |
| POST   | `/admin/content/:id/schedule` | `{scheduled_for}` (draft → scheduled). 422 `content_scheduled_for_in_past` если дата в прошлом.                                                                                                          |
| POST   | `/admin/content/upload-media` | Standalone media upload (single `file` field) → `{url, key, bytes}`. **В нормальном flow не нужен** — POST/PATCH /admin/content сами заливают через `files`. Использовать только если URL нужен заранее. |

**Нет отдельного Qundylyq endpoint.** Admin UI делает отдельный экран с фильтром `?content_type=qundylyq` на общий `GET /admin/content`. Для qundylyq поста в `metadata` хранится `{month: 'YYYY-MM', theme: 'string'}` — соглашение, не enforce.

### Multipart-контракт (POST + PATCH /admin/content)

`Content-Type: multipart/form-data` **ИЛИ** `application/json` (без файлов — JSON-only). Поле для файлов — **`files`** (множественное число), **max 5** на запрос. OpenAPI на момент B12-prep это поле может не показывать — контракт подтверждён backend-кодом и dev'ом.

**Лимиты:**

- `image/*` ≤ **10 MB** на файл.
- `video/*` ≤ **100 MB** на файл.
- Иные MIME-типы → 400 `media_type_invalid`.

**В multipart объектные поля JSON-stringified:** `title_i18n`, `body_i18n`, `metadata` идут как `JSON.stringify({ru:'…', kk:'…'})` form-field'ом. Скалярные поля (`content_type`, `target_type`, etc.) — обычные form-fields. ISO date — строкой.

**`CreateContentDto` поля:** `content_type*`, `target_type*`, `target_group_id?`, `target_child_id?`, `title?`, `body?`, `title_i18n?({ru, kk})`, `body_i18n?`, `metadata?(JSONB)`, `scheduled_for?(ISO)`, `expires_at?(ISO)`. + `files?[]` (max 5, в multipart). `title`/`body` — legacy single-locale, фронт **всегда** шлёт `title_i18n`/`body_i18n` (опц. `title` для денормализованного fallback).

**`UpdateContentDto` поля:** все опц., **без `media_urls`**. Изменить медиа можно только через перезалив `files[]` в multipart-PATCH → **полный replace** всего массива (старые URL'ы стираются из ряда; физические файлы остаются в storage — best-effort cleanup только при DELETE поста). Selective delete/append **не поддерживается** — UX «один блок: перезалить весь набор файлов».

### PATCH media-семантика (final, B12-prep)

- `PATCH` **без `files`** на draft/scheduled → `media_urls` не трогается, патчатся только текст/таргет/etc.
- `PATCH` **с `files` (1+)** на draft/scheduled → `media_urls` **полностью заменяется** загруженным набором. Если хочешь оставить старые — заливай их вместе с новыми (полный набор).
- `PATCH` любой формы на published → 409 `content_already_published` (read-only).

**UI-рекомендация:** в редакторе один блок «Загрузить/перезагрузить медиа (max 5)», без per-file delete-кнопок. На published — превью всего поста read-only.

### List query

`GET /admin/content?content_type=&status=&target_type=&target_group_id=&target_child_id=&scheduled_from=&scheduled_to=&published_from=&published_to=&cursor=&limit=` (limit ≤100, default 20).

Cursor: `{items, cursor: string|null}` — поле называется **`cursor`** (не `next_cursor`; подтверждено live `/docs-json` 2026-05-27 при QA B12, prev draft drifted on field name). На момент текущего backend repo возвращает `cursor: null` (cursor-pagination end-to-end ещё не закончен) — но клиент готовит код под cursor по контракту. NB: parent-requests module использует `next_cursor` (§A15) — content module отличается.

### Response shape

`ContentPostResponseDto = {id, kindergarten_id, content_type, target_type, target_group_id?, target_child_id?, title?, body?, title_i18n?({ru,kk}), body_i18n?, media_urls?[], metadata?, scheduled_for?, published_at?, expires_at?, status, created_by?, created_at, updated_at}`. Все nullable-поля nullable явно. `title` — резолв per-locale (если фронт пишет только `title_i18n`, backend подставляет на чтении); `media_urls` — array of public URLs (nullable).

### Ошибки (мап в `error-map.ts`)

- `file_required`(400) — multipart без файла на `/upload-media`.
- `file_upload_error`(400) — пустой файл / не поддерживается.
- `file_too_large`(400, details `image_over_10mb` / `video_over_100mb`).
- `media_type_invalid`(400) — не image/_ и не video/_.
- `content_post_not_found`(404).
- `content_post_status_invalid`(409) — edit/delete на published.
- `content_cannot_delete_published`(409) — DELETE на scheduled/published.
- `content_already_published`(409) — publish на published.
- `content_target_invalid`(422) — target_type ↔ target_id рассинхрон.
- `content_scheduled_for_in_past`(422) — schedule с прошедшей датой.
- `group_not_found`(404), `child_not_found`(404) — таргет на несуществующую сущность.

### Страницы

- **Лента контента (`/content`)** — DataTable cursor-пагинация: тип-бейдж, заголовок (`title_i18n[locale] || title`), таргет (бейдж + имя), статус-бейдж (`draft`/`scheduled`/`published`), даты (`scheduled_for`/`published_at`). Фильтры: `content_type`, `status`, `target_type`, диапазоны дат.
- **Редактор поста (`/content/new`, `/content/:id`)** — для draft/scheduled: выбор `content_type`, таргет (`all`/группа/ребёнок — динамика + EntityCombobox), title/body на ru+kk (PairedI18nField), опц. `expires_at` (datetime), media-блок (drop-zone до 5 файлов, image≤10MB, video≤100MB, full-replace UX). Кнопки: Сохранить draft / Запланировать (datepicker → POST `/schedule`) / Опубликовать (POST `/publish`). Удалить — только draft. **На published** — превью read-only.
- **Qundylyq (`/content/qundylyq`)** — отдельный экран, фильтрует `/content?content_type=qundylyq`, подсвечивает latest `published`. Создание qundylyq — через общий редактор с `content_type=qundylyq` + опц. `metadata.{month, theme}`. Backend нотификации `content.qundylyq_new` уходят автоматически на publish.
- **Birthday** — посты `birthday` авто-генерируются cron'ом `/saas/content/birthday-run` (SuperAdmin scope); Admin видит их в общей ленте и может publish заранее запланированный или отредактировать draft. Кнопки запуска cron в Admin UI **нет**.

---

## 13. Биллинг: Счета и Оплаты — `/admin/invoices/*`, `/admin/payments/*`

**Назначение:** просмотр и ручные операции по начислениям. BP §4. (Read + ручные действия; провайдер на Phase A — Mock.)

**State machine инвойса:** `pending → {partial, paid, overdue, refunded, cancelled}`. Платежи (`payments`): `initiated → {processing, completed, failed, refunded}`.

> **Уточнение (подтверждено live `/docs-json` 2026-05-19, OPEN_QUESTIONS §A14, прецедент §A7/§A8/§A11 — live = факт, first-document):** контракт invoices правлен под live. **Casing — snake_case** (request + response; per-module, не экстраполировать). Ключевые расхождения прежней редакции ↔ live:
>
> - `GET /admin/invoices` query — `status, due_date_from, due_date_to, child_id, invoice_type, period_start, period_end, cursor, limit` (НЕ единичный `due_date`). Ответ — **plain `InvoiceResponseDto[]`** (bare array, БЕЗ envelope/`total`/`next_cursor`), несмотря на наличие `cursor`/`limit`-параметров: реальной cursor-пагинации нет, фронт использует только `limit` как cap (НЕ offset из §2.5).
> - `GET /admin/invoices/:id` → `InvoiceResponseDto` содержит **только `line_items: InvoiceLineItemResponseDto[]`** + плоские поля скидки (`discount_pct?, discount_reason?, amount_after_discount`). Массивов `payments`/`refunds`/`fiscal_receipts`/`discounts` в DTO **нет** (см. OPEN_QUESTIONS §C14 / BACKEND_NEEDINGS N6 — честная деградация секций карточки).
> - `POST /admin/invoices` `CreateInvoiceOneOffDto`: required `child_id, invoice_type, amount_due, due_date, period_start, period_end` (⚠ `period_start/period_end` **обязательны**, не опц.); опц. `description?, discount_pct?, discount_reason?, line_items?`. `CreateLineItemDto = {description*, quantity*(≥1), unit_price*(≥0), tariff_plan_id?}`. `InvoiceLineItemResponseDto = {id, invoice_id, kindergarten_id, description, tariff_plan_id?, quantity, unit_price, line_total, created_at}`.
> - `manual-mark-paid` тело `{paid_at?, payer_user_id?, note?}` (все опц.); `cancel` тело `{reason?}` (опц.). `invoice_type` enum: `monthly|prepayment_3m|prepayment_6m|prepayment_12m|prepayment_24m|additional_service|late_pickup_fee|other`.

| Метод | Путь                                   | Назначение                                                                                                                                                                         |
| ----- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET   | `/admin/invoices`                      | `?status=&due_date_from=&due_date_to=&child_id=&invoice_type=&period_start=&period_end=&limit=`. Ответ — plain `InvoiceResponseDto[]`.                                             |
| GET   | `/admin/invoices/:id`                  | `InvoiceResponseDto` + `line_items[]` + плоские поля скидки. (payments/refunds/fiscal/discounts в DTO нет — §C14.)                                                                 |
| POST  | `/admin/invoices`                      | Разовое начисление: `{child_id*, invoice_type*, amount_due*, due_date*, period_start*, period_end*, description?, discount_pct?, discount_reason?, line_items?:[CreateLineItem]}`. |
| POST  | `/admin/invoices/:id/manual-mark-paid` | Отметить оплату наличкой `{paid_at?, payer_user_id?, note?}` (`payments provider='cash' completed`). 409 `invoice_already_paid`.                                                   |
| POST  | `/admin/invoices/:id/cancel`           | Отменить `{reason?}` (только pending/partial). 409 `invoice_status_invalid`.                                                                                                       |
| GET   | `/admin/payments`                      | `?provider=&status=&child_id=&from_date=&to_date=&cursor=&limit=`. Ответ — plain `PaymentResponseDto[]` (bare array).                                                              |
| GET   | `/admin/payments/:id`                  | `PaymentResponseDto` (no `provider_payload` field — full DTO shown via JSON-viewer for support; see §A16).                                                                         |

Ошибки: `invoice_not_found`(404), `child_not_found`(404), `invoice_already_paid`(409), `invoice_status_invalid`(409), 422 validation.

**Страницы:**

- **Счета** — таблица: ребёнок, тип, период, сумма (amount_due / после скидки), статус-бейдж, due_date. Фильтры. Кнопка «Создать начисление».
- **Карточка счёта** — позиции (line items) + скидка (плоские поля DTO); секции связанных оплат/возвратов/фискальных чеков — **честная деградация** (контракт их не отдаёт, §C14/N6: scaffold секции сохранён, данные не выдумываются); действия: «Отметить оплату наличными», «Отменить счёт» (с подтверждением, обработкой 409).
- **Оплаты** — таблица: ребёнок, сумма, провайдер, статус, дата. Детали платежа (provider_payload — для саппорта).

---

## 14. Биллинг: Тарифы — `/admin/tariff-plans/*`, `/admin/tariff-assignments/*`

> **Уточнение (подтверждено live `/docs-json` 2026-05-21, OPEN_QUESTIONS §A16, прецедент §A7/§A8/§A14 — live = факт, first-document):** контракт tariff-plans / tariff-assignments правлен под live. **Casing — snake_case** (request + response; per-module, не экстраполировать). Ключевые расхождения прежней редакции ↔ live:
>
> - `tariff_type` enum: **НЕ** `monthly_base/additional_service/late_pickup/meal_upgrade`. Live: `monthly | additional_service | late_pickup_fee | prepayment_3m | prepayment_6m | prepayment_12m | prepayment_24m | other`.
> - `applies_to` enum: **НЕ** `child/group/age_range`. Live: `all_children | group | age_range | individual`.
> - `description` в `TariffPlanResponseDto` и `CreateTariffPlanDto` — i18n JSONB `{ru, kz}` (ключ `kz`!, как §2.4).
> - `GET /admin/tariff-plans` — доп. filter `group_id`. Ответ — **plain `TariffPlanResponseDto[]`** (bare array).
> - `GET /admin/tariff-assignments` — ответ **plain `TariffAssignmentResponseDto[]`** (bare array).
> - `POST /admin/tariff-assignments/:id/close` — **отдельный endpoint** (live). Устанавливает `valid_until = today`.
> - `TariffAssignmentResponseDto` содержит `assigned_by` (read-only из `req.user`, на create НЕ отправлять).
> - `GET /admin/payments` query: filter `from_date` / `to_date` (НЕ `from`/`to`). Ответ — **plain `PaymentResponseDto[]`** (bare array).
> - `PaymentResponseDto` **НЕ содержит** поля `provider_payload`. Содержит: `provider, provider_txn_id, idempotency_key, redirect_url?, deeplink?, status, paid_at?, refund_id?` + доп. `payer_user_id?`. Фронт показывает полный DTO в JSON-viewer для саппорта (семантический эквивалент).

| Метод | Путь                                  | Назначение                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET   | `/admin/tariff-plans`                 | `?is_active=&tariff_type=&group_id=`. Ответ — plain `TariffPlanResponseDto[]`.                                                                                                                                                                                                                                                                                                                                          |
| POST  | `/admin/tariff-plans`                 | `{name, description?:{ru?,kz?}, tariff_type(monthly/additional_service/late_pickup_fee/prepayment_3m/prepayment_6m/prepayment_12m/prepayment_24m/other), amount, applies_to(all_children/group/age_range/individual), group_id?, age_min_months?, age_max_months?, valid_from, valid_until?, discount_rules?:{sibling_discount_pct?,prepay_3m_pct?,prepay_6m_pct?,prepay_12m_pct?,prepay_24m_pct?,benefit_category?}}`. |
| GET   | `/admin/tariff-plans/:id`             | `TariffPlanResponseDto`.                                                                                                                                                                                                                                                                                                                                                                                                |
| PATCH | `/admin/tariff-plans/:id`             | `name?, description?, amount?, discount_rules?, valid_until?` (нельзя менять type/applies_to/group_id).                                                                                                                                                                                                                                                                                                                 |
| POST  | `/admin/tariff-plans/:id/deactivate`  | `is_active=false`. Returns `TariffPlanResponseDto`.                                                                                                                                                                                                                                                                                                                                                                     |
| GET   | `/admin/tariff-assignments`           | `?child_id=&tariff_plan_id=&active_on=`. Ответ — plain `TariffAssignmentResponseDto[]`.                                                                                                                                                                                                                                                                                                                                 |
| POST  | `/admin/tariff-assignments`           | `{child_id, tariff_plan_id, custom_amount?, custom_reason?, valid_from, valid_until?}`.                                                                                                                                                                                                                                                                                                                                 |
| GET   | `/admin/tariff-assignments/:id`       | `TariffAssignmentResponseDto`.                                                                                                                                                                                                                                                                                                                                                                                          |
| PATCH | `/admin/tariff-assignments/:id`       | `custom_amount?, custom_reason?, valid_until?`.                                                                                                                                                                                                                                                                                                                                                                         |
| POST  | `/admin/tariff-assignments/:id/close` | Close assignment (sets `valid_until = today`). Returns `TariffAssignmentResponseDto`.                                                                                                                                                                                                                                                                                                                                   |

Ошибки: `tariff_plan_not_found`(404), `tariff_assignment_not_found`(404), `tariff_plan_inactive`(409), `tariff_assignment_overlap`(409), `tariff_plan_overlap`(409).

**Страницы:** Тарифные планы (список + создание/редактирование, конструктор `discount_rules`, деактивация). Назначения тарифов (на ребёнка, период, льготная сумма `custom_amount`/`custom_reason`). Закрытие назначения (`POST .../close`). После реактивации ребёнка — флоу «назначить новый тариф».

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

> **Уточнение (подтверждено live `/docs-json` 2026-05-21, OPEN_QUESTIONS §A17, прецедент §A14/§A16 — live = факт, first-document):**

**State machine:** `pending → approved → processed` | `pending → rejected`.

| Метод | Путь                         | Назначение                                                                                           |
| ----- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| GET   | `/admin/refunds`             | `?status=&payment_id=&cursor=&limit=`. Ответ — bare `RefundResponseDto[]` (без pagination envelope). |
| GET   | `/admin/refunds/:id`         | Детали.                                                                                              |
| POST  | `/admin/refunds`             | `{payment_id, amount, reason}`. Чек: payment completed, amount ≤ payment.amount. Все поля required.  |
| POST  | `/admin/refunds/:id/approve` | pending → approved. Body: `{}` (пустой).                                                             |
| POST  | `/admin/refunds/:id/reject`  | `{reason}` required (1..500). pending → rejected. Overwrites original reason column.                 |
| POST  | `/admin/refunds/:id/process` | approved → processed (через провайдера; правит payment/invoice/баланс). **Для Kaspi — см. ниже.**    |

**RefundResponseDto** (snake_case): `id, kindergarten_id, payment_id, invoice_id(nullable), amount, reason, status(pending|approved|processed|rejected), processed_by(nullable), provider_ref(nullable), created_at, updated_at`.

> **Возврат Kaspi (backend payments-update 2026-06-05).** Если возвращаемый платёж имеет `provider='kaspi_pay'`, `POST /admin/refunds/:id/process` **требует** тело `{acknowledge_kaspi_history_checked: true}`. Причина: у Kaspi нет idempotency-ключа — слепой повтор может дать двойной возврат, поэтому оператор обязан явно подтвердить, что проверил историю возвратов в приложении Kaspi. Без подтверждения → `400 kaspi_refund_requires_history_ack`. Для `mock`/`halyk_epay`/`cash` тело **не нужно** (process шлётся без body, как раньше).
> **UI:** в диалоге «Провести возврат» при Kaspi-платеже показать чекбокс «Я проверил историю возвратов в приложении Kaspi»; кнопка «Провести» активна только при отмеченном чекбоксе, и тогда шлём `acknowledge_kaspi_history_checked=true`.

Ошибки: `refund_not_found`(404), `payment_not_found`(404), `refund_already_processed`(409), `kaspi_refund_requires_history_ack`(400, только Kaspi — нет ack истории).

**Контекст:** pro-rata refund при архивации ребёнка создаётся автоматически (`status=pending`, reason `pro_rata_archive`) — админ его видит здесь и проводит через approve→process вручную.

**Страница:** список возвратов (статус-бейджи, причина, сумма), inline state-machine actions по статусу, кнопки approve/reject(с причиной)/process в зависимости от текущего статуса.

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

> **Уточнение (подтверждено live `/docs-json` 2026-05-21, OPEN_QUESTIONS §A17, прецедент §A14/§A16 — live = факт, first-document):**

**Назначение:** конструктор праздничных/льготных/промо-скидок. BP §4.1. **State machine:** `draft → active → paused ↔ active | cancelled; active/paused → expired (cron)`.

| Метод | Путь                                       | Назначение                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET   | `/admin/custom-discounts`                  | Список (фильтр `status, valid_from_to, valid_until_from, target_type, page, limit`). Ответ — **page-based** `{rows: CustomDiscountResponseDto[], total, page, limit}`.                                                                                                                                                                                                                                                                                                                                                                                                                |
| POST  | `/admin/custom-discounts`                  | Создать (draft): `name{ru,kk}(I18nFieldDto required), description?(nullable JSONB), discount_type(percentage/fixed_amount), amount(>0), conditions(JSONB), target_type(all/groups/children/tariff_types/age_range), target_ids?(string[] nullable), valid_from, valid_until?(nullable), max_uses_per_child?(nullable ≥1), total_max_uses?(nullable ≥1), priority(≥0 default 100), stackable(default false), notify_on_activation(default true), notification_title?(nullable I18n, **required when notify=true**), notification_body?(nullable I18n, **required when notify=true**)`. |
| GET   | `/admin/custom-discounts/:id`              | Детали — envelope `{discount: CustomDiscountResponseDto, stats: {count, total_amount_applied}}`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| PATCH | `/admin/custom-discounts/:id`              | Обновить (только draft). Все поля optional.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| POST  | `/admin/custom-discounts/:id/activate`     | draft → active. Если `notify_on_activation` — push родителям.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| POST  | `/admin/custom-discounts/:id/pause`        | active → paused.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| POST  | `/admin/custom-discounts/:id/resume`       | paused → active.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| POST  | `/admin/custom-discounts/:id/cancel`       | → cancelled (финал).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| GET   | `/admin/custom-discounts/:id/applications` | Лог применений — **page-based** `{rows: [{id, kindergarten_id, custom_discount_id, invoice_id, invoice_line_item_id(nullable), child_id, amount_applied, applied_at}], total, page, limit}`.                                                                                                                                                                                                                                                                                                                                                                                          |

**CustomDiscountResponseDto** (snake_case): `id, kindergarten_id, name(JSONB {ru,kz}), description(JSONB nullable), discount_type, amount, conditions(JSONB), target_type, target_ids(string[] nullable), valid_from, valid_until(nullable), max_uses_per_child(nullable), total_max_uses(nullable), used_count, priority, stackable, notify_on_activation, notification_title(JSONB nullable), notification_body(JSONB nullable), status(draft|active|paused|expired|cancelled), created_by(nullable), created_at, updated_at`.

**I18nFieldDto** (for create/update): `{ru: string, kk: string}` — key `kk` (BCP 47). Response JSONB stores `kz` (historical, §2.4).

**Типы условий (`conditions` JSONB):** `prepayment_months`, `siblings_count`, `age_range`, `benefit_category`, `payment_method`, `early_payment`, `birthday_month`, `date_range`, `first_invoice`, плюс композиты `all_of`/`any_of`. Таргет: `all|groups|children|tariff_types|age_range`.

**Страницы:**

- **Список скидок** — статус-бейджи (draft/active/paused/expired/cancelled), период, использований (`used_count` / лимиты).
- **Конструктор скидки** — визуальный билдер условий (each condition type → форма; AND/OR композиция), таргетинг (мультиселект групп/детей/тарифов/возраст), период, лимиты, приоритет+stackable, текст push (ru/kk). Кнопки по state machine: Активировать / Пауза / Возобновить / Отменить (необратимо — подтверждение).
- **Статистика применения** — таблица `applications` (какому ребёнку/счёту, сумма). Превью «N детей попадут» считается на клиенте через applications (dry-run preview backend отложен).

---

## 19. Заявки родителей — list `/admin/parent-requests` · detail/actions `/staff/parent-requests/*`

**Назначение:** обработка заявок (доверенное лицо, выходные, поздний забор, отпуск, открытое обращение). BP §6. Админ видит **все** заявки садика. **State machine:** `pending → accepted | rejected | cancelled` (терминальные, race-guarded).

> **Уточнение (подтверждено live `/docs-json` 2026-05-19, OPEN_QUESTIONS §A15, прецедент §A7/§A8 — live = факт, first-document):** контракт parent-requests правлен под live. **Расщеплён по префиксам:** **список** — `GET /api/v1/admin/parent-requests` (admin видит весь садик); **деталь / accept / reject / messages (GET+POST)** — под `/api/v1/staff/parent-requests/{id}/*` (эндпоинта `/admin/parent-requests/:id` **нет**). Admin JWT авторизован для `/staff/parent-requests/*` (admin — staff_member с role=admin; подтверждено сводкой live-операции). 403 → `parent_request_forbidden` (штатный RBAC, не исключение admin). **Casing — snake_case** (request + response): `ReviewRequestDto {review_note?}`, `AddMessageDto {body*, attachments?:string[]}`. **Фильтр типа — `type`** (НЕ `request_type`). Cursor подтверждён: list и messages → `{items, next_cursor}` (`next_cursor` nullable, null на последней странице). Сообщения треда — только UUID автора (`author_user_id`/`author_staff_id`), без отображаемого имени (§C15 / N7 — честная деградация).

| Метод | Путь                                  | Назначение                                                                                                                                                                                         |
| ----- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET   | `/admin/parent-requests`              | Все заявки. Фильтр `status,type,child_id,group_id,recipient_type`, `limit,cursor`. **Cursor-paged** `(created_at DESC, id DESC)`; `next_cursor`; невалидный → 400 `parent_request_cursor_invalid`. |
| GET   | `/staff/parent-requests/:id`          | Детали `ParentRequestResponseDto` (+ `details` JSONB по типу).                                                                                                                                     |
| POST  | `/staff/parent-requests/:id/accept`   | `{review_note?}`. Conditional UPDATE WHERE pending; 409 при гонке.                                                                                                                                 |
| POST  | `/staff/parent-requests/:id/reject`   | `{review_note?}`.                                                                                                                                                                                  |
| POST  | `/staff/parent-requests/:id/messages` | Ответить в треде `{body, attachments?}`.                                                                                                                                                           |
| GET   | `/staff/parent-requests/:id/messages` | Список сообщений (cursor-paged `{items, next_cursor}`).                                                                                                                                            |

**Типы (`request_type`):** `trusted_person, day_off (ребёнок остаётся в саду в выходной), vacation (ребёнок НЕ ходит), late_pickup (генерит late_pickup_fee invoice при accept), open_request`. Семантика day_off vs vacation — не путать. `recipient_type` enum: `admin|mentor|specialist`.

**Страница:** список заявок (тип-бейдж, ребёнок, статус, дата, получатель), фильтры, cursor-пагинация. Детальная: данные заявки по типу (`details` JSONB различается), двусторонний тред сообщений (родитель ↔ staff/admin, вложения, автор по `author_*_id` без имени — §C15), кнопки Принять/Отклонить (с review_note, только pending), поле ответа в тред. Ошибки: `parent_request_not_found`(404), `parent_request_already_processed`(409), `parent_request_forbidden`(403), `parent_request_cursor_invalid`(400).

---

## 20. Посещаемость — `/admin/attendance-events/*`, `/admin/daily-status/*`

**Назначение:** журнал посещаемости, корректировки, сводка дневных статусов. BP §5.

| Метод | Путь                           | Назначение                                                                              |
| ----- | ------------------------------ | --------------------------------------------------------------------------------------- |
| GET   | `/admin/attendance-events`     | Лог check-in/out. Фильтр `child_id, method, диапазон дат`.                              |
| PATCH | `/admin/attendance-events/:id` | Корректировка `recorded_at, notes, pickup_user_id`.                                     |
| GET   | `/admin/daily-status`          | Список `child_daily_status` (paged, фильтр `child_id`, диапазон дат) на дату по садику. |

`attendance_method`: `face_id|manual|otp_pickup`. `child_intraday_status`: `present|absent|sick|late|early_pickup|on_vacation`.

> **Расхождение docs↔live (resolved 2026-06-03, B13):** отдельного `GET /admin/daily-status/summary` на backend **нет** (live `/docs-json` подтверждён). Агрегированная сводка отсутствий в Admin берётся из существующего `GET /admin/dashboard/attendance-today` → `{in_kindergarten, checked_out, absent, on_vacation, sick}` (+опц. `?group_id=`). См. OPEN_QUESTIONS §A23. Backend-need не заводим.

**Страница:** журнал событий (фильтр по ребёнку/методу/дате), редактирование записи (модал: время, заметка, кто забрал). Доска дневного статуса на дату (по группам); сводка отсутствий — из `attendance-today`.

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

## 25a. Биллинг: Подключение Kaspi Pay (SMS-онбординг) — `/admin/kaspi/*`

> **Источник:** backend payments-update 2026-06-05. **Дизайн:** готового handoff-экрана нет (в дизайне есть только фильтр провайдеров в таблице платежей) → решение о размещении и вёрстке — OPEN_QUESTIONS §A25 (вкладка «Оплата» в Настройках, строим по дизайн-системе).

Один кассирский аккаунт Kaspi Pay на садик. Онбординг — мастер из 3 шагов + финализация. ⚠️ Шаг `verify-otp` шлёт **реальную SMS** на телефон кассира — беречь попытки.

| Метод | Путь                              | Тело → Ответ                                                                                                   |
| ----- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| POST  | `/admin/kaspi/connect/init`       | `{}` → `{process_id}` (201). Скрытый шаг — стартует сессию онбординга.                                         |
| POST  | `/admin/kaspi/connect/send-phone` | `{process_id, phone: '7XXXXXXXXXX'}` → `{process_id, sms_sent: true}`. Шлёт SMS кассиру.                       |
| POST  | `/admin/kaspi/connect/verify-otp` | `{process_id, otp: '123456'}` → `{connected: true, phone, org_name, profile_id}`.                              |
| GET   | `/admin/kaspi/status`             | → `{connected: bool, status: 'pending'\|'active'\|'expired'\|'revoked', phone?, org_name?, last_checked_at?}`. |
| POST  | `/admin/kaspi/disconnect`         | → `{status: 'revoked'}`.                                                                                       |

**Телефон кассира** — формат `7XXXXXXXXXX` (11 цифр, без `+`/пробелов; НЕ E.164). Backend сам нормализует ввод (`+77772270088` / `87772270088` / `77772270088` / `7772270088` → канон) — фронт может слать любой из этих видов; шлём 11-значный `7XXXXXXXXXX`. Менять нормализацию на фронте не требуется.

**Состояния `status`:**

- `active` — всё работает, оплата идёт. Показать `phone` / `org_name` / `last_checked_at` + кнопки «Переподключить» (= повторный онбординг) и «Отключить».
- `pending` — онбординг начат, но не завершён.
- `expired` — сессия Kaspi истекла, авто-продление не удалось → **баннер «Переподключите Kaspi»** (родители не смогут платить). Параллельно прилетает WS-уведомление `kaspi.session_expired`.
- `revoked` — отключено вручную (через disconnect).

Если `status != active` → показать мастер из 3 шагов (init скрыто → ввод телефона кассира → ввод SMS-кода). Если `active` → карточка статуса + Переподключить/Отключить.

**Ошибки (HTTP):**

- `409 kaspi_already_connected` — уже подключено, сперва `disconnect`.
- `502 kaspi_app_version_outdated` — версионный гейт Kaspi → **сообщить суперадмину** (он поднимает билд); кнопку повтора показать после.
- `400 kaspi_unknown_process` — `process_id` протух (TTL ~5 мин) → начать заново (с `init`).
- `401 kaspi_otp_invalid` — неверный SMS-код (на `verify-otp`).
- `502 kaspi_finish_failed` — реальный сбой связи с Kaspi → повторить онбординг.
- **Ошибки телефона на `send-phone`** (показывать inline на поле телефона, не общим тостом):
  - `422 invalid_phone_format` — мусор, не прошёл DTO-валидацию.
  - `400 kaspi_invalid_phone` — формат ок, но номер не сводится к 10 цифрам → «Проверьте номер телефона».

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

> **⚠️ Live-verified pre-B14 (2026-06-04, OPEN_QUESTIONS §A24):** notifications **backend готов** (не mock) — список cursor `{items, next_cursor?}`, preferences `{preferences[]}`, mark-read. QR-response **camelCase**. `/users/me` GET/PATCH уже подключён (B2/B3, `api/auth.ts`).

| Метод     | Путь                                                  | Назначение                                                                                                                        |
| --------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| GET/PATCH | `/users/me`                                           | Профиль (ФИО, avatar, locale, iin, dob). PATCH camelCase `{fullName, avatarUrl, dateOfBirth, iin, locale}` (§A7).                 |
| GET       | `/users/me/qr`                                        | `GetMyQrResponseDto {token, issuedAt, expiresAt}` (**camelCase**). `token` → рендер QR на клиенте.                                |
| GET       | `/notifications`                                      | `ListNotificationsResponseDto {items: NotificationResponseDto[], next_cursor?}`. Query `?unread_only=&limit=&cursor=&event_key=`. |
| POST      | `/notifications/:id/read` / `/notifications/read-all` | Пометить прочитанным / всё прочитано.                                                                                             |
| GET       | `/notifications/preferences`                          | `ListPreferencesResponseDto {preferences: NotificationPreferenceItemDto[]}`.                                                      |
| PATCH     | `/notifications/preferences`                          | `UpdatePreferencesDto {preferences: [{event_key*, push_enabled?, in_app_enabled?}]}`.                                             |

`NotificationResponseDto` (snake_case) = `{id, event_key, title_i18n{ru,kk}, body_i18n{ru,kk}, data(object), read_at(nullable), created_at}`. `NotificationPreferenceItemDto` = `{event_key, push_enabled, in_app_enabled}`. `event_key` — enum (35 значений: `attendance.checkin`, `invoice.overdue`, `request.accepted`, … полный список в `UpdateNotificationPreferenceItemDto`). Текст уведомления резолвится `title_i18n[locale]`/`body_i18n[locale]` через `lib/jsonb-i18n.ts`. `push-tokens` — web-push, опц. для админки (вне B14 scope).

**UI:** меню пользователя (профиль, смена локали, выход), колокол уведомлений (счётчик непрочитанных, список, read-all), реал-тайм через WS (тосты на важные события садика: новая заявка, оплата, и т.д.). Mobile — full-screen route `/notifications` (M10).

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
/settings                      — Настройки садика (табы: Основное/Операционные/Дизайн/Оплата/Фискальные/Подписка)
/settings?tab=payments         — Оплата: онбординг Kaspi Pay (SMS-мастер) + статус (§25a)
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
