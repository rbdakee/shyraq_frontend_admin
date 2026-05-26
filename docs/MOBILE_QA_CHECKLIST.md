# Mobile QA Checklist -- Shyraq Admin Web

Manual browser QA for all 33 mobile screens. User runs this after B22 lands.
Owner: user. Tooling: Chrome/Edge DevTools responsive mode.

## Setup

- `pnpm dev` then open http://localhost:5173
- DevTools device toolbar: test at 390px (iPhone 12 Pro), 768px (iPad mini), 1023px (just-under-desktop)
- Themes to verify: light green (default) + dark
- Two locales: RU + KK (switch in Settings Appearance section)
- Test account: (placeholder -- user fills in)

## Golden-path smoke flows

1. Login phone input -> OTP -> Dashboard -> Children list -> Child detail -> Add guardian -> save
2. Dashboard -> Invoices list -> Invoice detail -> Mark as paid -> fiscal receipt block
3. Dashboard -> Parent requests -> Approve a request -> status updates
4. More menu -> Settings -> switch theme to dark -> verify CSS-vars apply everywhere -> switch back to green
5. More menu -> navigate to nonexistent route (`/nonexistent`) -> 404 page -> "Go home" CTA works
6. Resize viewport 1023px -> 1024px -> confirm mobile shell swaps to desktop cleanly (no flash, no layout overlap)

## Per-screen checks (33 screens)

For each screen below, verify across:

- Viewport: 390 / 768 / 1023
- Theme: light green + dark
- Locale: RU + KK
- States: loading / empty / error / data-rich (where applicable)

### B18 -- Core screens (8)

#### 1. Login (`/login`)

- [ ] Hero card + phone input + submit button
- [ ] Loading state after submit
- [ ] Error state (invalid phone)
- [ ] KK locale renders correctly (no overflow)

#### 2. OTP (`/login` step 2)

- [ ] OTP cells + timer + back button
- [ ] Resend code link
- [ ] Error state (invalid OTP)

#### 3. Dashboard (`/`)

- [ ] MBar with greeting + notification bell
- [ ] KPI row (2-col grid)
- [ ] Overdue alert card
- [ ] Donut attendance chart
- [ ] Quick actions grid
- [ ] Activity timeline

#### 4. Notifications (`/notifications`)

- [ ] Full-screen with back button
- [ ] Segmented: All / Unread
- [ ] Grouped by day
- [ ] Empty state

#### 5. More menu (`/more`)

- [ ] Profile card with avatar + name
- [ ] Grouped nav sections (Pupils / Daily / Billing / Ops)
- [ ] Settings link
- [ ] Logout button

#### 6. Children list (`/children`)

- [ ] MBar + search input
- [ ] Chips filter (status)
- [ ] Card-list (avatar + name + age/group + status badge)
- [ ] FAB for create

#### 7. Child detail (`/children/:id`)

- [ ] Profile header (avatar, name, group, badge)
- [ ] Quick actions row (Call, Message, QR, Invoice)
- [ ] KV sections (Guardians, Billing, Timeline)

#### 8. Enrollments (`/enrollments`)

- [ ] MBar + segmented (Funnel / List / Archive)
- [ ] Chips by stage
- [ ] Lead cards with stage-colored strip

### B19 -- Ops screens (2)

#### 9. Parent requests (`/parent-requests`)

- [ ] MBar + segmented (New / In progress / Closed)
- [ ] Request inbox cards (unread dot, avatar, type badge, body preview)
- [ ] Filter icon opens bottom-sheet

#### 10. Attendance (`/attendance`)

- [ ] MBar + date strip (h-scroll pills)
- [ ] Overall stats card (total/fill %)
- [ ] Stat pills (Present / Late / Sick / Absent)
- [ ] Per-group capacity bars
- [ ] Child grid (2-col)

### B20 -- Billing screens (10)

#### 11. Invoices list (`/billing/invoices`)

- [ ] MBar + KPI summary row
- [ ] Chips filter (status)
- [ ] Invoice rows
- [ ] FAB

#### 12. Invoice detail (`/billing/invoices/:id`)

- [ ] Hero amount card with status gradient
- [ ] KV details
- [ ] Line items
- [ ] Sticky bottom actions (PDF + Send)

#### 13. Payments list (`/billing/payments`)

- [ ] MBar + KPI row
- [ ] Provider chips
- [ ] Payment rows

#### 14. Payment detail (`/billing/payments/:id`)

- [ ] Hero status circle
- [ ] KV details
- [ ] Event timeline

#### 15. Tariffs (`/billing/tariff-plans`)

- [ ] Segmented: Plans / Assignments
- [ ] Plan cards with price/status/kids count
- [ ] Navigate via `/billing/tariff-assignments` shows Assignments tab

#### 16. Refunds (`/billing/refunds`)

- [ ] Phase A warning banner
- [ ] Segmented (Pending / In progress / History)
- [ ] Refund cards

#### 17. Discounts (`/billing/discounts`)

- [ ] Discount cards with type/stats/period
- [ ] Navigate to detail

#### 18. Discount wizard (`/billing/discounts/new`)

- [ ] 4-step stepper
- [ ] Conditions builder
- [ ] Preview step
- [ ] Sticky bottom nav (Back / Next)

#### 19. Holidays (`/billing/holidays`)

- [ ] Month navigation
- [ ] Calendar grid (7-col, holiday dates highlighted)
- [ ] Holiday list with KK names

#### 20. Fiscal receipts (`/billing/fiscal-receipts`)

- [ ] Phase A info banner
- [ ] KPI row
- [ ] Receipt list

### B21 -- Secondary screens (8)

#### 21. Groups list (`/groups`)

- [ ] KPI row (Groups / Children / Over capacity)
- [ ] Group cards (emoji + name + age + mentor + capacity bar)

#### 22. Group detail (`/groups/:id`)

- [ ] Gradient header (capacity info)
- [ ] KV info
- [ ] Segmented (Children / Schedule / History)

#### 23. Staff list (`/staff`)

- [ ] Search input
- [ ] Chips (role filter)
- [ ] Staff card-list (avatar + name + role badge)
- [ ] FAB

#### 24. Staff detail (`/staff/:id`)

- [ ] Profile header
- [ ] Quick actions
- [ ] KV sections (Contacts / Employment / Documents)

#### 25. Structure (`/structure/locations`)

- [ ] Segmented (Locations / Cameras)
- [ ] Location list (icon + name + desc + counts)
- [ ] Phase C banner for cameras tab

#### 26. Schedule (`/schedule/templates/:id`)

- [ ] Day strip (h-scroll Mon-Sun)
- [ ] Time-slot list with colored cards

#### 27. Meals (`/meal-plans`)

- [ ] Day strip
- [ ] Calories summary card
- [ ] Meal cards (type + time + KK name + items + cal badge)
- [ ] Allergen chips

#### 28. Content (`/content`)

- [ ] Segmented (Feed / Scheduled / Drafts)
- [ ] Social-feed cards (avatar + title + body + image + likes/comments)
- [ ] FAB

### B22 -- System screens (5)

#### 29. Diagnostics (`/diagnostics/templates`)

- [ ] MBar with Plus button
- [ ] Specialist chips filter (All / Psychologist / Speech / Music)
- [ ] Template cards (spec badge + name + version mono + used count + active badge)
- [ ] Inactive cards have reduced opacity

#### 30. Face ID (`/face`)

- [ ] Phase C warning banner (gradient background)
- [ ] Segmented (Consents / Profiles / Cameras)
- [ ] KPI row (Signed / Pending / Rejected)
- [ ] Consent list with status badges
- [ ] Profiles/Cameras tabs show placeholder text

#### 31. DLQ (`/operations/lifecycle-dlq`)

- [ ] Danger banner with warning icon
- [ ] Task cards (icon + title + detail + mono error + retries + Retry button)
- [ ] Danger tone cards vs warning tone cards distinct

#### 32. Settings (`/settings`)

- [ ] Section headers (Kindergarten / Billing / Notifications / Appearance / Integrations)
- [ ] Drawer items with icons and descriptions
- [ ] Theme picker grid (2-col, color swatches + name + checkmark on active)
- [ ] Theme switch applies immediately (CSS vars change)
- [ ] Radius picker (sharp / soft / round) applies immediately
- [ ] Toggle switches in Notifications section

#### 33. Error pages (`/nonexistent`, `/_403`, `/_500`)

- [ ] Large mono error number (120x120 block)
- [ ] Title + description text
- [ ] "Go home" primary CTA
- [ ] "Go back" ghost CTA
- [ ] Mobile and desktop layouts both work

## Cross-cutting

- [ ] Theme switching does not break mobile layout
- [ ] Resize 1023 to 1024 swaps mobile to desktop cleanly (no flash, no overlap)
- [ ] Browser back/forward preserves scroll/state on list pages
- [ ] FAB on list screens (Children, Staff, Invoices, Content) -- primary color, bottom-right, does not overlap rows
- [ ] Tab bar badges update live (new request adds badge on Requests tab)
- [ ] Bottom sheets close on swipe-down / backdrop tap / ESC
- [ ] All i18n strings render -- no raw key strings (`common.mobile_xxx`) leaking through
- [ ] KK locale: all labels render, no truncation/overflow issues
- [ ] Dark theme: all text readable, no invisible elements, tab bar visible

## Known limitations / TODOs

- Diagnostics uses mock data -- wire `useDiagnosticsTemplates` when B13 desktop is built
- Face ID uses mock data -- wire `useFace` hooks when B15 desktop is built (Phase C feature)
- DLQ uses mock data -- wire `useLifecycleDlq` when B15 desktop is built
- Settings sections (General, Languages, Requisites, Providers, OFD, Notifications toggles, Integrations) are read-only UI -- wire to backend when B15 desktop is built
- Mock data strings in Content, Meals, Schedule, Structure, Attendance, Holidays, Fiscal are hardcoded RU (these represent realistic placeholder data that will be replaced by backend data when respective hooks are wired)
