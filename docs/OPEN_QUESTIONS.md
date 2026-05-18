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

---

## B. Открытые (open — НЕ кодить до resolve)

_Пусто. Добавлять сюда при обнаружении расхождения handoff↔backend↔design в ходе батча._

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

---

_Производный документ. Первоисточники — [`ADMIN_FRONTEND_HANDOFF.md`](ADMIN_FRONTEND_HANDOFF.md), [`ADMIN_DESIGN_SPEC.md`](ADMIN_DESIGN_SPEC.md). Обновлять при изменении backend-scope или решений владельца._
