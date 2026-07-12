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

### A10 — Dashboard summary/payments-overview/attendance-today — backend имплементирует (owner-escalated) · resolved (2026-05-18)

Бывш. §B3. При ручном QA W3: `src/api/dashboard.ts` зовёт `GET /api/v1/admin/dashboard/{summary,payments-overview}` (по HANDOFF §26), но на live `/docs-json` (2026-05-18) есть только `attendance-today` → 404, 2 виджета дашборда пустые.

Решение владельца: владелец **передал backend** задачу реализовать **3 эндпоинта** — `/api/v1/admin/dashboard/summary`, `/api/v1/admin/dashboard/payments-overview`, `/api/v1/admin/dashboard/attendance-today` (контракт по HANDOFF §26). Имплементация backend **в работе (ждём выполнения)**. FE-код дашборда **уже корректен** (пути/DTO по §26) — **НЕ трогать, НЕ graceful-degradить, НЕ переписывать**: виджеты автоматически заработают, когда backend выкатит (404 уже обрабатывается как ошибка виджета, не краш). Не блокирует никакие батчи — дашборд единственная затронутая поверхность.

Когда backend сообщит о готовности → `pnpm gen:api` + ручной QA дашборда + сверить HANDOFF §26 под факт (first-document, прецедент §A7/§A8); занести запись в [`BACKEND_NEEDINGS_HANDOFF.md`](BACKEND_NEEDINGS_HANDOFF.md) (dashboard endpoints, in-progress) ближайшим doc-коммитом.

### A11 — Enrollments: camelCase DTO, page-based pagination, expanded CreateDto · resolved (2026-05-18)

Контекст: при B5 (data layer enrollments) сверка live `/docs-json` выявила расхождения HANDOFF §6 с фактическим контрактом. Решение: прецедент §A7/§A8 — live = факт. Зафиксированные расхождения:

1. **Casing:** HANDOFF §6 указывал snake_case (`contact_name, contact_phone, child_name, child_dob, assigned_to`). Live — **camelCase** (`contactName, contactPhone, childName, childDob, childIin, assignedTo, toStatus, currentGroupId`). Response тоже camelCase (`kindergartenId, childId, statusChangedAt, enrollmentId, fromStatus, toStatus, changedBy`). Per-module конвенция, не экстраполировать.
2. **Pagination:** HANDOFF §2.5 подразумевал offset-based (majority). Live enrollments — **page-based** (`?page=1&limit=20` → `{data, total, page, limit}`). НЕ offset/limit.
3. **CreateEnrollmentDto:** HANDOFF указывал `{contact_name, contact_phone, child_name, child_dob, source}`. Live расширен: `{contactName*, contactPhone*, childName?, childDob?, childIin?, source?, notes?, assignedTo?}`. Required — только `contactName` + `contactPhone` (а не 5 полей).
4. **Transition response:** возвращает `{enrollment, child}` где `child` is a full `ChildDto` (snake_case, `id` string UUID) present only when `toStatus=card_created`; `null` otherwise. FE schema narrowed to `z.object({ id: z.string() }).passthrough().nullable().optional()` for type-safe child-id access without over-modeling the full ChildDto (children domain owns that).

HANDOFF §6 обновлён под факт в этом коммите. Код B5 conform к live с defensive Zod.

### A12 — Groups: archive/restore (not deactivate), no pagination, mentor via groups not staff · resolved (2026-05-19)

Контекст: при B6 (data layer groups+staff) сверка live `/docs-json` выявила расхождения HANDOFF §7/§8 с фактическим контрактом. Решение: прецедент §A7/§A8/§A11 — live = факт. Зафиксированные расхождения:

1. **Groups deactivate → archive/restore:** HANDOFF §7 описывал `POST /groups/{id}/deactivate`. Live — **`POST /groups/{id}/archive`** и **`POST /groups/{id}/restore`** (семантически то же: устанавливает/снимает `archived_at`). Нет отдельного deactivate/activate.
2. **Groups list — plain array, no pagination:** HANDOFF §2.5 подразумевал offset (majority). Live `GET /groups` → **`GroupDto[]`** (plain array). Filter param: `archived` (boolean). Достаточно для садика (десятки групп, не тысячи).
3. **Groups children — no dedicated endpoint:** HANDOFF §7 упоминал `GET /groups/{id}/children`. Live не имеет такого — используем `GET /children?current_group_id=<id>` (уже реализовано B4).
4. **Groups casing:** snake_case throughout (request + response). CreateGroupDto: `{name*, capacity*, age_range_min?, age_range_max?, current_location_id?}`. UpdateGroupDto: all optional, nullable fields (`age_range_min, age_range_max, current_location_id` can be null).
5. **Mentor management — on groups, not staff:** HANDOFF §8 описывал `POST /admin/staff/{id}/groups/assign {group_id}` и `POST /admin/staff/{id}/groups/:groupId/primary`. Live — **mentor binding через группу**: `POST /groups/{id}/mentor {staff_member_id}`, `DELETE /groups/{id}/mentor`, `GET /groups/{id}/mentor`, `GET /groups/{id}/mentor-history`. AssignMentorDto: `{staff_member_id}`. Response: `GroupMentorDto {id, kindergarten_id, group_id, staff_member_id, is_primary, assigned_at, unassigned_at(nullable), created_at}`.

### A13 — Staff: snake_case, plain array list, search param, archive/restore endpoints · resolved (2026-05-19)

Контекст: продолжение A12, staff-эндпоинты. Зафиксированные расхождения:

1. **Staff prefix:** `GET/POST /admin/staff`, `GET/PATCH /admin/staff/{id}` — **with `/admin/`** prefix. Confirmed.
2. **Staff casing:** snake_case throughout (request + response). CreateStaffDto: `{full_name*, phone*, role*, specialist_type?, hired_at?}`. UpdateStaffDto: `{full_name?, role?, specialist_type?(nullable), hired_at?(nullable), fired_at?(nullable)}`.
3. **Staff list — plain array, no pagination:** `GET /admin/staff` → **`StaffMemberDto[]`** (plain array). Filter params: `role`, `is_active` (boolean), `specialist_type`, `archived` (boolean), `search` (string — NOT `q`).
4. **Staff additional endpoints:** `POST /admin/staff/{id}/archive` и `POST /admin/staff/{id}/restore` — дополнительно к deactivate/activate. Both return StaffMemberDto.
5. **StaffMemberDto nullable fields:** `full_name`, `phone`, `specialist_type`, `hired_at`, `fired_at`, `archived_at` — all nullable.
6. **No staff-side group assign/primary endpoints:** See A12 point 5. Mentor assignment managed through groups endpoints.

HANDOFF §7/§8 будут обновлены под факт в wave-коммите B6. Код B6 conform к live с defensive Zod.

### A14 — Invoices: snake_case, plain-array list (no pagination envelope), required period, line_items-only detail · resolved (2026-05-19)

Контекст: при B7 (invoices data+UI) сверка live `/docs-json` выявила расхождения HANDOFF §13/§2.5 ↔ факт. Решение: прецедент §A7/§A8/§A11 — live = факт. Зафиксированные расхождения (HANDOFF §13 правлен под факт в wave-коммите B7+B8 — first-document):

1. **Casing:** snake_case (request + response). Per-module, не экстраполировать.
2. **Path:** `/api/v1/admin/invoices*` (WITH `/admin/`) — совпадает с §13.
3. **List pagination:** HANDOFF §2.5 подразумевал offset. Live `GET /admin/invoices` имеет `cursor`+`limit`-параметры, но возвращает **bare `InvoiceResponseDto[]`** — БЕЗ envelope/`total`/`next_cursor`. Реальной cursor-пагинации нет; фронт использует только `limit` (cap), список клиентский. Defensive: `z.array(InvoiceSchema)`.
4. **Filters:** не единичный `due_date` — а `due_date_from`+`due_date_to` (range) + `period_start`+`period_end`+`status`+`child_id`+`invoice_type`.
5. **CreateInvoiceOneOffDto:** `period_start`/`period_end` **обязательны** (§13 указывал опц.). Required: `child_id, invoice_type, amount_due, due_date, period_start, period_end`; опц. `description, discount_pct, discount_reason, line_items`. `CreateLineItemDto = {description*, quantity*(≥1), unit_price*(≥0), tariff_plan_id?}`.
6. **Detail DTO:** `InvoiceResponseDto` содержит только `line_items: InvoiceLineItemResponseDto[]` + плоские поля скидки (`discount_pct?, discount_reason?, amount_after_discount`). Массивов `payments/refunds/fiscal_receipts/discounts` нет → §C14 (честная деградация секций карточки), BACKEND_NEEDINGS N6.
7. `InvoiceLineItemResponseDto = {id, invoice_id, kindergarten_id, description, tariff_plan_id?, quantity, unit_price, line_total, created_at}`. `manual-mark-paid` тело `{paid_at?, payer_user_id?, note?}`; `cancel` тело `{reason?}`. nullable-поля (`tariff_plan_id, discount_pct, discount_reason, description, prorated_for_days`) — Zod `.nullable()`. Код B7 conform к live с defensive Zod.

### A16 — Tariffs & Payments: enum/schema discrepancies, bare-array lists, close endpoint, no provider_payload · resolved (2026-05-21)

Контекст: при B9 (payments + tariff-plans + tariff-assignments) сверка live `/docs-json` выявила расхождения HANDOFF §13 (payments)/§14 (tariffs) с фактическим контрактом. Решение: прецедент §A7/§A8/§A14 — live = факт. Зафиксированные расхождения (HANDOFF §13+§14 правлены под факт в wave-коммите B9 — first-document):

1. **`tariff_type` enum:** HANDOFF §14: `monthly_base/additional_service/late_pickup/meal_upgrade`. Live: `monthly | additional_service | late_pickup_fee | prepayment_3m | prepayment_6m | prepayment_12m | prepayment_24m | other`.
2. **`applies_to` enum:** HANDOFF §14: `child/group/age_range`. Live: `all_children | group | age_range | individual`.
3. **`description` in `TariffPlanResponseDto`:** i18n JSONB `{ru, kz}` (key `kz`, not `kk`; matches §2.4).
4. **`POST /admin/tariff-assignments/:id/close`:** separate endpoint (live). Effectively sets `valid_until = today`.
5. **`assigned_by`** in `TariffAssignmentResponseDto`: read-only from `req.user`; on create NOT sent.
6. **Payments list:** `GET /admin/payments` filter params `from_date`/`to_date` (NOT `from`/`to`). Ответ — bare `PaymentResponseDto[]`.
7. **`PaymentResponseDto` WITHOUT `provider_payload`:** contains `provider, provider_txn_id, idempotency_key, redirect_url?, deeplink?, status, paid_at?, refund_id?, payer_user_id?`. Design prototype's JSON-viewer equivalent: show full DTO snake_case (read-only, for support). NOT inventing `provider_payload`.
8. **All three lists (payments, tariff-plans, tariff-assignments):** bare `[]`, no pagination envelope. Defensive: `z.array(Schema)`.

HANDOFF §13+§14 обновлены под факт в wave-коммите B9. Код B9 conform к live с defensive Zod.

### A17 — Refunds & Custom-Discounts: bare-array refunds, page-based discounts, snake_case, I18nFieldDto `kk` key in create · resolved (2026-05-21)

Контекст: при B10 (refunds + custom-discounts) сверка live `/docs-json` выявила расхождения HANDOFF §16/§18 с фактическим контрактом. Решение: прецедент §A7/§A8/§A14/§A16 — live = факт. Зафиксированные расхождения (HANDOFF §16+§18 правлены под факт в wave-коммите B10 — first-document):

1. **Refunds list:** `GET /admin/refunds` ответ — **bare `RefundResponseDto[]`** (despite having `cursor`+`limit` params). No pagination envelope. Defensive: `z.array(Schema)`. Matches invoices/payments pattern (§A14.3/§A16.8).
2. **Custom discounts list:** `GET /admin/custom-discounts` ответ — **page-based** `{rows, total, page, limit}` (`CustomDiscountListResponseDto`). Filter params: `status, valid_from_to, valid_until_from, target_type, page, limit`.
3. **Custom discount detail:** `GET /admin/custom-discounts/:id` — envelope `{discount: CustomDiscountResponseDto, stats: {count, total_amount_applied}}`. NOT flat DTO.
4. **Custom discount applications:** page-based `{rows, total, page, limit}` (`CustomDiscountApplicationListResponseDto`).
5. **`I18nFieldDto`** for create/update body uses key `kk` (BCP 47), but response JSONB stores `kz` (historical). Consistent with §2.4.
6. **`CreateCustomDiscountDto`:** `name` required (I18nFieldDto with `ru`+`kk`), `notification_title`/`notification_body` **required when `notify_on_activation=true`** (422 if missing). Confirmed.
7. **`RejectRefundDto`:** `reason` required 1..500, overwrites original reason column (single-column design).
8. **`ApproveRefundDto`:** empty body `{}`.
9. **RefundResponseDto fields:** `invoice_id`, `processed_by`, `provider_ref` — all nullable strings. `status` enum: `pending|approved|processed|rejected`.
10. **Casing:** snake_case throughout for both modules (request + response). Per-module, not extrapolated.

HANDOFF §16+§18 обновлены под факт в wave-коммите B10. Код B10 conform к live с defensive Zod.

### A18 — Schedule & Meal-Plans: mixed casing per-module (schedule camelCase, meal-plans snake_case), global copy-week DTO · resolved (2026-05-26)

Контекст: при подготовке к B11 (Schedule + Meal Plans) сверка live `/docs-json` выявила расхождения HANDOFF §10/§11 ↔ факт. Решение: прецедент §A7/§A8/§A11/§A14/§A16/§A17 — live = факт. Зафиксированные расхождения (HANDOFF §10+§11 правлены под факт в pre-B11 docs-fixup — first-document):

1. **Casing mixed per-module:**
   - `/admin/schedule/*` — **camelCase** (request + response): `groupId, validFrom, validUntil, isActive, dayOfWeek, startTime, endTime, activityName, locationId, weekStartDate, createdAt, copiedFrom, kindergartenId, startsAt, endsAt, templateSlotId, createdBy`. Совпадает с паттерном §A11 (enrollments).
   - `/admin/meal-plans/*` — **snake_case** (request + response): `meal_type, dish_name, group_id, is_published, copied_from, items, created_at, photo_url, plans_created, plans_skipped`. Совпадает с паттерном §A14/§A16 (invoices/payments/tariffs).
   - НЕ экстраполировать на соседние модули. В одной фиче (B11) два API-клиента с разным стилем — это норма для этого backend.
2. **Copy-week DTO общий между §10 и §11:** `CopyWeekDto = {fromMonday*}` (camelCase, единый schema!), хотя соседние DTO модулей разные. ISO date YYYY-MM-DD, обязан быть понедельником. Target Monday = `fromMonday + 7`.
3. **Copy-week scope глобальный:** `POST /admin/schedule/week-snapshots/copy` принимает только `fromMonday` — копирует **все группы садика**, нет фильтра `groupId`. HANDOFF §10 ранее обещал per-group `{group_id, source_week_start_date}` — переписан под факт. Per-group вариант — backend-ask §B1 / BACKEND_NEEDINGS N9. Response: `WeekCopySummaryDto = {copiedGroups, skippedGroups, totalEvents}`.
4. **Meal-plans copy-week response asymmetric:** `CopyWeekSummaryDto = {plans_created, plans_skipped}` (snake_case, без `totalItems`-аналога). Не путать с `WeekCopySummaryDto` (schedule).
5. **`MealPlanResponseDto.source` enum live:** `manual | cron | copied`. HANDOFF §11 ранее писал `manual | auto_copied_from_previous_week` — переписан под факт.
6. **`UpdateMealPlanDto.notes` — i18n (MultiLangTextDto), не plain string.** HANDOFF §11 переписан → в UI используется PairedI18nField.
7. **Activity events admin-CRUD доступен на backend:** `POST/PATCH/DELETE /admin/schedule/activity-events[/:id]` + `CreateActivityEventDto/UpdateActivityEventDto` существуют. HANDOFF §10 ранее обещал read-only → переписан. UI-дизайн VIS этого CRUD не описывает → §B2 (design ask). На B11 строим минимальный CRUD на существующих primitives (см. §B2).
8. **`week-rollout/run` не выставляется в Admin UI:** существует на backend, scope SuperAdmin / cron. HANDOFF §10 переписан с явной пометкой. UI кнопки нет — решение владельца B11-prep.

HANDOFF §10+§11 обновлены под факт в pre-B11 docs-fixup. Код B11 пишется conform к live с defensive Zod (`z.array(Schema)` для list-эндпоинтов на случай bare-array).

### A19 — i18n key унифицирован на `kk` (B22b backend sweep); `kz` — backward-compat shim до B23 · resolved (2026-05-27)

Контекст: при подготовке к B12 (content) чтение backend-кода (`../backend_shyraq_v2/src/shared-kernel/utils/i18n-locale-normalizer.ts`) выявило финальную правду — **backend уже стандартизовал на `kk` everywhere** через sweep B22b T1:

> _«B22b standardises on `kk` everywhere, but for one release we still accept inbound payloads that carry only `kz`. … The fallback is scheduled to be removed in B23; the same shape is applied at the DB layer by the `B22I18nKzToKk` data migration.»_

Это **переворачивает** ранний вывод §A19 (от 2026-05-26) о «per-module сосуществовании»: на самом деле `kz` — это legacy, который мигрирует в `kk` через одно-релизный shim. **Решение для фронта:**

1. **Фронт шлёт только `kk`** во всех модулях (content, meal-plans, custom-discounts, holidays — и т.д.). `kz` НЕ генерируется при создании/редактировании.
2. **Фронт читает только `kk`** в новых ответах. Backend нормализует на input (`normalizeLegacyKzLocale` @Transform на `title_i18n`/`body_i18n`/etc.) и применяет DB-миграцию `B22I18nKzToKk` к существующим записям.
3. **`lib/jsonb-i18n.ts` сохраняет fallback на `kz`** для **чтения** старых, ещё не промигрированных записей (на случай, если кому-то прилетит до завершения миграции). Резолв: `obj[locale === 'kk' ? 'kk' : locale] ?? obj.kz ?? obj.ru ?? ''`. Уже работает (B10 discounts, B11 meals) — добавить unit-тест на `kk` + fallback `kz` при B12.
4. **`PairedI18nField`** во всех формах шлёт **только `{ru, kk}`** — без `kz`. Per-module enum / map не нужен.
5. **`CLAUDE.md §3` обновлён** под канон: «канонический ключ — `kk` (BCP 47); legacy `kz` принимается на input один релиз (backend нормализует), удаляется в backend B23».
6. **Заголовок `x-custom-lang`:** значения `ru | kk`, никогда `kz`/`en`.
7. **Backend B23 удалит shim** — фронт уже совместим (не зависит от `kz` на input, читает с fallback). Когда backend выкатит B23 — снести fallback на `kz` в `jsonb-i18n.ts` (мелкий cleanup, не блокер).

Предыдущая редакция §A19 (от 2026-05-26) о «per-module coexistence» **аннулирована** — это был промежуточный compromise. Финальный канон — `kk` everywhere.

### A20 — Content media PATCH-семантика: full-replace на draft/scheduled, immutable на published · resolved (2026-05-27, backend dev confirmation)

Контекст: при B12 prep обнаружено, что `UpdateContentDto` **не содержит `media_urls`** — нет способа manually очистить/изменить массив URLs. Backend dev (2026-05-27) подтвердил финальный контракт:

1. **`PATCH /admin/content/:id` без `files`** на draft/scheduled → `media_urls` не трогается, обновляются только text/target/etc.
2. **`PATCH` с `files` (1+)** на draft/scheduled → `media_urls` **полностью заменяется** загруженным набором (старые URLs стираются из ряда; физические файлы остаются в storage — best-effort cleanup только при DELETE поста).
3. **`PATCH` на published** → 409 `content_already_published`. Опубликованный пост — терминальное состояние, ни текст, ни media не редактируются.
4. **Selective delete / append отдельных media — не поддерживается** и backend дев'ом подтверждено «не будем добавлять».

**UI-следствие для B12:**

- Редактор поста (draft/scheduled): один media-блок «Загрузить/перезагрузить (max 5)», без per-file delete-кнопок. UX-подсказка «новая загрузка заменит все файлы». Если admin хочет оставить часть старых + добавить новые — он должен скачать старые (доступны по URL) и перезалить весь набор.
- Редактор поста (published): весь контент + media — read-only превью.
- Не сохранять `files` в form-state если пользователь его не трогал — иначе случайная перезагрузка пустого набора стерёт media. Лучше: media-блок имеет отдельный «загрузить новый набор» CTA, который явно даёт понять, что это replace.

Multipart-контракт **`files`** (множественное число), max 5 на запрос, image≤10MB / video≤100MB, MIMEs только `image/*` или `video/*`. OpenAPI на момент B12-prep это поле может не показывать — контракт подтверждён backend-кодом (`FilesInterceptor('files', 5, {...})` в `admin-content.controller.ts`) и dev-confirmation. HANDOFF §12 переписан pre-B12 fixup под факт.

Объектные form-поля (`title_i18n`, `body_i18n`, `metadata`) в multipart — JSON-stringified.

### A21 — Content feed inline right-rail editor replaced with route-based editor · resolved (2026-05-27, orchestrator decision during B12)

**Контекст:** VIS `screens-ops.jsx` `ContentFeed` (lines 280-328) shows a `two-col-right` layout with a "Quick editor" right-rail panel on the feed page, enabling inline creation/editing without leaving the feed. Implementation B12 uses a dedicated route-based editor at `/content/new` and `/content/:id` instead.

**Решение:** route-based editor for consistency with other modules (children, billing, schedule, enrollments all use dedicated routes for create/edit) and mobile parity (mobile navigation to `/content/new` is natural; inline panel has no mobile equivalent). Editor is deeplinkable. Trade-off: slight VIS drift on `/content` desktop (no right-rail). Revert path: if owner requires inline right-rail, implement in a separate batch as two-column layout with embedded editor form.

### A22 — Content list cursor field is `cursor` not `next_cursor` · resolved (2026-05-27, live-confirmed during B12 QA)

Live OpenAPI inspection during manual QA showed `ContentListResponseDto = {items, cursor}`. Pre-B12 HANDOFF §12 drafted as `next_cursor` (drift from §A15 parent-requests precedent which DOES use `next_cursor` — content module is different). Fixed Zod schema + UI consumer + HANDOFF §12 to match live. Connected to: §A8 first-document rule (live = fact).

### A23 — Attendance daily-status: нет `/admin/daily-status/summary`, сводка из `attendance-today` · resolved (2026-06-03, live-confirmed pre-B13)

**Контекст:** HANDOFF §20 (pre-B13) декларировал два эндпоинта дневного статуса: `GET /admin/daily-status` (список) и `GET /admin/daily-status/summary` (агрегированная сводка отсутствий). Сверка live `/docs-json` (2026-06-03) показала: существует **только** `GET /admin/daily-status` (paged `child_daily_status`). `/summary` на backend нет.

**Решение** (прецедент §A8 live = факт, first-document): агрегированная сводка отсутствий на daily-status доске берётся из уже существующего `GET /admin/dashboard/attendance-today` → `{in_kindergarten, checked_out, absent, on_vacation, sick}` (+опц. `?group_id=`). HANDOFF §20 правлен под факт (убрана строка `/summary`, добавлена врезка про reuse). Backend-need **не заводим** — данных достаточно. Trade-off: сводка по садику/группе, не по произвольному фильтру; для MVP достаточно. Revert path: если потребуется сводка по сложному фильтру — backend-ask на dedicated `/summary`, отдельный батч.

### A24 — Structure (locations/cameras) archive-not-delete + no `/admin` prefix; notifications backend ready; QR camelCase · resolved (2026-06-04, live-verified pre-B14)

Контекст: при подготовке к B14 (Структура + Профиль/Уведомления/WS) сверка live `/docs-json` (2026-06-04) выявила расхождения HANDOFF §9/§27 ↔ факт. Решение: прецедент §A8/§A12 — live = факт; HANDOFF §9+§27 правлены под факт в pre-B14 docs-fixup (first-document). Зафиксировано:

1. **Locations/Cameras префикс без `/admin`:** `/api/v1/locations/*`, `/api/v1/cameras/*` (HANDOFF §9 декларировал `/admin/*`). Casing **snake_case** (request + response). Per-module, не экстраполировать.
2. **Archive/restore вместо hard-DELETE** (прецедент групп §A12.1): `POST /locations/:id/archive|restore`, `POST /cameras/:id/archive|restore`. Hard-`DELETE` на live нет. UI «удалить» = archive. 409 `location_in_use` обрабатывать **defensive** на archive (прецедент §C10 — реальный enforcement подтвердить ручным QA).
3. **Lists bare-array, без пагинации** (прецедент §A12.2/§A14.3): `GET /locations` → `LocationDto[]`, `GET /cameras` → `CameraDto[]` (фильтр `?location_id=`). Defensive `z.array(Schema)`.
4. **`LocationDto.description` — JSONB-object nullable** (live тип `object`, пример строкой): читать через `lib/jsonb-i18n.ts` defensive (i18n `{ru,kk}` или plain). `CreateLocationDto {name*(1..255), description?}`, `UpdateLocationDto {name?, description?}`.
5. **Camera поля `rtsp_url`+`hls_url`** (не `stream_url` как §9): `CameraDto {id, kindergarten_id, location_id, name, rtsp_url, hls_url(nullable), is_active, archived_at(nullable), created_at, updated_at}`. `CreateCameraDto {location_id*, name*, rtsp_url?, hls_url?}`. `+ POST /cameras/:id/link-location {location_id*}`. `/cameras/:id/test` отсутствует → Phase C disabled-заглушка (C1). Имя локации резолвится из `useLocations` — **закрывает §C8**.
6. **Notifications backend ГОТОВ** (не mock — переворачивает допущение TODO-backlog «once backend endpoint is available»): `GET /notifications` cursor `{items, next_cursor?}` (query `unread_only/limit/cursor/event_key`); `POST /notifications/:id/read`, `/notifications/read-all`; `GET/PATCH /notifications/preferences {preferences:[{event_key, push_enabled, in_app_enabled}]}`. `NotificationResponseDto` snake_case `{id, event_key, title_i18n, body_i18n, data, read_at?, created_at}`. → mobile `routes/notifications.tsx` (mock B18) + Topbar колокол подключаются к реальному `useNotifications` в B14.
7. **My QR `GetMyQrResponseDto {token, issuedAt, expiresAt}` — camelCase** (per-module, как §A11). `token` рендерится в QR-код на клиенте (нужна QR-render зависимость — добавить в B14). `/users/me` GET/PATCH уже подключён (B2/B3, `api/auth.ts`) — `api/users.ts` не нужен, профиль использует существующий слой auth/users.
8. **WS готов (§29, B9):** `wss://<host>/ws`, JWT в `socket.handshake.auth.token`, `auth_error` → refresh/logout, события по `event_key` payload `{title_i18n, body_i18n, data}` в `user:{id}` → тосты + инвалидация. `socket.io-client` уже в deps.

Код B14 conform к live с defensive Zod. Не блокирует — все эндпоинты существуют.

### A25 — Kaspi Pay SMS-онбординг: нет готового дизайна → вкладка «Оплата» в Настройках, строим по дизайн-системе; refund-ack для kaspi_pay · resolved (2026-06-05, owner via AskUserQuestion)

Контекст: backend прислал payments-update (2026-06-05): **(2a)** SMS-онбординг кассирского аккаунта Kaspi Pay садика (`/admin/kaspi/*`), **(2b)** обязательный `acknowledge_kaspi_history_checked:true` при `process` возврата с `provider=kaspi_pay`. Расхождение с дизайном: в готовом handoff (`docs/design/handoff/shyraq-admin/project/*`) **нет** экрана подключения Kaspi — есть только провайдер-фильтр в таблице платежей. По CLAUDE.md §6 (design-gap → OPEN_QUESTIONS, не молчаливый дрейф) — решение владельца:

1. **Размещение (owner via AskUserQuestion):** экран онбординга Kaspi → **новая вкладка «Оплата»** в Настройках (`/settings?tab=payments`), рядом с general/operations/design/fiscal/subscription. Готового дизайна нет — **строим по существующей дизайн-системе** (карточки/статусы/баннеры как в fiscal/subscription вкладках), визуал согласован с остальными вкладками Настроек. Не «эталон» из handoff — собственное решение в рамках токенов/паттернов.
2. **Объём:** всё сразу — 2a (онбординг) + 2b (refund-ack), порядок docs → код. Sub-agentic режим НЕ активирован — код пишет оркестратор сам.
3. **Контракт 2a** (HANDOFF §25a): 3-шаговый мастер — `connect/init` (скрытый, `{}`→`{process_id}`) → `connect/send-phone {process_id, phone:'7XXXXXXXXXX'}` (формат 11 цифр без `+`/пробелов, **НЕ E.164**) → `connect/verify-otp {process_id, otp}` (⚠️ verify-otp шлёт **реальную SMS** кассиру — беречь попытки). Статус `GET /admin/kaspi/status` (active/pending/expired/revoked). `POST /admin/kaspi/disconnect`. Ошибки: `kaspi_already_connected`(409), `kaspi_app_version_outdated`(502), `kaspi_unknown_process`(400, TTL~5мин), `kaspi_otp_invalid`(401), `kaspi_finish_failed`(502).
4. **Контракт 2b** (HANDOFF §16): `POST /admin/refunds/:id/process` для `kaspi_pay` требует тело `{acknowledge_kaspi_history_checked:true}`; без него → `400 kaspi_refund_requires_history_ack`. Для mock/halyk_epay/cash — тело не шлём. UI: чекбокс «Я проверил историю возвратов в приложении Kaspi», кнопка подтверждения активна только при отметке.
5. **WS** (HANDOFF §2.7): `kaspi.session_expired` → инвалидация `qk.kaspi.status` + тост (expired-баннер «Переподключите Kaspi»).

Не блокирует — все эндпоинты существуют (live payments-update). Acceptance в IMPLEMENTATION_PLAN (батч B16-KASPI).

### A15 — Parent-requests: list `/admin/*` vs detail/actions `/staff/*`, `type` filter, snake_case, cursor · resolved (2026-05-19)

Контекст: при B8 (parent-requests data+UI) сверка live `/docs-json` выявила существенное расхождение HANDOFF §19 ↔ факт. Решение: прецедент §A7/§A8 — live = факт. Зафиксировано (HANDOFF §19 правлен под факт в wave-коммите B7+B8 — first-document):

1. **Префикс расщеплён:** HANDOFF §19 — всё под `/admin/parent-requests/*`. Live: **только list** = `GET /api/v1/admin/parent-requests`; **detail / accept / reject / messages (GET+POST)** = под `/api/v1/staff/parent-requests/{id}/*`. Эндпоинта `/admin/parent-requests/:id` нет.
2. **RBAC:** Admin JWT авторизован для `/staff/parent-requests/*` (admin — staff_member с role=admin; подтверждено сводкой live-операции «Admin sees everything in kg»). НЕ blocker. 403 → `parent_request_forbidden` (штатный RBAC, не исключение admin) — добавлено в error-map + i18n (RU/KK).
3. **Filter param:** `type` (НЕ `request_type`). Прочие: `status, child_id, group_id, recipient_type, limit, cursor`.
4. **Casing:** snake_case (request + response). `ReviewRequestDto {review_note?}`, `AddMessageDto {body*, attachments?:string[]}`.
5. **Cursor подтверждён:** list + messages → `{items, next_cursor:string|null}` (null на последней странице). Невалидный cursor → 400 `parent_request_cursor_invalid`.
6. **DTO:** `ParentRequestResponseDto` (18 полей, snake_case; `request_type` enum `trusted_person|day_off|vacation|late_pickup|open_request`, `status` enum `pending|accepted|rejected|cancelled`, `recipient_type` enum `admin|mentor|specialist`, `details` JSONB по типу — `.passthrough()`, не over-model; nullable: `date_from, date_to, recipient_type, recipient_staff_id, reviewed_by, reviewed_at, review_note, invoice_id`). `ParentRequestMessageResponseDto` — только UUID автора (`author_user_id`/`author_staff_id`), без имени → §C15 / N7. Код B8 conform к live с defensive Zod.

### A26 — Медиа отдаётся presigned-ссылками S3 (TTL 1ч); рендер напрямую + cache-hardening · resolved (2026-06-21, backend media-update)

Контекст: backend перевёл раздачу медиа на **готовые абсолютные presigned-ссылки S3** — поля `media_urls[]` / `media_url` (лента, посты, истории, timeline, диагностика) теперь `https://balam-media-dev.object.pscloud.io/<key>?X-Amz-Signature=…` вместо относительного `/api/v1/media/…`. Это закрывает прежнюю проблему «фото не видно»: приватный бакет + auth-required `GET /api/v1/media/...`, к которому браузерный `<img>` не прикладывал JWT (access-токен in-memory, A2 → `ky`-only). Решение владельца (2026-06-21):

1. **Рендер без изменений:** ссылку из `media_url(s)` — напрямую в `<img src>` / `<video src>`, без `Authorization`-заголовка (подпись в URL). Blob-fetch-костыль (авторизованный `fetch` + `createObjectURL`) **не нужен** — у нас он и не строился (фронт всегда рендерил raw `<img>`).
2. **TTL 1 час** — ссылку нельзя хранить надолго. Кеш-аудит: ни один query не держит URL дольше TTL (`staleTime` ≤ 5 мин, `gcTime` 5 мин, `refetchOnWindowFocus/Mount/Reconnect` on), `persistQueryClient`/localStorage-персиста кеша нет, `session-store` (`avatar_url`) — in-memory. Остаётся узкий edge-кейс «медиа-экран открыт + в фокусе + простаивает >1ч».
3. **Cache-hardening (B26):** на detail-запросы, реально рендерящие presigned-`<img>` — `useContent(id)` (контент-редактор, `media_urls`) и `useChild(id)` (`photo_url` карточки) — добавлен `refetchInterval = MEDIA_PRESIGNED_REFETCH_MS` (50 мин < 1ч). Списки и топбар-аватар (инициалы-fallback, не `<img>`) presigned-медиа не несут. `refetchIntervalInBackground` оставлен default `false` (фон не полим; на возврат фокуса — `refetchOnWindowFocus`).
4. **Загрузка** (`POST /admin/content/upload-media`) — без изменений: канонический **неподписанный** `{url, key}`, сохраняем как раньше.
5. Старый `GET /api/v1/media/{kgId}/{yyyyMm}/{filename}` (под JWT, kg-scoped) — fallback, не используем.

Связано: §C5 (child_photo **upload** presigned всё ещё parked — это про загрузку, не про чтение), §C2 (S3 Phase B). Acceptance — IMPLEMENTATION_PLAN §B26.

---

### A27 — Сторис в разделе «Контент»: нет в готовом дизайне → отдельная вкладка, строим по дизайн-системе · resolved (2026-07-10, owner request)

**Контекст.** Владелец попросил, чтобы админ мог **добавлять сторис** из раздела «Контент». Backend endpoint готов: `GET/POST /api/v1/staff/stories` (list active + publish), `DELETE /api/v1/staff/stories/{id}`, `POST …/{id}/view`. Create — multipart `group_id` (text) + `file` (image/video, required) + опц. `caption`; истекает через 24ч; admin видит/постит по любой группе садика (`StaffStoriesController`, роль admin разрешена). Дизайн-handoff (`screens-core/ops.jsx`, `content-section-tabs`) сторис в разделе «Контент» **не описывает** — там только вкладки «Лента» + «Qundylyq». CLAUDE §6 запрещает молчаливое отклонение от готового дизайна.

**Решение (owner, 2026-07-10).** Добавить третью вкладку «Сторис» в `ContentSectionTabs` (`/content/stories`), построенную **по существующей дизайн-системе** (те же токены/компоненты, что лента/qundylyq): грид карточек (превью медиа, группа, просмотры, бейдж «истекает через N ч»/«истекла», удаление) + диалог создания (Select группы, выбор файла image/video, подпись ≤500). Медиа — presigned `<img src>` напрямую (§A26); `useStories` c `refetchInterval` под TTL 1ч. Trade-off: дизайн-дрейф в разделе «Контент» (вкладки, которой нет в VIS). Revert path: если владелец захочет иной лейаут — переверстать в отдельном батче.

**Слои.** `api/stories.ts` (multipart create, zod-DTO; `caption` толерантно — string|JSONB), `hooks/use-stories.ts`, `routes/content/stories.tsx`, вкладка в `content-section-tabs.tsx`, роут `content/stories` (до `content/:id`), i18n `content.stories.*` (ru+kk).

**Связано:** §A26 (presigned media), BACKEND_NEEDINGS (endpoint уже есть — не gap).

---

### A28 — Логотип садика (N11) + справочник специальностей (N12): реализация фронта · resolved (2026-07-10, backend deployed)

**Контекст.** Backend выкатил N11 (логотип: `logo_url` + upload/delete) и N12 (`specialist_type` → admin-managed справочник per-садик), см. `LOGO_AND_SPECIALIST_TYPES_FRONTEND_GUIDE.md`. Часть фронт-решений выходит за готовый дизайн (CLAUDE §6).

**Решения (owner-approved через выданный guide):**

1. **Логотип** — оживлена кнопка на `/settings → Общие` (была мёртвая): превью `<img src={logo_url}>`, загрузка (client-валидация image/≤5 МБ + backend), удаление. Дизайн карточки «Логотип» уже был в handoff — поведение добавлено 1:1 по смыслу.
2. **Справочник специальностей** — CRUD-экрана в дизайне **нет**. Решение: новая вкладка «Специальности» в `/settings` (per-садик admin-config логично живёт в Настройках; без нового nav-item). Построена по существующей дизайн-системе (таблица + модалки, как в тарифах). Desktop-only (мобильные настройки — отдельный упрощённый layout; admin-config desktop-first по CLAUDE §1). Revert path: перенести в отдельный роут/секцию, если владелец захочет.
3. **Метки специальностей** — источник истины теперь backend `name_i18n` (per guide §2.7.1). Убран весь фронт-хардкод (`SPECIALIST_TYPES`/`SpecialistTypeEnum`/`staff.json.specialist_type.*`), метки резолвятся через `lib/specialist-type.ts` с fallback на код.
4. **«Нейропсихолог (Психолог)»** — прежний клиентский i18n-override (сессия 2026-07-10) **снят**: значение `psychologist` теперь показывается меткой из словаря (дефолт бэка «Психолог»). Переименование — одним edit в новом справочнике (единый источник истины, guide §2.7.5), либо backend PATCH строки.

**Связано:** BACKEND_NEEDINGS N11/N12 (resolved).

---

### A29 — Конструктор скидки: «Неизвестная ошибка» — два бага (error-envelope + форма `conditions`) · resolved (2026-07-11, live-verified)

**Контекст.** Пользователь: конструктор скидки (`/billing/discounts/new`, `wizard.tsx`) после заполнения полей выдаёт «Неизвестная ошибка». Прогон под бэкдором `+77777777777` против live dev выявил **две** наложенные поломки:

1. **Error-envelope (app-wide).** Глобальный `ValidationPipe` бэка отдаёт `{status, errors:{field: msg|nested}}` (см. handoff §2.3, live-подтверждён), а `error-map.ts::parseApiError` знал только nest-422 и доменный конверт → любая 422 схлопывалась в `unknown_error` → «Неизвестная ошибка». **Затрагивало весь Admin, не только скидки.**
2. **Форма `conditions` расходилась с backend-контрактом.** `formToBody` слал `{op, rules:[{type, value:string}]}` и `{type:'age_range', age_from, age_to}`; каноничная схема (`backend/…/discount-conditions/conditions-evaluator.ts`) требует `{all_of|any_of:[…]}` с типизированными листьями (`op:'gte'|'eq'`+`value:int`, `from_months/to_months`, `in:[…]`, `days_before_due`, `from/to` ISO, голый `{type}`). Любое условие или таргет `age_range` → 422 `custom_discount_conditions_invalid`.

**Дизайн↔контракт (CLAUDE §6).** Готовый дизайн (`screens-billing.jsx` `DiscountWizard`) для шага «Условия» — **статичный мок**: одно свободное текстовое поле `value` на условие (`onChange` — no-op). Он **физически не может** собрать типизированные листья, которые требует backend.

**Решение (owner-approved: fix all three).** (1) `parseApiError` распознаёт `{status,errors}` и flatten'ит в `validation_error` details. (2+3) `formToBody`/`discountToDefaults` переписаны под каноничную схему; шаг 2 получил **типизированный value-cell по типу условия** (`ConditionValueEditor`: op+число / from-to мес. / диапазон дат / мультиселект `in[]` для benefit_category+payment_method / голый тип), сохранив row-лейаут дизайна; добавлена client-валидация перед submit (`validateAllThenJump`) + inline-ошибки, чтобы пустой push/битое условие не уходили в API. **Deviation от мока задокументирована здесь.** Revert path: если владелец захочет другой UX билдера — переверстать `ConditionValueEditor`, контракт-маппинг остаётся.

**Догон (2026-07-11, тот же слайс).** Таргет «Конкретные дети» не давал выбрать никого: `useChildrenList({limit:200})` бьётся о backend `@Max(100)` (`ListChildrenQueryDto`) → 422 → пустой список, «Выберите детей» без чипов. Фикс: `useAllChildren({status:'active'})` (пейджит по 100). Заодно чипы таргетинга (группы/дети/тарифы) стали реактивными через общий `TargetChips` (было — нереактивный `getValues` в render). **Mobile-паритет:** шаг «Таргетинг» на мобилке рендерил только `<select>` типа без под-селекторов — добавлены те же `TargetChips` + age_range inputs (mobile теперь = desktop по таргетингу).

**Mobile 5-й шаг (owner: путь «а», 2026-07-11).** Mobile-визард получил шаг 5 «Приоритет и уведомление» (priority + stackable + notify-toggle + push ru/kk), `MOBILE_TOTAL_STEPS 4→5`; финальный save валидирует всю форму (`validateAllThenJump`). Теперь mobile create скидки работает end-to-end, паритет с desktop по всем 5 шагам. **Supersedes M6** (был «полный 4-step wizard» — стало 5, т.к. desktop step 5 обязателен для валидного create). Trade-off: дизайн-девиация от mobile-хендофф (5-го экрана там нет) — построен по существующей дизайн-системе. Revert path: если владелец захочет иначе — переверстать mobile step 5.

**Связано:** handoff §2.3 (error-envelope), §18 (custom-discounts conditions schema).

---

## B. Открытые (open — НЕ кодить до resolve)

Формат записи:

```
### B<n> — <короткий заголовок> · open (<дата>)
Контекст: <что обнаружено, где>. Блокирует: <батч/слайс>.
Нужно решение: <вопрос владельцу/backend>. Гипотеза: <если есть>.
```

### B1 — Per-group week-snapshots copy · open (2026-05-26, backend-ask)

**Контекст:** при подготовке B11 (Schedule) обнаружено: `POST /admin/schedule/week-snapshots/copy` принимает только `{fromMonday}` и копирует **все группы садика** на следующую неделю — нет фильтра по `groupId`. UX-следствие: на странице «Недельный обзор» нельзя сделать «Скопировать неделю этой группы» — только глобально на весь садик. **НЕ блокирует** B11 (фронт делает глобальный CTA), но снижает гранулярность операции.

**Блокирует:** ничего (degraded UX). Влияет: `/schedule/weeks` (B11).

**Нужно решение от backend:** добавить опц. `groupId` в `CopyWeekDto` → при наличии копировать только указанную группу. Симметрично `CopyWeekSummaryDto` останется как есть (просто `copiedGroups ∈ {0, 1}`). Альтернатива: новый отдельный endpoint `POST /admin/schedule/week-snapshots/copy-group {groupId, fromMonday}`.

**Гипотеза:** до резолва — глобальный CTA «Скопировать неделю садика» (B11). После резолва — добавить per-group action в строке группы на странице weeks.

**Связано с:** BACKEND_NEEDINGS N9.

### B2 — Activity events admin CRUD UI spec · open (2026-05-26, design-ask)

**Контекст:** backend `/admin/schedule/activity-events` имеет полный CRUD (`POST/PATCH/DELETE`), HANDOFF §10 переписан под факт (§A18.7). Владелец (2026-05-26) принял решение «Admin может править/добавлять разовые события». Но **дизайн VIS `screens-ops.jsx` Schedule этого не описывает** — там только календарь/список read-only. CLAUDE §6 запрещает молчаливое отклонение от готового дизайна.

**Блокирует:** ничего (на B11 строим минимальный CRUD на существующих primitives). Влияет: `/schedule/weeks` UI слой (часть activity-events).

**Принятое compromise-решение (2026-05-26):**

- B11 строит **минимальный CRUD** на токенах + существующих primitives:
  - Кнопка «Добавить событие» рядом с переключателем дат → модал на `<Dialog>` (`forms/full-screen-sheet.tsx` на mobile).
  - Форма RHF (`groupId`, `activityName`, `startsAt`, `endsAt`, `locationId`, `notes`).
  - Row-actions «Редактировать» / «Удалить» (через `DestructiveConfirm`) на каждом событии в календаре/списке.
- Без новых визуальных лекал — только токены, иконки, paddings из дизайн-системы.

**Нужно решение (post-MVP):** дизайн-апдейт VIS для activity-events admin CRUD (модал, форма, row-actions, мобильная вёрстка). После апдейта — пересмотреть слой и привести 1:1 к новому дизайну.

**Связано с:** §A18.7.

### B3 — Content search query param (title search) · open (2026-05-27, backend-ask)

**Контекст:** VIS feed toolbar shows a search-by-title input. HANDOFF §12 list endpoint `GET /admin/content` has no `search`/`q` filter param. FE degrades gracefully (no search input rendered).

**Блокирует:** ничего (degraded UX). Влияет: `/content` feed page (B12).

**Нужно решение от backend:** add `?search=<text>` or `?q=<text>` param to `GET /admin/content` for title/body substring search.

---

## M. Mobile — вопросы (resolved 2026-05-24)

Все M1–M10 разрешены пользователем 2026-05-24. M2 mobile-выбор фактически переопределил M1 на вариант 2 (effective breakpoint `<1024px`), чтобы избежать противоречия. Mobile-батчи B16–B22 могут стартовать.

### M1 — Брейкпоинт mobile/desktop · resolved (2026-05-24)

**Контекст:** mobile-дизайн (33 экрана) добавлен; нужно определить границу между mobile shell и desktop shell. Блокирует: B11 (Mobile foundation).

**Варианты:**

1. `< 768px` = mobile, `>= 768px` = desktop. _Pros:_ стандартный media-query breakpoint (Tailwind `md:`), совпадает с iPad portrait width. _Cons:_ iPad portrait получает desktop (cramped sidebar).
2. `< 1024px` = mobile, `>= 1024px` = desktop. _Pros:_ iPad portrait/landscape получает mobile. _Cons:_ tablet-пользователи не видят sidebar и таблицы; mobile UI oversized на 768-1024.
3. `< 640px` = mobile, `>= 640px` = desktop. _Pros:_ только реально маленькие экраны получают mobile. _Cons:_ узкие телефоны (414px landscape) могут получить desktop.

**Proposal:** вариант 1 (`< 768px`). Стандартный, предсказуемый, совпадает с дизайн-canvas 402px (iPhone Pro Max). Tablet получает desktop — это функциональнее для data-heavy admin tool.

**Status:** resolved. **Decision:** вариант **2** — `< 1024px` mobile, `>= 1024px` desktop. Эффективно выбрано через M2 (tablet=mobile). Это Tailwind `lg:` брейкпоинт. (2026-05-24)

### M2 — Tablet (768-1024px) — desktop или mobile shell? · resolved (2026-05-24)

**Контекст:** тесно связан с M1. iPad 768px portrait — sidebar занимает ~240px, оставляя ~528px для контента. DataTable с 6+ колонками cramped, но работает (горизонтальный скролл). Mobile shell на 768px — карточки чрезмерно крупные, много wasted space.

**Варианты:**

1. Desktop shell на tablet (>= 768px). _Pros:_ полная функциональность, горизонтальный скролл таблиц; admin tool = data density важнее. _Cons:_ cramped sidebar, мелкие кнопки.
2. Mobile shell на tablet (< 1024px). _Pros:_ визуально крупнее, touch-friendly. _Cons:_ карточный layout wasteful на 768px; теряются таблицы/sidebar.
3. Отдельный tablet-breakpoint (768-1024: collapsed sidebar + table-layout). _Pros:_ best of both. _Cons:_ 3-я вёрстка, тройная поддержка.

**Proposal:** вариант 1 (desktop на tablet). Admin — data-heavy tool, функциональность важнее visual comfort. Collapsed sidebar на tablet (auto-collapse < 1024px) смягчает cramped layout. Третью вёрстку не оправдать на MVP.

**Status:** resolved. **Decision:** вариант **2** — Mobile shell на tablet (< 1024px). User-выбор: touch-friendly UI важнее data density на tablet. Mobile-вёрстка покрывает диапазон 320-1023px. (2026-05-24)

### M3 — Tariff plans + Tariff assignments merged on mobile · resolved (2026-05-24)

**Контекст:** desktop имеет 2 отдельных route'а (`/billing/tariff-plans`, `/billing/tariff-assignments`). Mobile-дизайн (ScreenTariffs, `mobile-screens-2.jsx` L698-739) объединяет их в один экран с segmented control «Планы / Назначения». Нужно подтвердить UX и routing.

**Варианты:**

1. На mobile оба route'а рендерят один и тот же компонент с segmented control; deep-link `/billing/tariff-plans` открывает tab «Планы», `/billing/tariff-assignments` — tab «Назначения». _Pros:_ сохраняет URL-совместимость, deep-links работают. _Cons:_ два route'а рендерят одно и то же.
2. Единый mobile-route `/billing/tariffs` с query-param `?tab=plans|assignments`. _Pros:_ чище. _Cons:_ новый route, не совпадает с desktop sitemap §28.
3. Adaptive: на mobile оба desktop route'а показывают segmented; начальный tab определяется по pathname. _Pros:_ zero new routes, backward-compatible. _Cons:_ чуть больше логики.

**Proposal:** вариант 3. Adaptive component, zero new routes. Desktop рендерит раздельно, mobile — один UI с начальным tab по route.

**Status:** resolved. **Decision:** вариант **3** — оба desktop-route'а остаются, на mobile рендерят общий adaptive-компонент с segmented control; начальный tab определяется по pathname. (2026-05-24)

### M4 — i18n стратегия для mobile · resolved (2026-05-24)

**Контекст:** mobile-экраны используют те же строки что и desktop (заголовки, бейджи, кнопки), плюс несколько mobile-specific строк (tab labels «Главная/Дети/Заявки/Счета/Ещё», drawer section headers, quick action labels). Блокирует: B17 (i18n sweep).

**Варианты:**

1. Отдельный namespace `mobile.*` (`ru/mobile.json`, `kk/mobile.json`). _Pros:_ чёткое разделение, можно lazy-load только на mobile. _Cons:_ дублирование общих строк; при изменении desktop-строки забудешь mobile.
2. Extend существующих namespaces (добавить ключи `common.mobile_tab_home`, `common.mobile_tab_children` и т.д. в `common.json`). _Pros:_ DRY, один источник; общие строки не дублируются. _Cons:_ namespaces растут; нельзя lazy-load mobile-only строки.

**Proposal:** вариант 2 (extend). Mobile-specific строк немного (~20-30), дублирование хуже чем чуть-больший JSON. Ключи с prefix `mobile_` для однозначности.

**Status:** resolved. **Decision:** вариант **2** — extend существующих namespaces, без отдельного `mobile.*`; mobile-specific ключи держать с префиксом `mobile_`. (2026-05-24)

### M5 — Mobile-only routes vs adaptive components · resolved (2026-05-24)

**Контекст:** как реализовать mobile layout — отдельные `/m/...` route'ы или адаптивные компоненты на тех же routes? Блокирует: B11 (Mobile foundation).

**Варианты:**

1. Отдельные `/m/...` route'ы. _Pros:_ полная изоляция, можно lazy-load. _Cons:_ дублирование логики (hooks, data-fetching), 2x route'ов, мёртвый desktop-код на mobile и наоборот, shared links ломаются.
2. Adaptive components на тех же routes с `useBreakpoint` хуком. _Pros:_ DRY (одна data-fetch логика, один route), shared links работают, resize корректен. _Cons:_ оба layouts загружаются (решается React.lazy + breakpoint), компонент сложнее.

**Proposal:** вариант 2. Adaptive components с `useBreakpoint` хуком (CSS `window.matchMedia`). Desktop и mobile renders — conditional branches внутри page component (или `<DesktopLayout>`/`<MobileLayout>` wrappers). Hooks и data-fetching — общие.

**Status:** resolved. **Decision:** вариант **2** — adaptive components на тех же routes через `useBreakpoint`; без `/m/...` route-дублей. (2026-05-24)

### M6 — Discount Wizard на mobile — тот же 4-step или упрощённый? · resolved (2026-05-24)

**Контекст:** mobile-дизайн (ScreenDiscountWizard, `mobile-screens-2.jsx` L845-905) показывает 4-step wizard с progress bar, условиями, превью. Desktop Discount Wizard (B10) — тот же 4-step. Вопрос: mobile state machine идентичен desktop?

**Варианты:**

1. Полный 4-step wizard, адаптивный layout (sticky bottom nav вместо inline buttons). _Pros:_ feature parity, один state machine. _Cons:_ на маленьком экране конструктор условий И/ИЛИ может быть сложен.
2. Упрощённый wizard (убрать nested all*of/any_of, только flat conditions). \_Pros:* мобильнее. _Cons:_ feature gap, два state machine.

**Proposal:** вариант 1. Дизайн уже показывает полный wizard (step indicator, conditions, preview). Конструктор условий на mobile — vertical-stack вместо nested grid. Сложные скидки создаются на desktop, но mobile должен уметь тоже.

**Status:** resolved. **Decision:** вариант **1** — полный 4-step wizard, общий state machine с desktop; mobile меняет только layout и sticky navigation. (2026-05-24)

### M7 — Date-picker на mobile — native vs library? · resolved (2026-05-24)

**Контекст:** desktop использует `react-day-picker` (consistency с shadcn). На mobile native `<input type="date">` даёт OS-native UX (iOS date wheel, Android Material picker). Блокирует: B12 (Mobile forms infra).

**Варианты:**

1. Native `<input type="date">` / `<input type="time">` на mobile. _Pros:_ OS-native UX, zero bundle. _Cons:_ стилизация невозможна, не совпадает с design tokens.
2. `react-day-picker` с mobile-friendly стилями (full-width, enlarged touch targets). _Pros:_ consistent design, controlled. _Cons:_ larger bundle, custom mobile styling needed.
3. Hybrid: simple date fields (filters, forms) — native; complex (period picker, multi-day selection) — `react-day-picker`. _Pros:_ best of both. _Cons:_ inconsistency.

**Proposal:** вариант 2 (library). Consistency с design tokens важнее чем native feel. Touch targets увеличиваем. Calendar popover на mobile — bottom-sheet, не floating.

**Status:** resolved. **Decision:** вариант **2** — `react-day-picker` с mobile-friendly стилями и bottom-sheet presentation на mobile. (2026-05-24)

### M8 — Mobile-detection hook — CSS media-query vs user-agent? · resolved (2026-05-24)

**Контекст:** `useBreakpoint` хук — как определять mobile? Блокирует: B11 (Mobile foundation).

**Варианты:**

1. `window.matchMedia('(max-width: 1023px)')` + `resize` listener. _Pros:_ responsive (resize корректен, DevTools responsive mode работает), CSS-first, standard. _Cons:_ SSR considerations (нет window), layout shift на первый рендер (решается CSS media query для initial hide).
2. User-agent detection (`navigator.userAgent`). _Pros:_ no layout shift. _Cons:_ ненадёжно (iPad fakes desktop UA), не реагирует на resize, нарушает responsive принцип.
3. CSS-only (Tailwind `md:` breakpoint). _Pros:_ zero JS, no layout shift. _Cons:_ нельзя conditionally render components (оба загружаются).

**Proposal:** вариант 1. CSS `matchMedia` responsive — стандартный подход. Initial render — SSR не используем (Vite SPA), layout shift минимален (можно CSS `@media` для instant hide). `useBreakpoint` хук + `isMobile` boolean.

**Status:** resolved. **Decision:** вариант **1** — `matchMedia`/CSS-first detection, effective query `(max-width: 1023px)` per M1/M2. (2026-05-24)

### M9 — Bottom-sheet primitive — Radix Sheet `side="bottom"` или отдельный компонент? · resolved (2026-05-24)

**Контекст:** mobile дизайн использует bottom-sheet паттерн для фильтров (вместо sidebar filter panel) и full-screen модалов. shadcn/ui уже имеет `Sheet` (Radix Dialog) с `side` prop. Блокирует: B12 (Mobile DataTable + forms infra).

**Варианты:**

1. `Sheet` с `side="bottom"` + custom height/rounded corners. _Pros:_ zero new deps, already in codebase. _Cons:_ no drag-to-dismiss (Radix Sheet — чистый slide, не gestured), no snap points.
2. Dedicated bottom-sheet component (e.g., `vaul` by Emil Kowalski — Radix-compatible). _Pros:_ drag-to-dismiss, snap points, gesture-native. _Cons:_ new dependency.
3. `Sheet side="bottom"` for now, migrate to vaul later if needed. _Pros:_ MVP-fast, no new deps. _Cons:_ may need rewrite.

**Proposal:** вариант 3. Start with `Sheet side="bottom"`, add vaul later if gesture UX is critical after user QA. Mobile MVP — functionality over polish.

**Status:** resolved. **Decision:** вариант **3** — стартовать с shadcn/Radix `Sheet side="bottom"`; миграция на `vaul` только если gesture UX станет критичным после QA. (2026-05-24)

### M10 — Notifications — full-screen route или slide-up sheet на mobile? · resolved (2026-05-24)

**Контекст:** desktop: notifications = popover/panel from bell icon (Topbar). Mobile дизайн (ScreenNotifications, `mobile-screens.jsx` L907-972) показывает **full-screen** с back-button, segmented (Все/Непрочитанные), grouped by day. Это фактически отдельный route. Блокирует: B13 (Mobile core screens).

**Варианты:**

1. Full-screen route `/notifications` (mobile-only; desktop — popover как раньше). _Pros:_ matches design exactly, separate URL, browser back works naturally. _Cons:_ route exists only on mobile, desktop redirect needed.
2. Slide-up sheet (full height) triggered from bell icon. _Pros:_ no new route, matches desktop pattern. _Cons:_ back button behavior unclear, doesn't match design (design shows full bar with back).
3. Route `/notifications` on both — on desktop renders as page too (eventually). _Pros:_ future-proof. _Cons:_ desktop doesn't need it now.

**Proposal:** вариант 1. Mobile — route `/notifications` (full-screen, back to previous). Desktop — popover (existing B14 plan). Bell icon on mobile navigates to `/notifications` instead of opening popover.

**Status:** resolved. **Decision:** вариант **1** — mobile full-screen route `/notifications`; desktop сохраняет popover-поведение. (2026-05-24)

### M11 — Mobile shell glassmorphism + FAB tint vs dark theme · open (2026-05-25)

**Контекст:** B16 ported `.m-tabbar` (`background: rgba(255,255,255,0.85)` + backdrop-blur) и `.m-fab` (box-shadow tint `rgba(14,124,102,0.35)` — teal-primary) verbatim из `docs/design/handoff-with-mobile/shyraq-admin/project/mobile.css`. CLAUDE.md §6 требует preserve var() refs (что мы и сделали), но эти hardcoded rgba — не token refs. На теме `dark` (где `--bg` тёмный) белый glassmorphism будет выглядеть как яркая полоса; tint FAB-shadow не соответствует non-teal темам (orange/blue/mono/forestMint/oceanBlue).

**Варианты:**

1. Оставить verbatim (текущее B16). _Pros:_ design-fidelity 1:1, B17/B18 владельцы экранов могут уточнить per-screen. _Cons:_ на dark theme tabbar/FAB-shadow выглядят off; пользователь увидит при QA.
2. Заменить hardcoded rgba на token-based значения: `.m-tabbar { background: color-mix(in oklab, var(--bg-elev) 85%, transparent) }`, `.m-fab { box-shadow: 0 6px 16px color-mix(in oklab, var(--primary) 35%, transparent), ... }`. _Pros:_ themes work. _Cons:_ отклонение от source mobile.css (но preserves design intent).

**Proposal:** вариант **2** — заменить на token-based значения в B17 (или раньше при QA dark-темы). Это сохраняет визуальный intent дизайна (glass + primary-shadow) и делает темы работающими. Не блокирует B16 foundation. Обновить mobile.css source-of-truth tоже когда применим.

**Status:** open. Решить когда пользователь QA-нит mobile shell на dark/orange/blue темах.

---

## C. Отложено по фазе backend (parked)

### C1 — Phase C: Face ID + тест камер · parked

HANDOFF §22,§9.2,§29: admin-эндпоинты конфигурации есть, но распознавание/видеопоток/`cameras/:id/test` — edge, Phase C. **Строим UI как видимые заглушки** «доступно позже», к данным не подключаем. → B14 (камеры test-stub), B15 (Face табы).

### C2 — Phase B: Fiscal full, real SMS/ePay/ОФД/S3, cookie-auth · parked

HANDOFF §17,§29: Fiscal — read-only stub (B13 backend), full CRUD/retry/queue/report — Phase B (B15 backend). Реальные провайдеры (Halyk ePay, ОФД, SMS, S3) — Phase B, **контракты не изменятся**. Fiscal DTO строим расширяемым типом. Cookie refresh-flow (вместо localStorage, A2) — future, не блокирует MVP. → B15 заглушки.

**Апдейт (2026-06-21):** S3 для **чтения** медиа выкачен (presigned-ссылки, dev-бакет `balam-media-dev`, см. §A26). Остальное из этого пункта (реальные ePay/ОФД/SMS, child_photo **upload**, cookie-auth) — по-прежнему Phase B.

### C3 — `/admin/*` RBAC-нюанс для DLQ · parked/watch

HANDOFF §24: исторически `/admin/*` мог быть заскоплен строго на роль `admin`. Если валидный админ получает 403 на lifecycle-DLQ — это backend-баг, **эскалировать**, не обходить на фронте. Проверить на проде в B15.

### C4 — GuardianDto не содержит ФИО/телефон пользователя · parked/watch (2026-05-18, W3/B4)

Контекст: при B4 (вкладка «Опекуны») обнаружено — live `GuardianDto` (§A8) содержит только `user_id` (UUID), без `full_name`/`phone`/`relationship`. Дизайн `screens-core.jsx` ChildDetail рисует ФИО/телефон/связь опекуна (это были mock-данные прототипа). Batch-эндпоинта резолва `users` для отображения нет в scope B4.

Решение (design-fidelity допускает отклонение под backend-контракт, CLAUDE §6): фронт B4 **деградирует честно** — не выдумывать имя/инициалы из UUID; показывать реальные поля (роль/статус/can_pickup/has_approval_rights) + идентификатор пользователя явно помеченным (не как «имя»); колонки ФИО/телефон/связь — graceful («—»/скрыто), лейаут таблицы по прототипу сохранён. **Эскалация backend:** рекомендовать встроить в `GuardianDto` отображаемую инфу пользователя (`user_full_name`, `user_phone`, `relationship`) ИЛИ предоставить users-lookup. Пересмотреть когда backend расширит контракт или появится users-резолв (B6/B14/профиль). Не блокирует B4.

### C5 — Storage presigned-upload (фото ребёнка) не реализован на backend · parked/watch (2026-05-18, W3/B4)

Контекст: при ручном QA B4 загрузка фото в `/children/new` → `POST /api/v1/storage/presigned-upload` = **404**. Сверка live `/docs-json`: presigned-эндпоинтов (`/storage/presigned-upload`, `/storage/confirm-upload`, `/storage/download/:key`) **нет**; существует только прямой `POST /api/v1/admin/content/upload-media` (multipart → `{url,key,bytes}`) + `POST /api/v1/children/{id}/photo {photo_url}` + `GET /api/v1/media/{kgId}/{yyyyMm}/{filename}`. Код B4 (`api/storage.ts`, `hooks/use-storage.ts`, `components/forms/file-upload.tsx`) построен **верно по HANDOFF §2 (стр.83) / DESIGN §183** (presigned 3-step, `purpose=child_photo`) — это не выдумка фронта, а документированный контракт.

Решение владельца (уточнено у backend, 2026-05-18): фича `child_photo` на backend **ещё не готова** (presigned — Phase B, см. C2; `upload-media` под `child_photo` backend не поддерживает). **Оставляем как есть** — код presigned не трогаем, 404 всплывает как обработанная ошибка (тост, не краш), карточка создаётся без фото (`photo_url?` опционален). НЕ переписывать на `upload-media`, ничего не доинвентить. Сделать фичу, когда backend выкатит storage для child_photo. **Не блокирует B4** (фото — единственная заблокированная подфича; CRUD/группы/опекуны/архив работают).

Пересмотр: когда backend сообщит о готовности child_photo storage → реализовать по фактическому контракту, обновить HANDOFF §2/§5 + DESIGN §183 (presigned vs multipart) под факт (first-document). Связано с C2 (S3/presigned Phase B).

**Апдейт (2026-06-21):** этот пункт — про **upload** фото ребёнка (всё ещё parked, presigned-upload не выкачен). **Чтение** медиа теперь работает через presigned S3 (§A26) — не путать read и upload.

### C6 — Enrollments: модал «Создать карточку» без полей тарифа · parked/watch (2026-05-19, W4/B5)

Контекст: дизайн `screens-core.jsx` EnrollmentDetail (модал создания карточки, стр. 748–762) показывает поля «Назначить тариф» + «Дата начала действия тарифа». Live `TransitionEnrollmentDto` (§A11) = `{toStatus*, comment?, currentGroupId?}` — **не принимает тариф/дату тарифа**. Это были mock-поля прототипа.

Решение (design-fidelity допускает отклонение под backend-контракт, CLAUDE §6): модал card_created строит информативную часть 1:1 (баннер + буллеты «создан ребёнок + опекун + первый счёт + статус»), **поля тарифа опущены** — контракт их не принимает. Тариф назначается отдельно через Назначения тарифов (B9, реактивация-флоу B4 уже так делает). Не блокирует B5. Пересмотр: если backend добавит тариф в transition-DTO → вернуть поля, обновить HANDOFF §6 + DESIGN §6.2 под факт (first-document).

### C7 — Enrollments: нет enrollment-level поля группы · parked/watch (2026-05-19, W4/B5)

Контекст: дизайн EnrollmentDetail рисует «Желаемая группа» в карточке данных ребёнка. Live `EnrollmentResponseDto`/`UpdateEnrollmentDto` (§A11) **не имеют поля группы**; `currentGroupId` есть только в `TransitionEnrollmentDto` (card_created).

Решение: селект группы (`useGroups`) размещён в модале card_created, где контракт принимает `currentGroupId`; в карточке данных ребёнка enrollment-level поля группы нет (нечего показывать/персистить). Backend-forced, не блокирует B5. Пересмотр: если нужно информативное `desiredGroupId` на enrollment-DTO → backend-need + HANDOFF §6.

### C8 — Groups/Staff: имя локации не резолвится (нет locations endpoint в scope) · parked/watch (2026-05-19, W4/B6)

Контекст: `GroupDto` даёт только `current_location_id` (UUID). Дизайн GroupsList/GroupDetail рисует **имя** локации. Locations endpoints — B14 (вне scope волны). Аналог §C4.

Решение: фронт деградирует честно — не выдумывать имя из UUID; контрол локации disabled/«—» (имя появится при B14). Не блокирует B6. Пересмотр: B14 (locations) — резолв имени, обновить под факт.

> Сопутствующее (тот же корень — нет агрегата на `GroupDto`/нет summary-endpoint): подзаголовок списка групп показывает только число групп; суммарное «N детей» прототипа опущено (нельзя посчитать без per-group дозапросов; §C4-прецедент против фабрикации агрегата). Вернуть при появлении groups-summary endpoint.

### C9 — Groups/Staff: live — один активный ментор, нет multi-mentor/assistant/make-primary · parked/watch (2026-05-19, W4/B6)

Контекст: дизайн GroupDetail «Воспитатели» показывает несколько менторов (primary + «Ассистент») и действие «Сделать основным»; StaffDetail — «★ Основной». Live (§A12.5): `GET /groups/:id/mentor` → **ровно один активный** GroupMentorDto; `POST/DELETE /groups/:id/mentor` — назначить/снять; **make-primary endpoint отсутствует**, multi-mentor/assistant поверхность не экспонирована. `is_primary` — read-only из DTO.

Решение (CLAUDE §6 — отклонение под контракт): UI показывает одного активного ментора + информативный баннер-инвариант; multi-mentor таблица и «Сделать основным» **опущены** (нет endpoint), не выдумываются. Не блокирует B6. Пересмотр: backend добавит multi-mentor / make-primary → вернуть по факту, обновить HANDOFF §7.

### C10 — Groups: archive вместо deactivate; enforcement `group_has_active_children` на archive не подтверждён · parked/watch (2026-05-19, W4/B6)

Контекст: HANDOFF §7 описывал `deactivate` с пречеком 409 `group_has_active_children`. Live (§A12.1) — `POST /groups/:id/archive` + `restore`; принудительный пречек 409 на archive по live `/docs-json` не подтверждён.

Решение: «Деактивировать» → `archive`; FE обрабатывает 409 `group_has_active_children` **defensive** (если backend вернёт — показывает блокер-модал «переведите детей» со ссылкой на детей группы; код есть в error-map). Реальное поведение — подтвердить ручным QA/backend. Не блокирует B6 (UI корректно при обоих исходах).

### C11 — Staff: нет reverse staff→groups листинга · parked/watch (2026-05-19, W4/B6)

Контекст: дизайн StaffList колонка «Группы» (для mentor) и StaffDetail блок «Назначения групп». Live (§A12.5/§A13.6): нет `GET /admin/staff/:id/groups` и нет reverse staff→groups; mentor-binding только group-side (`/groups/:id/mentor`). N+1-скан всех групп ради колонки запрещён (стоимость + §C4-прецедент против фабрикации).

Решение: колонка «Группы» в списке деградирует «—»; блок в карточке — info-стейт + только действие «Назначить в группу» (`useGroups` → `POST /groups/:id/mentor {staff_member_id}`); текущие назначения ментора из контракта не отображаются. Backend-forced, не блокирует B6. Пересмотр: backend даст staff→groups листинг → показать назначения, обновить HANDOFF §8.

### C12 — Staff: создание + привязка к группе не атомарны · parked/watch (2026-05-19, W4/B6)

Контекст: HANDOFF §8 (старая редакция) подразумевал атомарный create+assign (`group_id` в CreateStaffDto). Live `CreateStaffDto` (§A13.2) **без `group_id`**.

Решение: форма создания mentor делает 2 шага — `POST /admin/staff` → затем `POST /groups/:id/mentor {staff_member_id}`. Частичный сбой (staff создан, assign упал) — warning-тост, пользователь дозначает из карточки. Backend-forced, не блокирует B6. Пересмотр: backend добавит атомарный create+assign → упростить.

### C13 — Enrollments: нет поля пола ребёнка → child после card_created с пустым gender · parked/watch (2026-05-19, W4/B5-fix)

Контекст: при `card_created` система авто-создаёт `children` из данных лида. Пользователь хочет вводить пол ребёнка на этапе лида, чтобы у созданной карточки `gender` не был пустым. Сверка live `/docs-json` (2026-05-19, повторно): `CreateEnrollmentDto` / `UpdateEnrollmentDto` / `TransitionEnrollmentDto` **не имеют поля gender** (поля enrollment — §A11). Фронт физически не может пробросить пол через воронку лида.

Решение (CLAUDE §2 — не выдумывать поле; не добавлять мёртвый непишущийся контрол): UI лида **без поля пола** (не вводим то, что контракт не примет). **Workaround (рабочий сейчас):** после `card_created` админ задаёт пол на карточке ребёнка — `routes/children/tabs/profile-tab.tsx` имеет рабочий gender-Select (male/female, B4). Backend-need каталогизирован в [`BACKEND_NEEDINGS_HANDOFF.md`](BACKEND_NEEDINGS_HANDOFF.md) **N5**. Не блокирует B5 (acceptance закрыт; gender выставляется на карточке ребёнка). Пересмотр: backend добавит `gender` в CreateEnrollmentDto/TransitionEnrollmentDto → добавить селект пола в форму лида, обновить HANDOFF §6 (first-document).

### C14 — Invoice detail: контракт не отдаёт payments/refunds/fiscal-массивы · parked/watch (2026-05-19, W5/B7)

Контекст: дизайн `screens-billing.jsx` `InvoiceDetail` + DESIGN §6.10.1 рисуют секции карточки счёта: Позиции, **Связанные оплаты, Возвраты, Фискальные чеки**, Применённые скидки. Live `GET /admin/invoices/:id` (`InvoiceResponseDto`, §A14.6) содержит **только `line_items[]`** + плоские поля скидки (`discount_pct?, discount_reason?, amount_after_discount`). Массивов `payments`/`refunds`/`fiscal_receipts`/`discounts` в DTO нет; отдельных вложенных эндпоинтов в scope B7 тоже нет.

Решение (design-fidelity допускает отклонение под backend-контракт, CLAUDE §6; прецедент §C4/§C8/§C11): фронт B7 строит секции **Позиции** (line_items) и **Скидка** (плоские поля) 1:1; секции **Оплаты/Возвраты/Фискальные чеки** — **честная деградация**: scaffold/лейаут секции прототипа сохранён, внутри — информативный empty/info-state (локализованный «данные предоставляются отдельно / недоступно в текущем API»), данные **не выдумываются**. Не блокирует B7 (acceptance закрыт). Каталог backend-need — [`BACKEND_NEEDINGS_HANDOFF.md`](BACKEND_NEEDINGS_HANDOFF.md) **N6**. Пересмотр: backend добавит вложенные массивы в `InvoiceResponseDto` ИЛИ выделенные эндпоинты (`/admin/invoices/:id/{payments,refunds,fiscal-receipts}`) → вернуть секции по факту, обновить HANDOFF §13 + DESIGN §6.10.1 (first-document).

### C15 — Parent-request: DTO без отображаемых имён автора/заявителя/ребёнка · parked/watch (2026-05-19, W5/B8)

Контекст: дизайн `screens-ops.jsx` `RequestDetail`/`RequestsList` рисует именованные пузыри треда (ФИО автора), имя заявителя в шапке, имя ребёнка в колонке списка. Live `ParentRequestResponseDto` даёт только `requester_user_id`/`child_id` (UUID); `ParentRequestMessageResponseDto` — только `author_user_id`/`author_staff_id` (UUID, ровно один). Отображаемых имён в контракте нет; batch-резолва users в scope B8 нет. Аналог §C4.

Решение (CLAUDE §6 — честная деградация, без фабрикации из UUID): сторона пузыря/автор определяется по тому, какой `author_*_id` задан → обобщённый локализованный лейбл (родитель / администрация-сотрудник), без выдуманного имени/инициалов; имя ребёнка в списке резолвится отдельным `useChildrenList` (children-домен это уже отдаёт), fallback — усечённый идентификатор; лейаут пузырей прототипа сохранён. Не блокирует B8 (acceptance закрыт). Каталог backend-need — [`BACKEND_NEEDINGS_HANDOFF.md`](BACKEND_NEEDINGS_HANDOFF.md) **N7**. Пересмотр: backend встроит `author_display_name`/`requester_name`/`child_name` в DTO ИЛИ даст users-lookup (как §C4/N2) → показать имена по факту, обновить HANDOFF §19.

### C16 — Staff DTO без отображаемых полей user (full_name/phone null когда staff_members.\* null) · parked/watch (2026-05-21, W6/B9 manual QA)

Контекст: при ручном QA волны B9 (страница `/staff` в проде Vercel) обнаружено — у staff-записей таблица показывает ФИО `—`, телефон `—`, аватар-инициалы пустые (`?`). Соседний клиент SuperAdmin (того же backend) на `/admins` для тех же `user_id` показывает реальные `phone` (`+7 (777) 227-00-88`) и `full_name` (`asda qweq`) — то есть значения **есть** в таблице `users`, но `staff_members.full_name|phone` пусты, и `/admin/staff/*` JOIN на `users` не делает. `StaffMemberDto` (§A13.5) официально допускает оба поля nullable. Прямой аналог §C4 (Guardians: только UUID, нет user-display) и §C15 (Parent-requests). FE B6 не виноват — Zod корректно парсит nullable, колонки честно рендерят `—` (CLAUDE §6 / §C4-прецедент: не фабриковать имя из phone/UUID, иначе путаница «Имя: +77772270088»).

Решение (CLAUDE §6 — честная деградация, без фабрикации; прецедент §C4/§C11/§C15): фронт **остаётся как есть** — `full_name ?? '—'`, `phone ? formatPhone : '—'`, аватар fallback по initials (пустой при null). Лейаут таблицы сохранён, реальные поля (роль/статус/specialist_type) корректны. **Не подмешивать phone в колонку «Имя»** (как делает SuperAdmin fallback'ом) — это не имя, путает оператора. Каталог backend-need — [`BACKEND_NEEDINGS_HANDOFF.md`](BACKEND_NEEDINGS_HANDOFF.md) **N8**. Не блокирует B6/B9 (acceptance оба закрыты). Пересмотр: backend сделает JOIN на `users` в `StaffMemberDto` (как просит N2 для GuardianDto) ИЛИ заполнит `staff_members.full_name|phone` при INSERT из `users` ИЛИ даст общий users-lookup `GET /users?ids=…` (как просят N2/N7) → имя/телефон появятся, обновить HANDOFF §8.

### C17 — Profile: блок «Активные сессии» удалён — нет backend session-management · parked/watch (2026-06-04, B14 manual QA)

Контекст: при ручном QA B14 владелец заметил в `/profile` блок «Безопасность → Активные сессии» (VIS Profile): строка «Web · Chrome · сейчас» + красная кнопка «Завершить другие сессии». Это был **статический мок прототипа** — строка захардкожена, кнопка без `onClick`. Сверка live `/docs-json` (2026-06-04): эндпоинтов листинга/управления сессиями/устройствами **нет** (есть только `POST /auth/logout` — выход текущей сессии, и `POST /admin/qr/revoke-all/{userId}` — отзыв QR, не веб-сессий).

Решение владельца (B14 QA): **блок удалён целиком** из `routes/profile.tsx` (+ 4 i18n-ключа `section_security/active_sessions/session_info/end_other_sessions` из `profile.json` ru/kk). Прецедент честной деградации §C4/§C14 — не оставлять мёртвый контрол, выглядящий рабочим, и не показывать выдуманные данные сессии. Не блокирует B14.

Пересмотр: если backend добавит session-management (`GET /auth/sessions` + `POST /auth/sessions/revoke` / `revoke-others`) → вернуть блок 1:1 по VIS Profile, обновить HANDOFF §27 + DESIGN §6.17 (first-document). Каталогизировать в [`BACKEND_NEEDINGS_HANDOFF.md`](BACKEND_NEEDINGS_HANDOFF.md) при необходимости.

### C18 — Settings: нет PATCH для top-level полей садика (name/address/phone) → вкладка «Основное» read-only · parked/watch (2026-06-04, B15)

Контекст: дизайн `screens-ops.jsx` Settings + DESIGN §6.15 рисуют вкладку «Основное» с редактируемыми полями name/address/phone садика. Сверка live `/docs-json` (2026-06-04): единственный пишущий эндпоинт настроек — `PATCH /api/v1/kindergartens/me/settings`, и он заменяет **только JSONB-объект `settings`** (timezone/currency/late_pickup_fee/grace_days/otp_expiry/prepay-скидки — вкладка «Операционные параметры»). PATCH для top-level полей `kindergartens` (`name`/`address`/`phone`) в Admin-scope **нет** (есть только SuperAdmin-поверхность `/saas/kindergartens`). Любой top-level edit с админки был бы no-op.

Решение (CLAUDE §6 — честная деградация, без мёртвого «рабочего» контрола; прецедент §C14/§C17): вкладка «Основное» рендерит name/address/phone/slug **read-only** (disabled + hint «управляется платформой»), Save-кнопка показывается **только** на вкладке «Операционные параметры» (единственная с пишущимися полями). Фискальные поля — read-only (как и было, `fiscal_*` → 403 `fiscal_settings_forbidden`). Не блокирует B15 (acceptance закрыт: настройки сохраняются через `settings`-bag, тема/радиус через ui-store). Каталог backend-need — [`BACKEND_NEEDINGS_HANDOFF.md`](BACKEND_NEEDINGS_HANDOFF.md) (N9 при необходимости). Пересмотр: backend добавит `PATCH /kindergartens/me` (top-level name/address/phone) → вернуть редактируемую форму «Основное», обновить HANDOFF §25 + DESIGN §6.15 (first-document).

### C19 — Holidays/Fiscal/DLQ: live-выравнивание контрактов B15 · resolved (2026-06-04, B15)

Сверка live `/docs-json` перед B15 (2026-06-04) дала расхождения с HANDOFF (формулировки писались до фиксации live):

- **Holidays** `GET /api/v1/admin/holidays`: фильтры **`from_date`/`to_date`** (ISO YYYY-MM-DD), ответ — **bare array** (не `{items,total,limit,offset}` offset-пагинация, как подразумевал §15). `name` — JSONB i18n (`{ru,kk}`), в openapi типизирован `Record<string,never>` (artifact) → читаем через `lib/jsonb-i18n.ts` (canonical `kk`). Уникальность даты на садик → 409 `holiday_already_exists`.
- **Fiscal** `FiscalReceiptResponseDto.ofd_status`: enum `queued|sent|failed` (нет `success` — дизайн-статус «success» маппится на `sent`). Read-only список+деталь, расширенные операции (retry/queue/report) — Phase B заглушки disabled.
- **DLQ** `GET /api/v1/admin/lifecycle/failed-jobs`: cursor-пагинация `limit`+`cursor`, ответ `{items,next_cursor}`; `failed_reason`/`finished_on` типизированы `Record<string,never>|null` (artifact) → парсим `z.unknown().nullable()` + безопасный display. Retry `POST …/{id}/retry`; RBAC §24 (per-kg admin retry'ит только свои `payload.kindergartenId`; 403 валидному админу = backend-баг, эскалировать).

Решение: фронт B15 построен по live-факту (код сверен с `openapi.d.ts`, не с устаревшей формулировкой). HANDOFF §15/§17/§24 имеет смысл подогнать под факт отдельным docs-fixup (как pre-B11/pre-B12 правки), не блокер.

---

_Производный документ. Первоисточники — [`ADMIN_FRONTEND_HANDOFF.md`](ADMIN_FRONTEND_HANDOFF.md), [`ADMIN_DESIGN_SPEC.md`](ADMIN_DESIGN_SPEC.md). Обновлять при изменении backend-scope или решений владельца._
