// data.jsx — mock demo data for the admin panel
const DATA = {
  kg: { name: 'Балапан KZ', slug: 'balapan-kz', address: 'г. Алматы, мкр. Самал-2, дом 78', phone: '+7 727 311 22 33', currency: 'KZT', tz: 'Asia/Almaty' },
  me: { name: 'Айгуль Серикбаева', role: 'admin', phone: '+7 701 234 56 78', kg_count: 2 },

  // Groups
  groups: [
    { id: 'g1', name: 'Жұлдызшалар', age_min: 18, age_max: 30, capacity: 18, kids: 16, location: 'Кабинет 1A', mentor: 'Сауле Бекова', mentor_avatar: 'staff', status: 'active' },
    { id: 'g2', name: 'Ботақан', age_min: 30, age_max: 42, capacity: 20, kids: 20, location: 'Кабинет 1B', mentor: 'Динара Касенова', mentor_avatar: 'staff', status: 'active' },
    { id: 'g3', name: 'Кішкентайлар', age_min: 42, age_max: 54, capacity: 22, kids: 23, location: 'Кабинет 2A', mentor: 'Мадина Жакупова', mentor_avatar: 'staff', status: 'active' },
    { id: 'g4', name: 'Алғырлар', age_min: 54, age_max: 66, capacity: 24, kids: 19, location: 'Кабинет 2B', mentor: 'Гульнара Аманова', mentor_avatar: 'staff', status: 'active' },
    { id: 'g5', name: 'Дайын мектепке', age_min: 66, age_max: 84, capacity: 22, kids: 14, location: 'Кабинет 3A', mentor: 'Айнур Дюсенова', mentor_avatar: 'staff', status: 'active' },
  ],

  children: [
    { id: 'c1', name: 'Алихан Жумабаев', iin: '210314600123', dob: '2021-03-14', sex: 'м', group: 'g3', status: 'active', enrolled_at: '2024-09-02', allergies: 'Цитрусовые', medical: '—' },
    { id: 'c2', name: 'Дильназ Ермекова', iin: '220822400089', dob: '2022-08-22', sex: 'ж', group: 'g2', status: 'active', enrolled_at: '2024-09-02', allergies: '—', medical: 'Лёгкая астма' },
    { id: 'c3', name: 'Арман Сейтжанов', iin: '200217600234', dob: '2020-02-17', sex: 'м', group: 'g4', status: 'active', enrolled_at: '2023-09-01' },
    { id: 'c4', name: 'Аяна Бекенова', iin: '230511400056', dob: '2023-05-11', sex: 'ж', group: 'g1', status: 'card_created', enrolled_at: '2025-09-12' },
    { id: 'c5', name: 'Мерей Тулеуов', iin: '210628600891', dob: '2021-06-28', sex: 'м', group: 'g3', status: 'active', enrolled_at: '2024-09-02' },
    { id: 'c6', name: 'Сабина Кенжебекова', iin: '220105400412', dob: '2022-01-05', sex: 'ж', group: 'g2', status: 'active', enrolled_at: '2024-11-15' },
    { id: 'c7', name: 'Нурислам Абенов', iin: '190919600677', dob: '2019-09-19', sex: 'м', group: 'g5', status: 'active', enrolled_at: '2023-09-01' },
    { id: 'c8', name: 'Малика Ескенова', iin: '230203400189', dob: '2023-02-03', sex: 'ж', group: 'g1', status: 'active', enrolled_at: '2025-02-10' },
    { id: 'c9', name: 'Айбек Сарсенов', iin: '210712600334', dob: '2021-07-12', sex: 'м', group: 'g3', status: 'active', enrolled_at: '2024-09-02' },
    { id: 'c10', name: 'Жанель Молдашева', iin: '220425400578', dob: '2022-04-25', sex: 'ж', group: 'g2', status: 'active', enrolled_at: '2024-09-02' },
    { id: 'c11', name: 'Расул Имангалиев', iin: '200830600102', dob: '2020-08-30', sex: 'м', group: 'g4', status: 'archived', enrolled_at: '2023-09-01', archived_at: '2025-04-10', archive_reason: 'Переезд семьи в другой город' },
    { id: 'c12', name: 'Камила Серикова', iin: '210130400245', dob: '2021-01-30', sex: 'ж', group: 'g3', status: 'active', enrolled_at: '2024-01-15' },
  ],

  guardians: {
    c1: [
      { id: 'gu1', name: 'Жанибек Жумабаев', phone: '+7 701 555 12 34', role: 'primary', status: 'approved', can_pickup: true, approval: true, relationship: 'Отец' },
      { id: 'gu2', name: 'Айгерим Жумабаева', phone: '+7 702 555 56 78', role: 'secondary', status: 'approved', can_pickup: true, approval: true, relationship: 'Мать' },
      { id: 'gu3', name: 'Зейнеп Калиева', phone: '+7 707 444 33 22', role: 'nanny', status: 'pending', can_pickup: true, approval: false, relationship: 'Няня' },
    ],
  },

  leads: [
    { id: 'l1', status: 'new', contact_name: 'Алия Кенжебекова', phone: '+7 707 111 22 33', child_name: 'Алия Сабинаевна', dob: '2022-03-15', source: 'Instagram', assigned: null, since: '2 ч назад' },
    { id: 'l2', status: 'new', contact_name: 'Жанар Абенова', phone: '+7 705 234 56 78', child_name: 'Айдан Жанарович', dob: '2021-11-02', source: 'Сайт', assigned: 'Айгуль С.', since: '5 ч назад' },
    { id: 'l3', status: 'in_processing', contact_name: 'Динара Тулеуова', phone: '+7 701 333 44 55', child_name: 'Раян Мерейулы', dob: '2022-08-19', source: 'Рекомендация', assigned: 'Айгуль С.', since: 'вчера' },
    { id: 'l4', status: 'in_processing', contact_name: 'Мадина Серикова', phone: '+7 702 999 88 77', child_name: 'Айлин Маратовна', dob: '2023-01-04', source: 'Сайт', assigned: 'Айгуль С.', since: '2 дня назад' },
    { id: 'l5', status: 'waitlist', contact_name: 'Гульнара Бекенова', phone: '+7 707 555 66 77', child_name: 'Жасмин Айбекқызы', dob: '2023-06-21', source: '2GIS', assigned: 'Айгуль С.', since: '4 дня назад' },
    { id: 'l6', status: 'waitlist', contact_name: 'Айнур Сейтжанова', phone: '+7 701 888 77 66', child_name: 'Темирлан Арманулы', dob: '2023-09-13', source: 'Рекомендация', assigned: null, since: '5 дней назад' },
    { id: 'l7', status: 'card_created', contact_name: 'Сауле Молдашева', phone: '+7 705 444 55 66', child_name: 'Малика Ескенова', dob: '2023-02-03', source: 'Instagram', assigned: 'Айгуль С.', since: '1 неделю назад' },
    { id: 'l8', status: 'cancelled', contact_name: 'Ержан Касенов', phone: '+7 707 222 33 44', child_name: 'Дамир Ержанович', dob: '2022-12-08', source: 'Сайт', assigned: 'Айгуль С.', since: '2 недели назад' },
  ],

  staff: [
    { id: 's1', name: 'Айгуль Серикбаева', phone: '+7 701 234 56 78', role: 'admin', spec: null, groups: [], status: 'active', hired_at: '2023-01-10' },
    { id: 's2', name: 'Сауле Бекова', phone: '+7 702 345 67 89', role: 'mentor', spec: null, groups: ['g1'], status: 'active', hired_at: '2023-08-15', primary: ['g1'] },
    { id: 's3', name: 'Динара Касенова', phone: '+7 705 456 78 90', role: 'mentor', spec: null, groups: ['g2'], status: 'active', hired_at: '2022-09-01', primary: ['g2'] },
    { id: 's4', name: 'Мадина Жакупова', phone: '+7 707 567 89 01', role: 'mentor', spec: null, groups: ['g3'], status: 'active', hired_at: '2023-09-04', primary: ['g3'] },
    { id: 's5', name: 'Гульнара Аманова', phone: '+7 701 678 90 12', role: 'mentor', spec: null, groups: ['g4'], status: 'active', hired_at: '2023-09-04', primary: ['g4'] },
    { id: 's6', name: 'Айнур Дюсенова', phone: '+7 702 789 01 23', role: 'mentor', spec: null, groups: ['g5'], status: 'active', hired_at: '2024-01-15', primary: ['g5'] },
    { id: 's7', name: 'Раушан Жанибекова', phone: '+7 705 890 12 34', role: 'specialist', spec: 'psychologist', groups: [], status: 'active', hired_at: '2023-10-05' },
    { id: 's8', name: 'Айжан Кенжебекова', phone: '+7 707 901 23 45', role: 'specialist', spec: 'speech_therapist', groups: [], status: 'active', hired_at: '2024-02-20' },
    { id: 's9', name: 'Әсем Бакитжанова', phone: '+7 701 012 34 56', role: 'specialist', spec: 'music_teacher', groups: [], status: 'active', hired_at: '2023-11-10' },
    { id: 's10', name: 'Наргиз Сапарова', phone: '+7 702 123 45 67', role: 'reception', spec: null, groups: [], status: 'active', hired_at: '2024-03-01' },
    { id: 's11', name: 'Динар Омарова', phone: '+7 705 234 56 78', role: 'mentor', spec: null, groups: [], status: 'inactive', hired_at: '2022-09-01' },
  ],

  invoices: [
    { id: 'inv-2025-1042', child: 'c1', type: 'monthly', period: 'Май 2026', amount: 180000, discounted: 162000, due: '2026-05-10', status: 'overdue' },
    { id: 'inv-2025-1041', child: 'c2', type: 'monthly', period: 'Май 2026', amount: 165000, discounted: 165000, due: '2026-05-10', status: 'paid' },
    { id: 'inv-2025-1040', child: 'c3', type: 'monthly', period: 'Май 2026', amount: 195000, discounted: 175500, due: '2026-05-10', status: 'paid' },
    { id: 'inv-2025-1039', child: 'c4', type: 'monthly', period: 'Май 2026', amount: 180000, discounted: 180000, due: '2026-05-15', status: 'pending' },
    { id: 'inv-2025-1038', child: 'c5', type: 'late_pickup_fee', period: '12.05.2026', amount: 5000, discounted: 5000, due: '2026-05-19', status: 'pending' },
    { id: 'inv-2025-1037', child: 'c6', type: 'monthly', period: 'Май 2026', amount: 165000, discounted: 148500, due: '2026-05-10', status: 'partial' },
    { id: 'inv-2025-1036', child: 'c7', type: 'monthly', period: 'Май 2026', amount: 195000, discounted: 195000, due: '2026-05-10', status: 'paid' },
    { id: 'inv-2025-1035', child: 'c8', type: 'additional_service', period: 'Логопед май', amount: 35000, discounted: 35000, due: '2026-05-20', status: 'pending' },
    { id: 'inv-2025-1034', child: 'c9', type: 'monthly', period: 'Май 2026', amount: 180000, discounted: 180000, due: '2026-05-10', status: 'overdue' },
    { id: 'inv-2025-1033', child: 'c10', type: 'monthly', period: 'Май 2026', amount: 165000, discounted: 165000, due: '2026-05-10', status: 'refunded' },
    { id: 'inv-2025-1032', child: 'c11', type: 'monthly', period: 'Апрель 2026', amount: 195000, discounted: 195000, due: '2026-04-10', status: 'cancelled' },
    { id: 'inv-2025-1031', child: 'c12', type: 'monthly', period: 'Май 2026', amount: 180000, discounted: 180000, due: '2026-05-10', status: 'paid' },
  ],

  payments: [
    { id: 'pay-aw81', invoice: 'inv-2025-1041', child: 'c2', amount: 165000, provider: 'halyk_epay', status: 'completed', date: '2026-05-08T10:24:00' },
    { id: 'pay-aw82', invoice: 'inv-2025-1040', child: 'c3', amount: 175500, provider: 'kaspi_pay', status: 'completed', date: '2026-05-09T14:11:00' },
    { id: 'pay-aw83', invoice: 'inv-2025-1037', child: 'c6', amount: 74250, provider: 'halyk_epay', status: 'completed', date: '2026-05-10T09:50:00' },
    { id: 'pay-aw84', invoice: 'inv-2025-1036', child: 'c7', amount: 195000, provider: 'cash', status: 'completed', date: '2026-05-10T17:33:00' },
    { id: 'pay-aw85', invoice: 'inv-2025-1031', child: 'c12', amount: 180000, provider: 'halyk_epay', status: 'completed', date: '2026-05-07T11:02:00' },
    { id: 'pay-aw86', invoice: 'inv-2025-1033', child: 'c10', amount: 165000, provider: 'kaspi_pay', status: 'refunded', date: '2026-05-05T12:11:00' },
    { id: 'pay-aw87', invoice: 'inv-2025-1042', child: 'c1', amount: 162000, provider: 'halyk_epay', status: 'failed', date: '2026-05-15T16:40:00' },
  ],

  refunds: [
    { id: 'r1', child: 'c11', payment: 'pay-x12', amount: 142500, reason: 'pro_rata_archive', status: 'pending', date: '2026-04-12' },
    { id: 'r2', child: 'c10', payment: 'pay-aw86', amount: 165000, reason: 'Семья отказалась от услуг', status: 'processed', date: '2026-05-05' },
    { id: 'r3', child: 'c4', payment: 'pay-q3', amount: 50000, reason: 'Двойная оплата', status: 'approved', date: '2026-05-13' },
    { id: 'r4', child: 'c8', payment: 'pay-q5', amount: 25000, reason: 'Запрос родителя без основания', status: 'rejected', date: '2026-05-11' },
  ],

  requests: [
    { id: 'rq1', type: 'late_pickup', child: 'c1', parent: 'Жанибек Жумабаев', status: 'pending', date: '2026-05-18', details: 'Заберу в 19:30 (вместо 18:00) — пробки' },
    { id: 'rq2', type: 'vacation', child: 'c3', parent: 'Айгерим Сейтжанова', status: 'pending', date: '2026-05-18', details: '20.05 — 02.06: семейная поездка' },
    { id: 'rq3', type: 'trusted_person', child: 'c2', parent: 'Айгерим Ермекова', status: 'pending', date: '2026-05-17', details: 'Тётя Сабина Болатовна — забрать пятница 22.05' },
    { id: 'rq4', type: 'day_off', child: 'c5', parent: 'Серик Тулеуов', status: 'accepted', date: '2026-05-15', details: 'Останется в саду в субботу 18.05' },
    { id: 'rq5', type: 'open_request', child: 'c6', parent: 'Жанар Кенжебекова', status: 'accepted', date: '2026-05-14', details: 'Вопрос по адаптации ребёнка к группе' },
    { id: 'rq6', type: 'late_pickup', child: 'c7', parent: 'Гульнара Абенова', status: 'rejected', date: '2026-05-12', details: 'Заберу после 20:00' },
    { id: 'rq7', type: 'vacation', child: 'c8', parent: 'Жанибек Ескенов', status: 'cancelled', date: '2026-05-11', details: '01.06 — 15.06' },
  ],

  content: [
    { id: 'p1', type: 'news', title: 'Утренник посвящённый Наурызу — фотоотчёт', target: 'Все', status: 'published', date: '2026-03-22' },
    { id: 'p2', type: 'qundylyq', title: 'Май: Құрмет (Уважение)', target: 'Все', status: 'published', date: '2026-05-01' },
    { id: 'p3', type: 'menu', title: 'Меню на неделю 19.05 — 23.05', target: 'Все', status: 'published', date: '2026-05-17' },
    { id: 'p4', type: 'birthday', title: 'С днём рождения, Алихан!', target: 'Группа: Кішкентайлар', status: 'scheduled', date: '2026-06-14' },
    { id: 'p5', type: 'news', title: 'Открытый урок для родителей — приглашаем', target: 'Все', status: 'scheduled', date: '2026-05-25' },
    { id: 'p6', type: 'schedule_pub', title: 'Расписание на июнь', target: 'Все', status: 'draft', date: null },
    { id: 'p7', type: 'news', title: 'Новые правила пропуска и забора детей', target: 'Все', status: 'draft', date: null },
  ],

  attendance: [
    { id: 'a1', child: 'c1', type: 'check_in', method: 'face_id', date: '2026-05-18T08:14:00', by: 'Жанибек Жумабаев' },
    { id: 'a2', child: 'c2', type: 'check_in', method: 'face_id', date: '2026-05-18T08:22:00', by: 'Айгерим Ермекова' },
    { id: 'a3', child: 'c3', type: 'check_in', method: 'manual', date: '2026-05-18T09:01:00', by: 'Мадина Жакупова' },
    { id: 'a4', child: 'c1', type: 'check_out', method: 'otp_pickup', date: '2026-05-18T18:42:00', by: 'Зейнеп Калиева' },
    { id: 'a5', child: 'c2', type: 'check_out', method: 'face_id', date: '2026-05-18T17:55:00', by: 'Айгерим Ермекова' },
  ],

  tariffs: [
    { id: 't1', name: 'Базовый месяц 18–36 мес', type: 'monthly_base', amount: 165000, applies: 'age_range 18-36', active: true, from: '2025-09-01' },
    { id: 't2', name: 'Базовый месяц 36–54 мес', type: 'monthly_base', amount: 180000, applies: 'age_range 36-54', active: true, from: '2025-09-01' },
    { id: 't3', name: 'Базовый месяц 54–84 мес', type: 'monthly_base', amount: 195000, applies: 'age_range 54-84', active: true, from: '2025-09-01' },
    { id: 't4', name: 'Поздний забор (после 18:30)', type: 'late_pickup', amount: 5000, applies: 'child', active: true, from: '2024-01-01' },
    { id: 't5', name: 'Логопед — индив. занятие', type: 'additional_service', amount: 7000, applies: 'child', active: true, from: '2024-09-01' },
    { id: 't6', name: 'Психолог — индив. занятие', type: 'additional_service', amount: 7000, applies: 'child', active: true, from: '2024-09-01' },
    { id: 't7', name: 'Расширенное питание', type: 'meal_upgrade', amount: 25000, applies: 'child', active: false, from: '2024-09-01' },
  ],

  discounts: [
    { id: 'd1', name: 'Семейная: 2-й ребёнок', type: 'percentage', amount: 10, status: 'active', used: 8, period: '2025-09-01 — ∞', priority: 10 },
    { id: 'd2', name: 'Предоплата за 12 месяцев', type: 'percentage', amount: 15, status: 'active', used: 3, period: '2025-09-01 — ∞', priority: 20 },
    { id: 'd3', name: 'Наурыз — март 2026', type: 'percentage', amount: 7, status: 'expired', used: 64, period: '2026-03-01 — 2026-03-31', priority: 5 },
    { id: 'd4', name: 'День рождения — месяц именинника', type: 'fixed_amount', amount: 5000, status: 'active', used: 12, period: '2025-09-01 — ∞', priority: 5 },
    { id: 'd5', name: 'Лето 2026 — раннее бронирование', type: 'percentage', amount: 12, status: 'draft', used: 0, period: '2026-06-01 — 2026-08-31', priority: 8 },
    { id: 'd6', name: 'Льготная категория — многодетные', type: 'percentage', amount: 20, status: 'active', used: 5, period: '2025-09-01 — ∞', priority: 50 },
    { id: 'd7', name: 'Промо — 1 апреля', type: 'fixed_amount', amount: 10000, status: 'cancelled', used: 0, period: '2026-04-01 — 2026-04-07', priority: 1 },
    { id: 'd8', name: 'Зимняя пауза', type: 'percentage', amount: 5, status: 'paused', used: 11, period: '2025-12-01 — 2026-02-28', priority: 3 },
  ],

  holidays: [
    { id: 'h1', date: '2026-01-01', name_ru: 'Новый год', name_kk: 'Жаңа жыл', billable: false },
    { id: 'h2', date: '2026-01-02', name_ru: 'Новый год (2-й день)', name_kk: 'Жаңа жыл (2-күн)', billable: false },
    { id: 'h3', date: '2026-03-08', name_ru: 'Международный женский день', name_kk: 'Халықаралық әйелдер күні', billable: false },
    { id: 'h4', date: '2026-03-21', name_ru: 'Наурыз мейрамы', name_kk: 'Наурыз мейрамы', billable: false },
    { id: 'h5', date: '2026-03-22', name_ru: 'Наурыз мейрамы', name_kk: 'Наурыз мейрамы', billable: false },
    { id: 'h6', date: '2026-03-23', name_ru: 'Наурыз мейрамы', name_kk: 'Наурыз мейрамы', billable: false },
    { id: 'h7', date: '2026-05-01', name_ru: 'Праздник единства', name_kk: 'Бірлік мерекесі', billable: false },
    { id: 'h8', date: '2026-05-07', name_ru: 'День защитника', name_kk: 'Отан қорғаушы күні', billable: false },
    { id: 'h9', date: '2026-05-09', name_ru: 'День Победы', name_kk: 'Жеңіс күні', billable: false },
  ],

  locations: [
    { id: 'loc1', name: 'Кабинет 1A', description: 'Младшая группа, 1 этаж' },
    { id: 'loc2', name: 'Кабинет 1B', description: 'Младшая группа, 1 этаж' },
    { id: 'loc3', name: 'Кабинет 2A', description: 'Средняя группа, 2 этаж' },
    { id: 'loc4', name: 'Кабинет 2B', description: 'Средняя группа, 2 этаж' },
    { id: 'loc5', name: 'Кабинет 3A', description: 'Старшая группа, 3 этаж' },
    { id: 'loc6', name: 'Музыкальный зал', description: '2 этаж' },
    { id: 'loc7', name: 'Спортивный зал', description: 'Цоколь' },
    { id: 'loc8', name: 'Двор', description: 'Прогулочная площадка' },
  ],

  cameras: [
    { id: 'cam1', name: 'Камера входа', loc: 'loc1', stream: 'rtsp://10.0.0.21/stream1', status: 'active' },
    { id: 'cam2', name: 'Камера группы 1A', loc: 'loc1', stream: 'rtsp://10.0.0.22/stream1', status: 'active' },
    { id: 'cam3', name: 'Камера группы 1B', loc: 'loc2', stream: 'rtsp://10.0.0.23/stream1', status: 'active' },
    { id: 'cam4', name: 'Камера двора', loc: 'loc8', stream: 'rtsp://10.0.0.24/stream1', status: 'active' },
    { id: 'cam5', name: 'Камера муз. зала', loc: 'loc6', stream: 'rtsp://10.0.0.25/stream1', status: 'inactive' },
  ],

  // Meal plan for one week
  meals_week: [
    { day: 'Понедельник', date: '19.05', items: {
      breakfast: ['Каша овсяная с яблоком', 'Хлеб с маслом и сыром', 'Какао'],
      snack_am: ['Йогурт', 'Печенье'],
      lunch: ['Суп куриный с лапшой', 'Котлета говяжья', 'Картофельное пюре', 'Компот из сухофруктов'],
      snack_pm: ['Творожная запеканка', 'Молоко'],
      dinner: ['Рыба тушёная', 'Овощное рагу', 'Чай с лимоном'],
    }},
    { day: 'Вторник', date: '20.05', items: {
      breakfast: ['Омлет', 'Хлеб с маслом', 'Какао с молоком'],
      snack_am: ['Банан', 'Сухарики'],
      lunch: ['Борщ', 'Бефстроганов', 'Рис отварной', 'Компот'],
      snack_pm: ['Шарлотка с яблоками', 'Молоко'],
      dinner: ['Курица запечённая', 'Гречка', 'Овощи свежие', 'Чай'],
    }},
    { day: 'Среда', date: '21.05', items: {
      breakfast: ['Каша манная', 'Бутерброд с сыром', 'Какао'],
      snack_am: ['Яблоко', 'Печенье'],
      lunch: ['Суп гороховый', 'Тефтели из индейки', 'Макароны', 'Кисель'],
      snack_pm: ['Кефир', 'Булочка'],
      dinner: ['Запеканка картофельная', 'Салат из огурцов', 'Чай'],
    }},
    { day: 'Четверг', date: '22.05', items: {
      breakfast: ['Каша рисовая молочная', 'Хлеб с маслом и джемом', 'Чай'],
      snack_am: ['Йогурт', 'Сушки'],
      lunch: ['Суп овощной', 'Плов с курицей', 'Салат свежий', 'Компот'],
      snack_pm: ['Сырники', 'Сметана', 'Молоко'],
      dinner: ['Рыбные котлеты', 'Пюре', 'Чай'],
    }},
    { day: 'Пятница', date: '23.05', items: {
      breakfast: ['Каша гречневая', 'Хлеб с маслом', 'Какао'],
      snack_am: ['Груша', 'Печенье'],
      lunch: ['Уха', 'Котлеты куриные', 'Рис', 'Кисель ягодный'],
      snack_pm: ['Творог с изюмом', 'Молоко'],
      dinner: ['Тушёная говядина с овощами', 'Хлеб', 'Чай'],
    }},
  ],

  // schedule slots
  schedule_slots: [
    { day: 'mon', start: '08:00', end: '09:00', name: 'Приём детей, зарядка', loc: 'loc3', tone: 'info' },
    { day: 'mon', start: '09:00', end: '09:30', name: 'Завтрак', loc: 'loc3', tone: 'warning' },
    { day: 'mon', start: '09:30', end: '10:30', name: 'Развивающее занятие', loc: 'loc3' },
    { day: 'mon', start: '10:30', end: '12:00', name: 'Прогулка', loc: 'loc8', tone: 'info' },
    { day: 'mon', start: '12:00', end: '13:00', name: 'Обед', loc: 'loc3', tone: 'warning' },
    { day: 'mon', start: '13:00', end: '15:00', name: 'Сон', loc: 'loc3' },
    { day: 'tue', start: '08:00', end: '09:00', name: 'Приём детей, зарядка', loc: 'loc3', tone: 'info' },
    { day: 'tue', start: '09:00', end: '09:30', name: 'Завтрак', loc: 'loc3', tone: 'warning' },
    { day: 'tue', start: '09:30', end: '10:30', name: 'Музыкальное занятие', loc: 'loc6' },
    { day: 'tue', start: '10:30', end: '12:00', name: 'Прогулка', loc: 'loc8', tone: 'info' },
    { day: 'tue', start: '12:00', end: '13:00', name: 'Обед', loc: 'loc3', tone: 'warning' },
    { day: 'wed', start: '09:00', end: '09:30', name: 'Завтрак', loc: 'loc3', tone: 'warning' },
    { day: 'wed', start: '09:30', end: '10:30', name: 'Английский язык', loc: 'loc3' },
    { day: 'wed', start: '10:30', end: '12:00', name: 'Прогулка', loc: 'loc8', tone: 'info' },
    { day: 'thu', start: '09:00', end: '09:30', name: 'Завтрак', loc: 'loc3', tone: 'warning' },
    { day: 'thu', start: '09:30', end: '10:30', name: 'Творческая мастерская', loc: 'loc3' },
    { day: 'fri', start: '09:00', end: '09:30', name: 'Завтрак', loc: 'loc3', tone: 'warning' },
    { day: 'fri', start: '09:30', end: '10:30', name: 'Физкультура', loc: 'loc7' },
    { day: 'fri', start: '10:30', end: '12:00', name: 'Прогулка', loc: 'loc8', tone: 'info' },
  ],

  fiscal: [
    { id: 'fr1', payment: 'pay-aw81', provider: 'kassa_24', sign: 'kz-3920-aw81-9821', status: 'success', date: '2026-05-08T10:24:30' },
    { id: 'fr2', payment: 'pay-aw82', provider: 'kassa_24', sign: 'kz-3920-aw82-1822', status: 'success', date: '2026-05-09T14:11:18' },
    { id: 'fr3', payment: 'pay-aw83', provider: 'kassa_24', sign: 'kz-3920-aw83-7711', status: 'success', date: '2026-05-10T09:50:42' },
    { id: 'fr4', payment: 'pay-aw84', provider: 'kassa_24', sign: 'kz-3920-aw84-3344', status: 'sent', date: '2026-05-10T17:33:55' },
    { id: 'fr5', payment: 'pay-aw85', provider: 'kassa_24', sign: '-', status: 'queued', date: '2026-05-07T11:02:14' },
    { id: 'fr6', payment: 'pay-aw87', provider: 'kassa_24', sign: '-', status: 'failed', date: '2026-05-15T16:40:29' },
  ],

  dlq: [
    { id: 'job-9821', name: 'lifecycle.archive.prorata_refund', child: 'c11', reason: 'payment_provider_timeout', attempts: 3, ts: '2026-04-12T08:14:00' },
    { id: 'job-9844', name: 'lifecycle.archive.close_tariffs', child: 'c11', reason: 'db_deadlock_retry_exhausted', attempts: 5, ts: '2026-04-12T08:15:11' },
  ],

  notifications: [
    { id: 'n1', type: 'request', title: 'Новая заявка: Поздний забор', body: 'Алихан Жумабаев — родитель просит забрать в 19:30', unread: true, ts: '15 мин' },
    { id: 'n2', type: 'payment', title: 'Оплата получена', body: 'Дильназ Ермекова — 165 000 ₸ (Halyk ePay)', unread: true, ts: '32 мин' },
    { id: 'n3', type: 'lead', title: 'Новый лид', body: 'Алия Кенжебекова — Instagram', unread: true, ts: '2 ч' },
    { id: 'n4', type: 'request', title: 'Заявка на доверенное лицо', body: 'Дильназ Ермекова — Сабина Болатовна (тётя)', unread: false, ts: '5 ч' },
    { id: 'n5', type: 'invoice', title: 'Счёт просрочен', body: 'Алихан Жумабаев — inv-2025-1042 — 162 000 ₸', unread: false, ts: 'вчера' },
  ],

  diagnostic_templates: [
    { id: 'dt1', specialist: 'psychologist', name: 'Адаптация к саду — 1–3 года', version: 4, active: true, used: 18 },
    { id: 'dt2', specialist: 'psychologist', name: 'Эмоциональное развитие — 4–6 лет', version: 2, active: true, used: 7 },
    { id: 'dt3', specialist: 'speech_therapist', name: 'Артикуляция и звукопроизношение', version: 6, active: true, used: 24 },
    { id: 'dt4', specialist: 'speech_therapist', name: 'Связная речь — 5–6 лет', version: 1, active: false, used: 0 },
    { id: 'dt5', specialist: 'music_teacher', name: 'Музыкально-ритмические способности', version: 1, active: true, used: 11 },
  ],
};

const specLabel = (s) => ({ psychologist: 'Психолог', speech_therapist: 'Логопед', music_teacher: 'Музыка', physical_ed: 'Физкультура', nutritionist: 'Диетолог' }[s] || s);
const roleLabel = (r) => ({ admin: 'Администратор', mentor: 'Воспитатель', specialist: 'Специалист', reception: 'Ресепшн' }[r] || r);
const reqTypeLabel = (t) => ({ trusted_person: 'Доверенное лицо', day_off: 'Выходной день (в саду)', vacation: 'Отпуск', late_pickup: 'Поздний забор', open_request: 'Открытое обращение' }[t] || t);
const reqTypeTone = (t) => ({ trusted_person: 'info', day_off: 'neutral', vacation: 'primary', late_pickup: 'warning', open_request: 'info' }[t] || 'neutral');
const contentTypeLabel = (t) => ({ news: 'Новость', menu: 'Меню', schedule_pub: 'Расписание', qundylyq: 'Қундылық', birthday: 'День рождения' }[t] || t);
const contentTypeTone = (t) => ({ news: 'info', menu: 'warning', schedule_pub: 'neutral', qundylyq: 'primary', birthday: 'success' }[t] || 'neutral');
const invoiceTypeLabel = (t) => ({ monthly: 'Месячный', prepayment_3m: 'Предоплата 3 мес', prepayment_6m: 'Предоплата 6 мес', prepayment_12m: 'Предоплата 12 мес', late_pickup_fee: 'Поздний забор', additional_service: 'Доп. услуга', other: 'Прочее' }[t] || t);
const methodLabel = (m) => ({ face_id: 'Face ID', manual: 'Вручную', otp_pickup: 'OTP-забор' }[m] || m);
const providerLabel = (p) => ({ halyk_epay: 'Halyk ePay', kaspi_pay: 'Kaspi Pay', cash: 'Наличные', kassa_24: 'Касса 24' }[p] || p);

const childById = (id) => DATA.children.find(c => c.id === id);
const groupById = (id) => DATA.groups.find(g => g.id === id);
const staffById = (id) => DATA.staff.find(s => s.id === id);

Object.assign(window, {
  DATA, specLabel, roleLabel, reqTypeLabel, reqTypeTone, contentTypeLabel, contentTypeTone,
  invoiceTypeLabel, methodLabel, providerLabel, childById, groupById, staffById,
});
