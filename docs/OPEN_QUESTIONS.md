# Open Questions & Blockers — Shyraq Admin Web

Реестр решений и blocker'ов. **Правило (CLAUDE.md §2 first-document):** ничего из секции `open` не реализуется, пока статус ≠ `resolved`. Расхождение docs↔backend или внутри docs → новая запись сюда (статус `open`), обсудить с владельцем, обновить docs, потом код.

Статусы: `resolved` (решено, можно кодить) · `open` (НЕ кодить) · `parked` (отложено по фазе backend).

---

## A. Решённые владельцем (resolved)

### A1 — Theming scope · resolved (2026-05-18)

Все темы из `app.jsx#THEMES` (green/orange/blue/mono/warmCream/forestMint/oceanBlue/dark) + радиусы — сохраняем полностью, user-facing, отдельная вкладка **«Дизайн»** в `/settings`, персист в `ui-store` (localStorage), apply на `:root` при boot. → B1 (инфра тем) + B15 (UI вкладки).

### A2 — Token storage · resolved (2026-05-18)

Access — in-memory; refresh — localStorage; silent single-flight refresh. Принято на MVP (Admin публичен, не за VPN; HANDOFF §2.2 допускает). Cookie-flow → future (см. C2). → B1.

### A3 — Test gate · resolved (2026-05-18)

Обязательный гейт каждого батча: `typecheck` + `lint --max-warnings=0` + Vitest unit/component. Playwright/e2e **не заводим** — браузер-QA делает владелец. → все батчи.

### A4 — Sequencing · resolved (2026-05-18)

После инфра-батчей (B0–B3) строго P0→P1→P2 по приоритету DESIGN §9. Порядок зафиксирован в IMPLEMENTATION_PLAN Tracker.

### A5 — Стек/конвенции · resolved (2026-05-18)

Зеркало `../frontend_superadmin/` (стек, folder structure, layer/coding rules, batch-формат). Отличие: Admin **берёт** `socket.io-client` (WS для тостов/инвалидации; superadmin не использует WS).

### A6 — Routing canonical source · resolved (2026-05-18)

Маршруты — по HANDOFF §28 sitemap. VIS-роутер (`app.jsx`) — только визуальный референс; при расхождении путей §28 первичен.

### A7 — Auth/users DTO casing + otp/request response · resolved (2026-05-18)

Бывш. §B1. При W2 (B2-AUTH) обнаружено и **подтверждено по live `/docs-json`** расхождение HANDOFF §3 с фактическим контрактом. Решение владельца: HANDOFF §3 обновлён под факт. Зафиксировано:

- **Конвенция:** request-body DTO — **camelCase**; response — **snake_case** (NestJS, стабильно Phase A–C).
- `POST /auth/otp/request` → `202 {otp_ref, expires_in}` (не `{sent, resend_after_sec}`).
- `POST /auth/refresh` тело `{refreshToken}`; `POST /auth/role/select` тело `{kindergartenId, role?}` (`role` опц., required только при ≥2 ролях в садике; Admin Web шлёт `role:"admin"`); `POST /auth/logout` тело `{refreshToken?}`.
- auth-response содержит доп. `user` (additive); `PATCH /users/me` тело camelCase `{fullName, avatarUrl, dateOfBirth, iin, locale}`.
  Код B2-AUTH/B3-DASHBOARD написан defensive Zod и conform к live backend (gate зелёный). HANDOFF §3 правлен в этом же коммите (first-document, CLAUDE §2). → применять везде в B4+.

> **Уточнение (§A8, 2026-05-18):** casing — **per-module, не глобален**. «request = camelCase» верно только для модулей auth/users. Children-модуль — snake_case request-DTO. Перед каждым data-слайсом сверять per-endpoint по live `/docs-json`; не экстраполировать конвенцию на новые модули.

### A8 — Children: пути `/children/*`, snake_case request-DTO, отдельные эндпоинты карточки · resolved (2026-05-18)

Бывш. §B2. При старте W3/B4 сверка по live `/docs-json` выявила расхождение HANDOFF §5 ↔ backend и противоречие §A7 (casing). **Решение владельца: как §A7** — live backend = факт; код B4 conform к live с defensive Zod; HANDOFF §5 + §A7 + DESIGN §6.3 правятся под факт в коммите B4 (first-document). Зафиксированный фактический контракт (tag «Children (Admin)», все пути — relative to `/api/v1`):

- **Префикс:** `/children/*` (БЕЗ сегмента `/admin`). **Исключение:** timeline = `/admin/children/{id}/timeline`.
- **Casing:** request-DTO детей — **snake_case** (`full_name, iin, date_of_birth, gender, photo_url, current_group_id, medical_notes, allergy_notes, to_group_id, reason, archive_reason, group_id, user_phone, user_id, role, can_pickup`). Response — snake_case. (Конвенция per-module, см. уточнение §A7 выше.)
- `GET /children?status(card_created|active|archived)&current_group_id&q&limit(1..100,def20)&offset(def0)` → `{data:[ChildDto], meta:PaginationMetaDto}`. Поиск (ФИО/ИИН) = параметр `q`.
- `POST /children` `CreateChildDto` req `[full_name, date_of_birth]` (+`iin?,gender?(male|female),photo_url?,current_group_id?,medical_notes?,allergy_notes?`) → ChildDto, статус `card_created`.
- `GET /children/{id}` → `{child:ChildDto, guardians:[GuardianDto]}` (НЕ полная агрегация — группа/история/timeline/платежи/диагностика тянутся отдельными запросами/preview-заглушками).
- `PATCH /children/{id}` `UpdateChildDto` (все опц., nullable: `iin/gender/photo_url/medical_notes/allergy_notes`, +`full_name/date_of_birth`). `POST /children/{id}/photo {photo_url}` — отдельная установка фото (presigned-объект — через `/storage/presigned-upload`+`/storage/confirm-upload`, `purpose=child_photo`).
- `POST /children/{id}/group {group_id}` (первичное назначение) · `DELETE /children/{id}/group` (снять) · `POST /children/{id}/transfer {to_group_id, reason?}` → ChildDto (перевод). Ошибки 404 `child_not_found`/`group_not_found`, 409 `child_already_in_group`/`archived_child_not_transferable`.
- `POST /children/{id}/archive {archive_reason}` (1..500) → ChildDto (`status:archived`,`archived_at`,`archive_reason`). 409 `child_already_archived`, 422 `archive_reason_required`.
- `POST /children/{id}/reactivate {}` → `{child:ChildDto, requires_new_tariff_assignment:true}`. 409 `child_not_archived`. UI → подсказать назначить тариф (`/billing/tariff-assignments`).
- `GET /children/{id}/status-history?limit(≤200)&offset` → `{items:[ChildStatusHistoryDto{id,previous_status,new_status,previous_archive_reason,archive_reason,changed_by_user_id,changed_at}], total}` (offset).
- `GET /children/{id}/guardians` → `[GuardianDto]`. `POST /children/{id}/guardians` `InviteGuardianDto {user_phone XOR user_id, role(primary|secondary|nanny), can_pickup?}` — **приглашение по телефону/user_id, без поля ФИО**. `PATCH /children/{id}/guardians/{guardianId} {role?, can_pickup?}`. `POST /children/{id}/guardians/{guardianId}/revoke` (пустое тело). GuardianDto.status enum = `pending_approval|approved|rejected|revoked`.
- `GET /children/{id}/group-history` → `[ChildGroupHistoryDto{id,child_id,from_group_id,to_group_id,transferred_at,transferred_by_staff_id,reason}]`.
- `GET /admin/children/{id}/timeline` → `{items:[TimelineEntryResponseDto], nextCursor}` — **cursor** (не offset).
- «Отозвать все QR»: `POST /admin/qr/revoke-all/{userId}` (§23) → `{revoked_count}`.

ChildDto nullable-поля (`iin/gender/photo_url/current_group_id/enrollment_date/archived_at/archive_reason/medical_notes/allergy_notes`) — Zod defensive `.nullable()`. → применять в B4; код B4 правит error-map `+= archive_reason_required`.

**Addendum (2026-05-18, подтверждено live при W3 slice-1):** casing неоднороден даже внутри модуля children — **response per-endpoint**: `ChildDto/GuardianDto/ChildStatusHistoryDto/ChildGroupHistoryDto` = snake_case; **`TimelineEntryResponseDto` и `RevokeAllQrResponseDto` = camelCase** (`id, kindergartenId, childId, entryType('check_in'|'check_out'|'activity'|'meal'|'nap'|'note'|'photo'|'mood'|'medication'), title?, body?, mediaUrls?:string[], metadata?, recordedBy?, entryTime, createdAt`; `{revokedCount}`). `PaginationMetaDto = {total, limit, offset}` (numbers). `nextCursor` НЕ в required (nullable). Подтверждает правило §A7: сверять per-endpoint, не экстраполировать. UI B4 обращается к полям через Zod-парсенные TS-типы из `api/children.ts` (имена как в схеме — `entryTime`, `revokedCount`, `meta.total`).

### A9 — `GET /users/me` плоский (без roles/kgs); reload-restore сессии · resolved (2026-05-18)

Контекст: при фиксе бага «после hard-reload в топбаре/дашборде нет имени/садика» сверка live `/docs-json` выявила: `GET /users/me` → плоский `UserResponseDto` (`id, phone, full_name, avatar_url, iin, date_of_birth, locale`), **без `roles[]`/`kindergartens[]`** — расхождение с HANDOFF §141 (там обещано `+ roles[] + kindergartens[]`). `roles[]`/`kindergartens[]` отдаются только в `AuthResponseDto` (`/auth/otp/verify|refresh|role/select`); silent-refresh в `api/client.ts` извлекает лишь токены (и не должен трогать стор — layer rule).

Решение (прецедент §A7/§A8: live = факт, first-document): HANDOFF §141 правлен под факт в этом коммите. **Reload-restore (B3-фиксап):** на boot шелла (`App.tsx`), когда session пуст и есть refresh-токен — гидрируем `user` ← `GET /users/me`, `currentKindergarten` ← существующий `GET /kindergartens/me` (`KindergartenDto`). Это чинит имя/телефон/аватар (топбар, user-menu), приветствие и название садика (дашборд). **`roles[]` после reload не восстанавливаются** — ни один отгруженный экран по ним не гейтит (sidebar статичен, дашборд — только садик, children — без ролей), forward-looking. Полное восстановление ролей без re-login = backend-need: каталогизировано в **[`BACKEND_NEEDINGS_HANDOFF.md`](BACKEND_NEEDINGS_HANDOFF.md) N4** (привести `/users/me` к §141 ИЛИ `GET /auth/session` → `AuthResponseDto`). Не блокирует MVP-поверхность.

---

## B. Открытые (open — НЕ кодить до resolve)

### B3 — Dashboard: `dashboard/summary` и `dashboard/payments-overview` отсутствуют на live backend · open (2026-05-18)

Контекст: при ручном QA W3 обнаружено — код B3 (`src/api/dashboard.ts`) зовёт `GET admin/dashboard/summary` и `admin/dashboard/payments-overview` (по HANDOFF §26), но на live `/docs-json` (2026-05-18) существует **только** `GET /api/v1/admin/dashboard/attendance-today`. summary/payments-overview → **404** (нет ни под dashboard, ни под summary/overview/stats/analytics). Blocker: страница Дашборд (`/`) — 2 виджета пустые/ошибка. **НЕ блокирует B4** (дети используют корректные `/children/*`, §A8; путь верен, 401 при протухшей сессии — отдельно, не баг кода).

Нужно решение владельца: (а) backend Phase A не выкатил эти эндпоинты — ждать backend? (б) скрыть/заглушить summary+payments-overview виджеты на дашборде (graceful «нет данных»/«раздел недоступен») до появления backend? (в) иные пути аналитики? Гипотеза: как §A8 — backend = факт; B3-фоллоуап: дашборд деградирует gracefully на отсутствующих эндпоинтах (а не 404-ошибка виджета), HANDOFF §26 правится под факт. **Отдельный B3-фиксап, в коммит B4 не входит.**

Формат записи:

```
### B<n> — <короткий заголовок> · open (<дата>)
Контекст: <что обнаружено, где>. Блокирует: <батч/слайс>.
Нужно решение: <вопрос владельцу/backend>. Гипотеза: <если есть>.
```

---

## C. Отложено по фазе backend (parked)

### C1 — Phase C: Face ID + тест камер · parked

HANDOFF §22,§9.2,§29: admin-эндпоинты конфигурации есть, но распознавание/видеопоток/`cameras/:id/test` — edge, Phase C. **Строим UI как видимые заглушки** «доступно позже», к данным не подключаем. → B14 (камеры test-stub), B15 (Face табы).

### C2 — Phase B: Fiscal full, real SMS/ePay/ОФД/S3, cookie-auth · parked

HANDOFF §17,§29: Fiscal — read-only stub (B13 backend), full CRUD/retry/queue/report — Phase B (B15 backend). Реальные провайдеры (Halyk ePay, ОФД, SMS, S3) — Phase B, **контракты не изменятся**. Fiscal DTO строим расширяемым типом. Cookie refresh-flow (вместо localStorage, A2) — future, не блокирует MVP. → B15 заглушки.

### C3 — `/admin/*` RBAC-нюанс для DLQ · parked/watch

HANDOFF §24: исторически `/admin/*` мог быть заскоплен строго на роль `admin`. Если валидный админ получает 403 на lifecycle-DLQ — это backend-баг, **эскалировать**, не обходить на фронте. Проверить на проде в B15.

### C4 — GuardianDto не содержит ФИО/телефон пользователя · parked/watch (2026-05-18, W3/B4)

Контекст: при B4 (вкладка «Опекуны») обнаружено — live `GuardianDto` (§A8) содержит только `user_id` (UUID), без `full_name`/`phone`/`relationship`. Дизайн `screens-core.jsx` ChildDetail рисует ФИО/телефон/связь опекуна (это были mock-данные прототипа). Batch-эндпоинта резолва `users` для отображения нет в scope B4.

Решение (design-fidelity допускает отклонение под backend-контракт, CLAUDE §6): фронт B4 **деградирует честно** — не выдумывать имя/инициалы из UUID; показывать реальные поля (роль/статус/can_pickup/has_approval_rights) + идентификатор пользователя явно помеченным (не как «имя»); колонки ФИО/телефон/связь — graceful («—»/скрыто), лейаут таблицы по прототипу сохранён. **Эскалация backend:** рекомендовать встроить в `GuardianDto` отображаемую инфу пользователя (`user_full_name`, `user_phone`, `relationship`) ИЛИ предоставить users-lookup. Пересмотреть когда backend расширит контракт или появится users-резолв (B6/B14/профиль). Не блокирует B4.

### C5 — Storage presigned-upload (фото ребёнка) не реализован на backend · parked/watch (2026-05-18, W3/B4)

Контекст: при ручном QA B4 загрузка фото в `/children/new` → `POST /api/v1/storage/presigned-upload` = **404**. Сверка live `/docs-json`: presigned-эндпоинтов (`/storage/presigned-upload`, `/storage/confirm-upload`, `/storage/download/:key`) **нет**; существует только прямой `POST /api/v1/admin/content/upload-media` (multipart → `{url,key,bytes}`) + `POST /api/v1/children/{id}/photo {photo_url}` + `GET /api/v1/media/{kgId}/{yyyyMm}/{filename}`. Код B4 (`api/storage.ts`, `hooks/use-storage.ts`, `components/forms/file-upload.tsx`) построен **верно по HANDOFF §2 (стр.83) / DESIGN §183** (presigned 3-step, `purpose=child_photo`) — это не выдумка фронта, а документированный контракт.

Решение владельца (уточнено у backend, 2026-05-18): фича `child_photo` на backend **ещё не готова** (presigned — Phase B, см. C2; `upload-media` под `child_photo` backend не поддерживает). **Оставляем как есть** — код presigned не трогаем, 404 всплывает как обработанная ошибка (тост, не краш), карточка создаётся без фото (`photo_url?` опционален). НЕ переписывать на `upload-media`, ничего не доинвентить. Сделать фичу, когда backend выкатит storage для child_photo. **Не блокирует B4** (фото — единственная заблокированная подфича; CRUD/группы/опекуны/архив работают).

Пересмотр: когда backend сообщит о готовности child_photo storage → реализовать по фактическому контракту, обновить HANDOFF §2/§5 + DESIGN §183 (presigned vs multipart) под факт (first-document). Связано с C2 (S3/presigned Phase B).

---

_Производный документ. Первоисточники — [`ADMIN_FRONTEND_HANDOFF.md`](ADMIN_FRONTEND_HANDOFF.md), [`ADMIN_DESIGN_SPEC.md`](ADMIN_DESIGN_SPEC.md). Обновлять при изменении backend-scope или решений владельца._
