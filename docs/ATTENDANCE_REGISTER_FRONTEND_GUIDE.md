# Frontend Guide — Журнал посещаемости в Admin Web (QR + ручное ведение)

Кто читает: фронтенд Admin Web.
Что появилось: админка теперь **ведёт** журнал прихода/ухода, а не только показывает его. Сканирование QR родителя, ручная отметка, правки, удаление, история изменений.

База: `/api/v1`. Все роуты ниже требуют `Authorization: Bearer <access>`.
SoT по контрактам — [`docs/endpoints.md`](../endpoints.md) §2.21 и §2.23; при расхождении верить ему, а не этому файлу.

---

## 0. TL;DR

1. **Сначала почини логин** (§1). Без `X-Device-Id` сканер не заработает вообще — это не опция, это блокер.
2. QR — **два шага**: `POST /admin/qr/scan` только опознаёт родителя и отдаёт список его детей; посещаемость он **не пишет**. Отметка — отдельный вызов (§2).
3. Ручная отметка и задним числом — те же два роута (§3). Задним числом = **без пуша родителю**.
4. Правки/удаление/история — §4. Удалять и менять ребёнка/тип может **только `admin`**, не `reception` (§5).
5. Не изобретай логику статусов на фронте — бэк сам пересчитывает (§6).

---

## 1. ⚠️ Блокер: `X-Device-Id` — сделать до всего остального

`POST /admin/qr/scan` сверяет заголовок `X-Device-Id` с колонкой `device_id` активной сессии (`refresh_tokens`) — обычным SQL `=`.

Клиент, залогинившийся **без** этого заголовка, имеет в строке `NULL`. В SQL `NULL = что_угодно` **никогда** не истинно ⇒ любой скан вернёт `401 no_active_session_for_device`, что бы ты потом ни прислал. Починить на стороне скана нельзя — привязка создаётся **при логине**. Перепривязать существующую сессию нечем, только перелогин.

**Что делать:** сгенерировать UUID **один раз**, положить в `localStorage`, слать как `X-Device-Id`:

| Роут                     | Обязателен? | Почему                                                                                                                                                                                |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/otp/verify`  | **Да**      | вставляет строку сессии; без заголовка там `NULL`                                                                                                                                     |
| `POST /auth/role/select` | **Да**      | ⚠️ главная ловушка: делает **новый INSERT**, а не ротацию. Мульти-садиковый админ (а это норма) проходит через него всегда — и теряет привязку, даже если на `otp/verify` всё прислал |
| `POST /auth/refresh`     | Желательно  | ротация переносит старое значение, если заголовка нет. Привязка не теряется                                                                                                           |
| `POST /admin/qr/scan`    | **Да**      | иначе `400 X-Device-Id header required`                                                                                                                                               |

```ts
// один раз на установку
function deviceId(): string {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}
// и дальше в общий axios/fetch-интерцептор: headers['X-Device-Id'] = deviceId()
```

Проще всего повесить заголовок глобально на все запросы — лишним он нигде не будет.

---

## 2. Экран «Вход/выход» — QR-флоу (два шага)

### Шаг 1 — опознать родителя

```http
POST /api/v1/admin/qr/scan
X-Device-Id: <uuid>
Content-Type: application/json

{ "token": "a1b2c3d4e5f6..." }   // 32 hex-символа с экрана родителя
```

```jsonc
// 200
{
  "user": {
    "id": "aaaaaaaa-...",
    "role": "parent",
    "fullName": "Сауле Жанұзақова",
    "phone": "+77001112233",
  },
  "linkedChildren": [
    // только если role === 'parent'
    {
      "id": "cccccccc-...",
      "fullName": "Айдар Жанұзақов",
      "currentGroupId": "gggggggg-...", // может быть null
      "photoUrl": "https://...", // может быть null
    },
  ],
  "allowedActions": ["check_in", "check_out"], // подсказка для UI
}
```

Важное про этот ответ:

- **Скан ничего не пишет.** `allowedActions` — это подсказка, какие кнопки показать, а не «уже сделано».
- `linkedChildren` — только дети **в твоём садике** (даже если у родителя есть дети в других). Может прийти `[]` — тогда показывай «нет детей в этом садике», а не пустой экран.
- `allowedActions: []` у родителя = нет права забирать (`can_pickup`). Кнопки отметки надо дизейблить.
- `linkedChildren` может содержать **несколько** детей → обязательно экран выбора, не автовыбор первого.
- Rate-limit: **60 сканов / 60 сек** на device → `429` + заголовок `Retry-After` (секунды).

### Шаг 2 — отметить

Оператор выбрал ребёнка → зовёшь check-in или check-out из §3.

---

## 3. Ручная отметка

### 3.1 Приход

```http
POST /api/v1/admin/attendance/check-in
{ "childId": "cccccccc-...", "recordedAt": "2026-05-01T09:00:00.000Z", "notes": "опоздал" }
```

`recordedAt` и `notes` — опциональны. `201` → объект события (§7).

### 3.2 Уход

```http
POST /api/v1/admin/attendance/check-out
{ "childId": "cccccccc-...", "pickupUserId": "aaaaaaaa-...", "recordedAt": "...", "notes": "..." }
```

`pickupUserId` **обязателен** — это тот, кто забирает. Должен быть одобренным опекуном с правом забирать, иначе `403 pickup_user_not_allowed`. В QR-флоу это `user.id` из ответа скана.

### 3.3 Задним числом = тихо

Если `recordedAt` попадает **не в сегодняшний день** (Asia/Almaty), пуш родителю **не уходит**. Запись, таймлайн и аудит пишутся как обычно.

Смысл: админ, закрывающий вчерашний журнал в 22:00, не должен разослать родителям «ваш ребёнок пришёл». Живой скан на входе (без `recordedAt`) — пуш уходит нормально.

**На фронте:** это поведение бэка, ничего слать не нужно. Но в UI back-fill стоит подписать «уведомление родителю не отправится» — иначе оператор будет гадать.

### 3.4 Статус дня

```http
POST /api/v1/admin/daily-status
{ "childId": "...", "date": "2026-05-01", "status": "sick", "note": "мама написала" }
```

`status`: `present | absent | sick | late | early_pickup | on_vacation`. Ответ — **200**, не 201 (это upsert по паре `(childId, date)`).

Явно проставленный статус **сильнее** вычисленного: `sick` не перебьётся приходом и не сбросится при правках событий.

---

## 4. Правки

### 4.1 Обычная правка (admin + reception)

```http
PATCH /api/v1/admin/attendance-events/:eventId
{ "recordedAt": "...", "notes": "...", "pickupUserId": "..." }
```

Без ограничения по дате — можно править любой исторический день (у стафф-приложения такое ограничение есть, у админки нет).

### 4.2 Структурная правка (**только admin**)

```http
PATCH /api/v1/admin/attendance-events/:eventId
{ "childId": "dddddddd-...", "eventType": "check_out" }
```

- `childId` — запись оформили не на того ребёнка;
- `eventType` — нажали не ту кнопку.

`reception` получит `403 attendance_correction_admin_only`. `method` изменить нельзя никак — он фиксирует, как запись появилась.

Побочные эффекты (делает бэк, тебе считать не надо): таймлайн переезжает за записью, статусы дня пересчитываются **у обоих** детей, а при перевороте в `check_in` очищается `pickupUserId`.

⚠️ При перевороте типа таймлайн-запись **пересоздаётся с новым `id`**. Если где-то держишь ссылку на старый — она отвалится.

### 4.3 Удаление (**только admin**)

```http
DELETE /api/v1/admin/attendance-events/:eventId   → 204
```

Мягкое: запись исчезает из всех выдач, включая счётчики дашборда, но история остаётся. Повторное удаление → `404`. `reception` → `403`.

### 4.4 История правок

```http
GET /api/v1/admin/attendance-events/:eventId/history?limit=50&offset=0
```

```jsonc
// 200 — массив, новые сверху
[
  {
    "id": "...",
    "action": "update", // create | update | delete
    "actorUserId": "aaaa-...",
    "actor_full_name": "Ирина Кайратовна", // может быть null
    "before": { "childId": "ccc...", "eventType": "check_in", "recordedAt": "..." },
    "after": { "childId": "ddd...", "eventType": "check_in", "recordedAt": "..." },
    "createdAt": "2026-05-01T10:15:00.000Z",
  },
]
```

- `before`/`after` — сырые снимки строки; диффай сам, какие поля показывать.
- `create` → только `after`; `delete` → только `before`; `update` → оба.
- Работает и для **удалённых** событий — можно показать, кто и когда удалил.
- Внутри снимков даты — ISO-строки (это jsonb).

---

## 5. Права: `admin` vs `reception`

Оба видят экран и оба могут отмечать. Разница только здесь:

| Действие                                                    | `admin` | `reception` |
| ----------------------------------------------------------- | ------- | ----------- |
| Скан, check-in / check-out, статус дня                      | ✅      | ✅          |
| Правка `recordedAt` / `notes` / `pickupUserId` (любая дата) | ✅      | ✅          |
| Правка `childId` / `eventType`                              | ✅      | ❌ 403      |
| Удаление записи                                             | ✅      | ❌ 403      |
| Просмотр истории                                            | ✅      | ✅          |

**На фронте:** прячь/дизейбль кнопки «Перенести на другого ребёнка», «Поменять тип» и «Удалить» при `role === 'reception'`. Бэк всё равно вернёт 403 — но пусть оператор не тыкается в заведомо запрещённое.

---

## 6. Чего НЕ делать

- **Не считай статусы сами.** Демоушн/промоушн — на бэке. Правило: `present → absent` только когда за день не осталось ни одного прихода; явные `sick`/`on_vacation` не трогаются никогда. Дублировать это на фронте = гарантированное расхождение.
- **Не считай, что скан = отметка.** Два шага (§2).
- **Не полагайся на `allowedActions` как на право.** Это подсказка UI; настоящую проверку делает бэк на check-out.
- **Не жди пуша от back-fill** (§3.3).

---

## 7. Формы ответов

Событие (`POST check-in|check-out`, `GET /admin/attendance-events`, `PATCH`):

```jsonc
{
  "id": "...",
  "kindergartenId": "...",
  "childId": "...",
  "child_name": "Айдар Жанұзақов", // overlay, может быть null
  "eventType": "check_in", // check_in | check_out
  "method": "manual", // manual | face_id | otp_pickup
  "recordedBy": "...", // staff_members.id
  "recorded_by_full_name": "Ирина К.", // overlay, может быть null
  "pickupUserId": null,
  "pickup_user_full_name": null,
  "pickupRequestId": null,
  "notes": null,
  "recordedAt": "2026-05-01T09:00:00.000Z",
  "createdAt": "2026-05-01T09:00:01.000Z",
}
```

⚠️ Каша в кейсинге — историческая и настоящая: сами поля `camelCase`, а display-оверлеи (`child_name`, `*_full_name`) — `snake_case`. Так в API, не опечатка.

Списки посещаемости и статусов дня возвращают **голый массив**, а не `{data, meta}` — в этом модуле так исторически.

---

## 8. Справочник ошибок

| Код                                     | HTTP | Когда                                                              |
| --------------------------------------- | ---- | ------------------------------------------------------------------ |
| `no_active_session_for_device`          | 401  | `X-Device-Id` не совпал с сессией → §1                             |
| — (`X-Device-Id header required`)       | 400  | заголовок не прислан на скан                                       |
| `qr_token_not_found`                    | 404  | токен неизвестен                                                   |
| `qr_token_expired` / `qr_token_revoked` | 410  | QR протух (TTL 24ч) / отозван → попроси родителя переоткрыть экран |
| `qr_rate_limit_exceeded`                | 429  | >60 сканов/мин на device; есть `Retry-After`                       |
| `pickup_user_not_allowed`               | 403  | забирающий не одобрен для этого ребёнка                            |
| `attendance_correction_admin_only`      | 403  | `reception` полез в `childId`/`eventType`                          |
| `insufficient_role`                     | 403  | `reception` полез в DELETE                                         |
| `attendance_event_not_found`            | 404  | нет события / уже удалено                                          |
| `child_not_found`                       | 404  | нет ребёнка в этом садике                                          |
| `attendance_edit_window_expired`        | 403  | **не про админку** — это лимит стафф-приложения                    |
| `tenant_required`                       | 400  | токен без `kindergarten_id` → нужен `/auth/role/select`            |

---

## 9. TypeScript типы (copy-paste)

```ts
export type AttendanceEventType = 'check_in' | 'check_out';
export type AttendanceMethod = 'manual' | 'face_id' | 'otp_pickup';
export type ChildIntradayStatus =
  | 'present'
  | 'absent'
  | 'sick'
  | 'late'
  | 'early_pickup'
  | 'on_vacation';

export interface ScannedUser {
  id: string;
  role: 'parent' | 'mentor' | 'specialist' | 'reception' | 'admin' | 'super_admin';
  fullName: string;
  phone: string | null;
}

export interface LinkedChild {
  id: string;
  fullName: string;
  currentGroupId: string | null;
  photoUrl: string | null;
}

export interface ScanQrResponse {
  user: ScannedUser;
  linkedChildren?: LinkedChild[]; // только для role === 'parent'
  allowedActions: string[]; // ['check_in','check_out'] | ['gate_entry'] | []
}

export interface AttendanceEvent {
  id: string;
  kindergartenId: string;
  childId: string;
  child_name: string | null;
  eventType: AttendanceEventType;
  method: AttendanceMethod;
  recordedBy: string | null;
  recorded_by_full_name: string | null;
  pickupUserId: string | null;
  pickup_user_full_name: string | null;
  pickupRequestId: string | null;
  notes: string | null;
  recordedAt: string;
  createdAt: string;
}

export interface DailyStatus {
  id: string;
  kindergartenId: string;
  childId: string;
  date: string; // YYYY-MM-DD
  status: ChildIntradayStatus;
  note: string | null;
  setBy: string | null;
  set_by_full_name: string | null;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: 'create' | 'update' | 'delete';
  actorUserId: string | null;
  actor_full_name: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}
```

---

## 10. Порядок работ (предлагаемый)

1. `X-Device-Id` в логин + интерцептор (§1) — **без этого остальное не проверить**.
2. Экран журнала: `GET /admin/attendance-events` + фильтры (уже был, если делали раньше).
3. Ручная отметка: check-in / check-out (§3).
4. Сканер: камера → `/admin/qr/scan` → выбор ребёнка → отметка (§2).
5. Правки + удаление + гейт по роли (§4, §5).
6. История правок (§4.4).
