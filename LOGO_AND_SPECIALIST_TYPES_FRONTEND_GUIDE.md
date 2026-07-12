# Frontend Guide — Логотип садика (N11) + Справочник специальностей (N12)

**Дата:** 2026-07-10 · **Статус бэкенда:** реализовано, build/lint/unit зелёные, e2e ещё не гонялся (нужна dev-БД) · **Совместимость:** всё **аддитивно**, старые клиенты не ломаются.

Закрывает `BACKEND_NEEDINGS_HANDOFF.md` N11 (логотип) и N12 (типы специалистов).

Базовый префикс всех путей — `/api/v1`. Все запросы требуют `Authorization: Bearer <token>` и роль `admin` (кроме чтения `logo_url`, которое приходит в любом ответе с объектом садика).

---

## 0. TL;DR

| #   | Что появилось                                                                       | Куда смотреть |
| --- | ----------------------------------------------------------------------------------- | ------------- |
| N11 | Поле `logo_url` на объекте садика + загрузка/удаление логотипа                      | §1            |
| N12 | Admin-справочник специальностей (CRUD) + `doctor_nutritionist` («Врач Нутрициолог») | §2            |
| —   | `specialist_type` теперь **код из справочника** (не enum). Валидируется бэком.      | §2.6          |
| —   | Полный справочник ошибок                                                            | §3            |
| —   | TypeScript-типы для копипаста                                                       | §4            |

---

## 1. N11 — Логотип садика

### 1.1 Новое поле `logo_url`

Появилось на объекте садика **везде**, где он отдаётся:

- `GET /kindergartens/me` (Admin) — `KindergartenDto`
- `GET` парент-эндпоинты садика (Parent App) — `ParentKindergartenDto`

```jsonc
// GET /kindergartens/me → 200
{
  "id": "7c2c2b6a-…",
  "name": "Детский сад «Солнышко»",
  "slug": "solnyshko",
  "address": "Алматы, ул. Абая, 1",
  "phone": "+77272221100",
  "logo_url": "https://balam-media.object.pscloud.io/7c2c2b6a/2026-07/9f2c….png?X-Amz-…", // ← НОВОЕ
  "plan": "standard",
  "settings": { "timezone": "Asia/Almaty", "currency": "KZT" },
  "is_active": true,
  "archived_at": null,
  "created_at": "2026-04-24T10:00:00.000Z",
  "updated_at": "2026-07-10T12:00:00.000Z",
}
```

- Тип: `string | null`. `null` — логотип не загружен.
- Это **готовая к рендеру ссылка** (presigned), кладётся прямо в `<img src>`. Ничего дополнительно подписывать/строить не нужно.
- ⚠️ Ссылка **временная** (~1 час). Не кэшируй её надолго в сторе — при протухании просто перезапроси садик (`GET /kindergartens/me`) и получи свежую.
- ⚠️ **Dev-окружение:** там файлы лежат в локальном хранилище, и `logo_url` = `/api/v1/media/<...>` — такой путь требует `Authorization`-заголовок и в чистом `<img src>` не загрузится. Это ожидаемо и совпадает с поведением всех остальных медиа в приложении; в проде (S3) отдаётся presigned-URL, который в `<img>` работает без заголовка.

### 1.2 Загрузка / замена логотипа

```
POST /api/v1/admin/kindergartens/me/logo
Content-Type: multipart/form-data
```

| Поле   | Тип    | Обязательно | Ограничения                             |
| ------ | ------ | ----------- | --------------------------------------- |
| `file` | binary | да          | `image/*` (png/jpeg/webp/…), **≤ 5 МБ** |

Заменяет предыдущий логотип (старый файл удаляется best-effort).

**Пример (fetch):**

```ts
const fd = new FormData();
fd.append('file', file); // File из <input type="file">

const res = await fetch('/api/v1/admin/kindergartens/me/logo', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }, // Content-Type НЕ ставим — браузер сам добавит boundary
  body: fd,
});
const { logo_url } = await res.json();
```

**Ответ `200`:**

```json
{ "logo_url": "https://…png?X-Amz-…" }
```

`logo_url` — уже presigned, можно сразу показать. Это же значение придёт в `GET /kindergartens/me`.

**Ошибки `400`** (тело: `{ "statusCode": 400, "error": "<code>", "message": "<code>" }`):

| code                | когда                   |
| ------------------- | ----------------------- |
| `logo_required`     | файл не пришёл / пустой |
| `logo_type_invalid` | MIME не `image/*`       |
| `logo_too_large`    | > 5 МБ                  |

Плюс `401` (нет/протух токен), `403` (не admin), `404 kindergarten_not_found`.

### 1.3 Удаление логотипа

```
DELETE /api/v1/admin/kindergartens/me/logo
```

Идемпотентно (у садика без логотипа — тоже `200`).

**Ответ `200`:**

```json
{ "logo_url": null }
```

### 1.4 Что делать на фронте

1. Оживить кнопку «Загрузить логотип» на `/settings → Общие` → `POST …/me/logo`.
2. Показывать `kindergarten.logo_url` (fallback-плейсхолдер при `null`).
3. Кнопку «Удалить» → `DELETE …/me/logo`, после — `logo_url = null`.
4. Клиентская валидация до отправки (тип/размер) для мгновенного UX — но бэк валидирует всё равно.

---

## 2. N12 — Справочник специальностей

Раньше `specialist_type` был жёстким enum на бэке. Теперь это **admin-управляемый справочник per-садик**, и он — источник истины. Метки (`name_i18n`) отдаёт бэкенд — **фронт перестаёт хардкодить i18n-мапу специальностей**.

### 2.1 Модель `specialist_type`

```jsonc
{
  "id": "9f2c8a1b-…",
  "code": "doctor_nutritionist", // машинный код, ИММУТАБЕЛЕН
  "name_i18n": { "ru": "Врач Нутрициолог", "kk": "Нутрициолог дәрігер" }, // метки, редактируемые
  "is_system": true, // системная строка — НЕЛЬЗЯ удалить (можно деактивировать/переименовать)
  "is_active": true, // выключенные не показываем в дропдаунах staff/diagnostics
  "sort_order": 5, // порядок отображения (ASC)
  "created_at": "2026-07-10T10:00:00.000Z",
  "updated_at": "2026-07-10T10:00:00.000Z",
}
```

**Системные строки (6 штук, засижены в каждом садике):**

| code                  | name_i18n.ru (дефолт)     | name_i18n.kk (дефолт)     |
| --------------------- | ------------------------- | ------------------------- |
| `psychologist`        | Психолог                  | Психолог                  |
| `speech_therapist`    | Логопед                   | Логопед                   |
| `music_teacher`       | Музыкальный руководитель  | Музыка жетекшісі          |
| `physical_ed`         | Инструктор по физкультуре | Дене шынықтыру нұсқаушысы |
| `nutritionist`        | Диетолог                  | Диетолог                  |
| `doctor_nutritionist` | **Врач Нутрициолог**      | Нутрициолог дәрігер       |

> Метки — **дефолты**, их можно менять через `PATCH`. `nutritionist` («Диетолог») и `doctor_nutritionist` («Врач Нутрициолог») — **разные роли**, оба остаются.

### 2.2 Список

```
GET /api/v1/admin/specialist-types?include_inactive=false
```

| query              | по умолчанию | смысл                                                                            |
| ------------------ | ------------ | -------------------------------------------------------------------------------- |
| `include_inactive` | `false`      | `false` — только активные (набор для дропдаунов). `true` — все, для CRUD-экрана. |

Ответ — **массив** (не `{ items }`), отсортирован по `sort_order`, затем `code`:

```json
[
  {
    "id": "…",
    "code": "psychologist",
    "name_i18n": { "ru": "Психолог", "kk": "Психолог" },
    "is_system": true,
    "is_active": true,
    "sort_order": 0,
    "created_at": "…",
    "updated_at": "…"
  },
  {
    "id": "…",
    "code": "doctor_nutritionist",
    "name_i18n": { "ru": "Врач Нутрициолог", "kk": "Нутрициолог дәрігер" },
    "is_system": true,
    "is_active": true,
    "sort_order": 5,
    "created_at": "…",
    "updated_at": "…"
  }
]
```

### 2.3 Создать (кастомную специальность)

```
POST /api/v1/admin/specialist-types
Content-Type: application/json
```

```jsonc
{
  "code": "art_therapist", // lowercase snake_case, letter-led, 2–64 симв. ИММУТАБЕЛЕН.
  "name_i18n": { "ru": "Арт-терапевт", "kk": "Арт-терапевт" }, // минимум одно из ru/kk непустое
  "is_active": true, // опц., по умолчанию true
  "sort_order": 100, // опц., по умолчанию 100 (после системных 0–5)
}
```

Ответ `201` — объект `specialist_type` (§2.1). `is_system` всегда `false` для созданных админом.

Ошибки: `400` (невалидный `code` — регэксп `^[a-z][a-z0-9_]{1,63}$`; или `specialist_type_name_required`), `409 specialist_type_code_taken`.

### 2.4 Обновить

```
PATCH /api/v1/admin/specialist-types/:id
```

```jsonc
{
  "name_i18n": { "ru": "Нейропсихолог (Психолог)", "kk": "Нейропсихолог" }, // опц.
  "is_active": false, // опц.
  "sort_order": 3, // опц.
}
```

- Можно применять и к **системным** строкам (переименовать / деактивировать / переупорядочить).
- `code` изменить **нельзя** (его нет в теле).

Ответ `200` — обновлённый объект. Ошибки: `404 specialist_type_not_found`, `400 specialist_type_name_required` (если `name_i18n` передан пустым).

### 2.5 Удалить

```
DELETE /api/v1/admin/specialist-types/:id
```

Ответ `204 No Content`.

Ошибки:

| код                                | статус | когда                                       | что показать                                                |
| ---------------------------------- | ------ | ------------------------------------------- | ----------------------------------------------------------- |
| `specialist_type_system_immutable` | `409`  | пытаются удалить системную строку           | «Системную специальность нельзя удалить — деактивируйте её» |
| `specialist_type_in_use`           | `409`  | код ещё используется сотрудниками/шаблонами | см. `details.usage` ниже                                    |
| `specialist_type_not_found`        | `404`  | нет такой строки                            | —                                                           |

Тело `specialist_type_in_use` содержит счётчики ссылок:

```json
{
  "statusCode": 409,
  "error": "specialist_type_in_use",
  "message": "specialist_type_in_use",
  "details": { "staff_members": 2, "diagnostic_templates": 1 }
}
```

→ покажи «Используется: 2 сотрудника, 1 шаблон диагностики. Деактивируйте вместо удаления».

### 2.6 Как это влияет на существующие экраны (Staff / Diagnostics)

`specialist_type` теперь **код из справочника** и **валидируется бэком против активного справочника**. Если передать код, которого нет среди активных строк → **`400 specialist_type_unknown`**.

**Сотрудники:**

- `POST /admin/staff` — тело `{ full_name, phone, role, specialist_type?, hired_at? }`. Для `role=specialist` `specialist_type` обязателен и должен быть активным кодом.
- `PATCH /admin/staff/:id` — то же; повторная валидация только когда меняется `role` или `specialist_type`.
- `GET /admin/staff?specialist_type=<code>` — фильтр по коду (без enum-ограничения).

**Диагностики:**

- `POST /admin/diagnostic-templates` — `specialist_type` должен быть активным кодом справочника (иначе `400 specialist_type_unknown`).
- В ответах диагностик поле `specialist_type` — это код; метку берём из `GET /admin/specialist-types` (`name_i18n`).

**Действие фронта:** дропдаун выбора специальности в формах сотрудника/шаблона строим из `GET /admin/specialist-types` (активные), value = `code`, label = `name_i18n[locale]`.

### 2.7 Что сделать на фронте (миграция)

1. **Убрать хардкод i18n-мапы** специальностей. Источник меток теперь `name_i18n` из `GET /admin/specialist-types`.
2. **`doctor_nutritionist` («Врач Нутрициолог») появляется автоматически** — отдельная метка на фронте больше не нужна, приходит из справочника.
3. **Построить CRUD-экран справочника** (список с `include_inactive=true` + create/patch/delete). Системные строки: скрыть/задизейблить кнопку «Удалить», оставить «Переименовать»/«Деактивировать».
4. **Дропдауны** специальностей (форма сотрудника, форма шаблона диагностики, фильтры) — из `GET /admin/specialist-types` (по умолчанию активные).
5. Про **«Нейропсихолог (Психолог)»**: раньше вы переименовали метку `psychologist` на фронте. Теперь два варианта — либо оставить свой клиентский override, либо один раз `PATCH` строку `psychologist` (`name_i18n.ru = "Нейропсихолог (Психолог)"`), и метка будет приходить с бэка. Рекомендую второй — единый источник истины.

### 2.8 Backward-compat

- Миграция засидила 6 системных строк для **всех существующих садиков**, поэтому любое ранее сохранённое `specialist_type` остаётся валидным.
- Новые садики получают те же 6 строк автоматически при создании.
- Ничего не удаляется и не переименовывается силой — только добавляется.

---

## 3. Справочник ошибок (полный)

Формат тела доменной ошибки: `{ "statusCode": <n>, "error": "<code>", "message": "<code>", "details"?: {…} }`.
Ошибки валидации DTO (class-validator) приходят в стандартном формате Nest: `{ "statusCode": 400, "message": ["…"], "error": "Bad Request" }`.

| Endpoint                | code                               | HTTP | Смысл                                         |
| ----------------------- | ---------------------------------- | ---- | --------------------------------------------- |
| POST logo               | `logo_required`                    | 400  | пустой/отсутствует файл                       |
| POST logo               | `logo_type_invalid`                | 400  | не `image/*`                                  |
| POST logo               | `logo_too_large`                   | 400  | > 5 МБ                                        |
| POST spec-types         | (валидация)                        | 400  | `code` не по регэкспу / `name_i18n` не объект |
| POST spec-types         | `specialist_type_name_required`    | 400  | нет непустого `ru`/`kk`                       |
| POST spec-types         | `specialist_type_code_taken`       | 409  | код уже есть в садике                         |
| PATCH spec-types        | `specialist_type_name_required`    | 400  | `name_i18n` передан пустым                    |
| PATCH/DELETE spec-types | `specialist_type_not_found`        | 404  | нет строки                                    |
| DELETE spec-types       | `specialist_type_system_immutable` | 409  | системную нельзя удалить                      |
| DELETE spec-types       | `specialist_type_in_use`           | 409  | ещё используется (`details.usage`)            |
| staff / diagnostics     | `specialist_type_unknown`          | 400  | код вне активного справочника                 |

---

## 4. TypeScript типы (copy-paste)

```ts
// ── N11: Логотип ──────────────────────────────────────────────
// Поле добавлено в существующий тип садика:
interface Kindergarten {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null; // ← НОВОЕ: presigned URL или null
  plan: string;
  settings: Record<string, unknown>;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ParentKindergarten {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null; // ← НОВОЕ
}

// POST/DELETE /admin/kindergartens/me/logo →
interface KindergartenLogoResponse {
  logo_url: string | null;
}

// ── N12: Справочник специальностей ────────────────────────────
type SpecialistTypeLabels = { ru?: string; kk?: string } & Record<string, string>;

interface SpecialistType {
  id: string;
  code: string; // immutable
  name_i18n: SpecialistTypeLabels;
  is_system: boolean; // true → нельзя удалить
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// GET /admin/specialist-types?include_inactive= → SpecialistType[]

interface CreateSpecialistTypeBody {
  code: string; // ^[a-z][a-z0-9_]{1,63}$
  name_i18n: SpecialistTypeLabels; // минимум одно из ru/kk непустое
  is_active?: boolean;
  sort_order?: number;
}

interface UpdateSpecialistTypeBody {
  name_i18n?: SpecialistTypeLabels;
  is_active?: boolean;
  sort_order?: number;
}

interface DomainErrorBody {
  statusCode: number;
  error: string; // машинный code
  message: string;
  details?: Record<string, unknown>; // напр. { staff_members, diagnostic_templates } у specialist_type_in_use
}
```

---

**Вопросы / несоответствия** — пишите в этот файл или в тред N11/N12. Все пути и коды выше сверены с реализацией (DTO/контроллеры), Swagger на `/docs` актуален после деплоя.
