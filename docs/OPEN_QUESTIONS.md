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

### A15 — Parent-requests: list `/admin/*` vs detail/actions `/staff/*`, `type` filter, snake_case, cursor · resolved (2026-05-19)

Контекст: при B8 (parent-requests data+UI) сверка live `/docs-json` выявила существенное расхождение HANDOFF §19 ↔ факт. Решение: прецедент §A7/§A8 — live = факт. Зафиксировано (HANDOFF §19 правлен под факт в wave-коммите B7+B8 — first-document):

1. **Префикс расщеплён:** HANDOFF §19 — всё под `/admin/parent-requests/*`. Live: **только list** = `GET /api/v1/admin/parent-requests`; **detail / accept / reject / messages (GET+POST)** = под `/api/v1/staff/parent-requests/{id}/*`. Эндпоинта `/admin/parent-requests/:id` нет.
2. **RBAC:** Admin JWT авторизован для `/staff/parent-requests/*` (admin — staff_member с role=admin; подтверждено сводкой live-операции «Admin sees everything in kg»). НЕ blocker. 403 → `parent_request_forbidden` (штатный RBAC, не исключение admin) — добавлено в error-map + i18n (RU/KK).
3. **Filter param:** `type` (НЕ `request_type`). Прочие: `status, child_id, group_id, recipient_type, limit, cursor`.
4. **Casing:** snake_case (request + response). `ReviewRequestDto {review_note?}`, `AddMessageDto {body*, attachments?:string[]}`.
5. **Cursor подтверждён:** list + messages → `{items, next_cursor:string|null}` (null на последней странице). Невалидный cursor → 400 `parent_request_cursor_invalid`.
6. **DTO:** `ParentRequestResponseDto` (18 полей, snake_case; `request_type` enum `trusted_person|day_off|vacation|late_pickup|open_request`, `status` enum `pending|accepted|rejected|cancelled`, `recipient_type` enum `admin|mentor|specialist`, `details` JSONB по типу — `.passthrough()`, не over-model; nullable: `date_from, date_to, recipient_type, recipient_staff_id, reviewed_by, reviewed_at, review_note, invoice_id`). `ParentRequestMessageResponseDto` — только UUID автора (`author_user_id`/`author_staff_id`), без имени → §C15 / N7. Код B8 conform к live с defensive Zod.

---

## B. Открытые (open — НЕ кодить до resolve)

Формат записи:

```
### B<n> — <короткий заголовок> · open (<дата>)
Контекст: <что обнаружено, где>. Блокирует: <батч/слайс>.
Нужно решение: <вопрос владельцу/backend>. Гипотеза: <если есть>.
```

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

### C3 — `/admin/*` RBAC-нюанс для DLQ · parked/watch

HANDOFF §24: исторически `/admin/*` мог быть заскоплен строго на роль `admin`. Если валидный админ получает 403 на lifecycle-DLQ — это backend-баг, **эскалировать**, не обходить на фронте. Проверить на проде в B15.

### C4 — GuardianDto не содержит ФИО/телефон пользователя · parked/watch (2026-05-18, W3/B4)

Контекст: при B4 (вкладка «Опекуны») обнаружено — live `GuardianDto` (§A8) содержит только `user_id` (UUID), без `full_name`/`phone`/`relationship`. Дизайн `screens-core.jsx` ChildDetail рисует ФИО/телефон/связь опекуна (это были mock-данные прототипа). Batch-эндпоинта резолва `users` для отображения нет в scope B4.

Решение (design-fidelity допускает отклонение под backend-контракт, CLAUDE §6): фронт B4 **деградирует честно** — не выдумывать имя/инициалы из UUID; показывать реальные поля (роль/статус/can_pickup/has_approval_rights) + идентификатор пользователя явно помеченным (не как «имя»); колонки ФИО/телефон/связь — graceful («—»/скрыто), лейаут таблицы по прототипу сохранён. **Эскалация backend:** рекомендовать встроить в `GuardianDto` отображаемую инфу пользователя (`user_full_name`, `user_phone`, `relationship`) ИЛИ предоставить users-lookup. Пересмотреть когда backend расширит контракт или появится users-резолв (B6/B14/профиль). Не блокирует B4.

### C5 — Storage presigned-upload (фото ребёнка) не реализован на backend · parked/watch (2026-05-18, W3/B4)

Контекст: при ручном QA B4 загрузка фото в `/children/new` → `POST /api/v1/storage/presigned-upload` = **404**. Сверка live `/docs-json`: presigned-эндпоинтов (`/storage/presigned-upload`, `/storage/confirm-upload`, `/storage/download/:key`) **нет**; существует только прямой `POST /api/v1/admin/content/upload-media` (multipart → `{url,key,bytes}`) + `POST /api/v1/children/{id}/photo {photo_url}` + `GET /api/v1/media/{kgId}/{yyyyMm}/{filename}`. Код B4 (`api/storage.ts`, `hooks/use-storage.ts`, `components/forms/file-upload.tsx`) построен **верно по HANDOFF §2 (стр.83) / DESIGN §183** (presigned 3-step, `purpose=child_photo`) — это не выдумка фронта, а документированный контракт.

Решение владельца (уточнено у backend, 2026-05-18): фича `child_photo` на backend **ещё не готова** (presigned — Phase B, см. C2; `upload-media` под `child_photo` backend не поддерживает). **Оставляем как есть** — код presigned не трогаем, 404 всплывает как обработанная ошибка (тост, не краш), карточка создаётся без фото (`photo_url?` опционален). НЕ переписывать на `upload-media`, ничего не доинвентить. Сделать фичу, когда backend выкатит storage для child_photo. **Не блокирует B4** (фото — единственная заблокированная подфича; CRUD/группы/опекуны/архив работают).

Пересмотр: когда backend сообщит о готовности child_photo storage → реализовать по фактическому контракту, обновить HANDOFF §2/§5 + DESIGN §183 (presigned vs multipart) под факт (first-document). Связано с C2 (S3/presigned Phase B).

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

---

_Производный документ. Первоисточники — [`ADMIN_FRONTEND_HANDOFF.md`](ADMIN_FRONTEND_HANDOFF.md), [`ADMIN_DESIGN_SPEC.md`](ADMIN_DESIGN_SPEC.md). Обновлять при изменении backend-scope или решений владельца._
