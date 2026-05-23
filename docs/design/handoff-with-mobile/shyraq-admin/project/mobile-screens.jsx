// mobile-screens.jsx — individual mobile screens for Shyraq admin

const { useState: useS, useMemo: useM } = React;

// ── shared helpers ─────────────────────────────────────────
const M_fmtKzt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₸';
const M_initials = (name='') => name.split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();

// ── primitives ────────────────────────────────────────────
function MBar({ title, sub, back, action, flat }) {
  return (
    <div className={cx('m-bar', flat && 'flat')}>
      {back && (
        <button className="m-iconbtn ghost"><Icon.ChevronLeft /></button>
      )}
      <div className="grow" style={{minWidth:0}}>
        <div className="m-bar-title" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{title}</div>
        {sub && <div className="m-bar-sub">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function MTabBar({ active='dashboard' }) {
  const tabs = [
    { id:'dashboard', label:'Главная', icon:Icon.Home },
    { id:'children', label:'Дети', icon:Icon.Users },
    { id:'requests', label:'Заявки', icon:Icon.Inbox, badge:3 },
    { id:'invoices', label:'Счета', icon:Icon.Receipt, badge:2 },
    { id:'more', label:'Ещё', icon:Icon.Menu },
  ];
  return (
    <div className="m-tabbar">
      {tabs.map(t => (
        <button key={t.id} className={cx('m-tab', active===t.id && 'active')}>
          <t.icon />
          <span>{t.label}</span>
          {t.badge && <span className="m-tab-badge">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

function MDonut({ segments, total, cap='детей' }) {
  const sum = segments.reduce((a, b) => a + b.value, 0) || 1;
  let acc = 0;
  const stops = segments.map(s => {
    const start = (acc / sum) * 360;
    acc += s.value;
    const end = (acc / sum) * 360;
    return `${s.color} ${start}deg ${end}deg`;
  }).join(', ');
  return (
    <div className="m-donut" style={{ background: `conic-gradient(${stops})` }}>
      <div className="m-donut-center">
        <div className="m-donut-num">{total}</div>
        <div className="m-donut-cap">{cap}</div>
      </div>
    </div>
  );
}

function MStatusBadge({ tone='neutral', children }) {
  return <span className={cx('badge', tone)} style={{fontSize:11, padding:'1px 7px'}}><span className="b-dot"/>{children}</span>;
}

// ──────────────────────────────────────────────────────────
// SCREEN: Login (phone)
// ──────────────────────────────────────────────────────────
function ScreenLogin() {
  return (
    <div className="m-shell">
      <div className="m-auth">
        <div className="m-auth-grid" />
        <div className="m-auth-brand">
          <div className="brand-mark">Sh</div>
          <div>
            <div style={{fontWeight:800, fontSize:16, letterSpacing:'-0.01em'}}>Shyraq</div>
            <div style={{fontSize:9.5, opacity:0.7, textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:700}}>Admin</div>
          </div>
        </div>
        <div className="m-auth-hero">Управляйте детским садом — со смартфона.</div>

        <div className="m-auth-card">
          <div style={{fontSize:18, fontWeight:700, letterSpacing:'-0.01em', marginBottom:4}}>Вход в кабинет</div>
          <div style={{fontSize:13, color:'var(--text-3)', marginBottom:18}}>Мы пришлём SMS-код на ваш номер.</div>

          <div className="field">
            <label className="field-label">Номер телефона</label>
            <span className="input-wrap">
              <Icon.Phone className="input-ic" />
              <input className="input search" defaultValue="+7 701 234 56 78" style={{height:44}} />
            </span>
          </div>

          <button className="m-btn primary">Получить код</button>
          <div style={{fontSize:11, color:'var(--text-3)', textAlign:'center', marginTop:12}}>
            Нажимая «Получить код», вы соглашаетесь с правилами
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// SCREEN: OTP
// ──────────────────────────────────────────────────────────
function ScreenOtp() {
  const filled = ['4','7','2','9','',''];
  return (
    <div className="m-shell">
      <div className="m-bar">
        <button className="m-iconbtn ghost"><Icon.ChevronLeft /></button>
        <div className="grow"><div className="m-bar-title" style={{fontSize:17}}>Подтверждение</div></div>
      </div>
      <div className="m-scroll no-bar" style={{padding:'24px 22px 32px'}}>
        <div style={{
          width:56, height:56, borderRadius:16,
          background:'var(--primary-soft)', color:'var(--primary)',
          display:'flex', alignItems:'center', justifyContent:'center',
          marginBottom:20
        }}>
          <Icon.Phone style={{width:24, height:24}} />
        </div>
        <div style={{fontSize:22, fontWeight:700, letterSpacing:'-0.02em', marginBottom:6}}>Введите код из SMS</div>
        <div style={{fontSize:13.5, color:'var(--text-3)', lineHeight:1.5}}>
          Мы отправили 6 цифр на <strong style={{color:'var(--text-1)'}}>+7 701 234 56 78</strong>.{' '}
          <span style={{color:'var(--primary)', fontWeight:600}}>Изменить номер</span>
        </div>

        <div className="m-otp-row">
          {filled.map((v,i) => (
            <input key={i} className={cx('m-otp-cell', v && 'filled')} defaultValue={v} maxLength={1} />
          ))}
        </div>

        <div style={{textAlign:'center', fontSize:12.5, color:'var(--text-3)', marginBottom:18}}>
          Отправить повторно через <strong style={{color:'var(--text-2)'}}>0:48</strong>
        </div>

        <button className="m-btn primary">Войти</button>

        <div style={{marginTop:24, padding:14, background:'var(--bg-sunken)', borderRadius:12, fontSize:12, color:'var(--text-3)', display:'flex', gap:10}}>
          <Icon.Info style={{width:16, height:16, color:'var(--text-3)', flexShrink:0, marginTop:1}} />
          <span>Демо: введите любые 6 цифр — мы пропустим вас в кабинет.</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// SCREEN: Dashboard
// ──────────────────────────────────────────────────────────
function ScreenDashboard() {
  const attendance = [
    { label:'В саду', value:58, color:'#1F7A3F' },
    { label:'Ушли',  value:4,  color:'#7BA897' },
    { label:'Нет',   value:8,  color:'#A85D08' },
    { label:'Отп.',  value:4,  color:'#5B7DB1' },
    { label:'Болеют',value:2,  color:'#B42318' },
  ];
  const att = 58 + 4 + 8 + 4 + 2;
  return (
    <div className="m-shell">
      <MBar
        title="Доброе утро 👋"
        sub="Айгуль · Балапан KZ"
        action={
          <>
            <button className="m-iconbtn"><Icon.Bell /><span className="m-dot"/></button>
            <button className="m-iconbtn"><Icon.QR /></button>
          </>
        }
      />
      <div className="m-scroll">
        {/* KPI row */}
        <div className="m-kpi-row">
          <div className="m-kpi">
            <div className="m-kpi-label">Активных детей</div>
            <div className="m-kpi-value">76</div>
            <div className="m-kpi-sub up"><Icon.ArrowUp style={{width:10, height:10}}/>+3 за неделю</div>
          </div>
          <div className="m-kpi">
            <div className="m-kpi-label">Лидов</div>
            <div className="m-kpi-value">14</div>
            <div className="m-kpi-sub"><span className="badge warning" style={{padding:'1px 6px', fontSize:10.5}}><span className="b-dot"/>6 новых</span></div>
          </div>
          <div className="m-kpi">
            <div className="m-kpi-label">Сотрудников</div>
            <div className="m-kpi-value">11</div>
            <div className="m-kpi-sub">10 активных</div>
          </div>
          <div className="m-kpi">
            <div className="m-kpi-label">Групп</div>
            <div className="m-kpi-value">5</div>
            <div className="m-kpi-sub">2 переполнены</div>
          </div>
        </div>

        {/* Overdue alert */}
        <div style={{
          marginTop:14,
          padding:14, borderRadius:14,
          background:'var(--danger-soft)',
          border:'1px solid color-mix(in oklab, var(--danger) 25%, transparent)',
          display:'flex', gap:12, alignItems:'flex-start'
        }}>
          <div style={{
            width:40, height:40, borderRadius:12,
            background:'rgba(180,35,24,0.18)', color:'var(--danger)',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
          }}>
            <Icon.ClockAlert style={{width:20, height:20}}/>
          </div>
          <div className="grow">
            <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--danger-fg)'}}>Просрочено</div>
            <div style={{fontSize:20, fontWeight:700, color:'var(--danger-fg)', marginTop:2, letterSpacing:'-0.01em'}}>{M_fmtKzt(324000)}</div>
            <div style={{fontSize:12, color:'var(--danger-fg)', marginTop:2}}>2 счёта · требует внимания</div>
          </div>
          <Icon.ChevronRight style={{width:16, height:16, color:'var(--danger-fg)', marginTop:10}}/>
        </div>

        {/* Attendance card */}
        <div className="m-section-h">
          <div className="m-section-title">Сегодня в саду</div>
          <div className="m-section-link">Журнал →</div>
        </div>
        <div className="m-card">
          <div style={{display:'flex', alignItems:'center', gap:14}}>
            <MDonut segments={attendance} total={att} cap="детей" />
            <div style={{flex:1, display:'flex', flexDirection:'column', gap:6}}>
              {attendance.map(a => (
                <div key={a.label} style={{display:'flex', alignItems:'center', gap:8, fontSize:12.5}}>
                  <span style={{width:8, height:8, borderRadius:2, background:a.color}}/>
                  <span style={{flex:1, color:'var(--text-2)'}}>{a.label}</span>
                  <span style={{fontWeight:600, fontVariantNumeric:'tabular-nums'}}>{a.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="m-section-h">
          <div className="m-section-title">Быстрые действия</div>
        </div>
        <div className="m-quick-grid">
          <div className="m-quick">
            <div className="m-quick-icon"><Icon.Plus /></div>
            <div className="m-quick-label">Создать лид</div>
            <div className="m-quick-sub">Новая заявка</div>
          </div>
          <div className="m-quick">
            <div className="m-quick-icon"><Icon.IdCard /></div>
            <div className="m-quick-label">Карточка</div>
            <div className="m-quick-sub">Зачисление</div>
          </div>
          <div className="m-quick">
            <div className="m-quick-icon"><Icon.Inbox /></div>
            <div className="m-quick-label">Заявки</div>
            <div className="m-quick-sub">От родителей</div>
            <div className="m-quick-badge">3</div>
          </div>
          <div className="m-quick">
            <div className="m-quick-icon"><Icon.CheckCircle /></div>
            <div className="m-quick-label">Отметить</div>
            <div className="m-quick-sub">Посещение</div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="m-section-h">
          <div className="m-section-title">Активность</div>
          <div className="m-section-link">Все →</div>
        </div>
        <div className="m-card flush">
          <div className="m-tl">
            <div className="m-tl-item">
              <div className="m-tl-dot"><Icon.Check /></div>
              <div>
                <div className="m-tl-title">Оплачен счёт #INV-0241</div>
                <div className="m-tl-meta">Дана Касенова · 165 000 ₸ · 12 мин назад</div>
              </div>
            </div>
            <div className="m-tl-item">
              <div className="m-tl-dot info"><Icon.Inbox style={{width:12, height:12}}/></div>
              <div>
                <div className="m-tl-title">Новая заявка: «Перевод в группу»</div>
                <div className="m-tl-meta">Айдана М. · 38 мин назад</div>
              </div>
            </div>
            <div className="m-tl-item">
              <div className="m-tl-dot warning"><Icon.AlertTri style={{width:12, height:12}}/></div>
              <div>
                <div className="m-tl-title">Опоздание: Темирлан Б.</div>
                <div className="m-tl-meta">Группа «Солнышко» · 09:21</div>
              </div>
            </div>
            <div className="m-tl-item">
              <div className="m-tl-dot neutral"><Icon.Users style={{width:12, height:12}}/></div>
              <div>
                <div className="m-tl-title">Создан лид: Камила Жумабекова</div>
                <div className="m-tl-meta">3 года · ясли · 1 ч назад</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <MTabBar active="dashboard" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// SCREEN: Children list
// ──────────────────────────────────────────────────────────
function ScreenChildren() {
  const children = [
    { name:'Алихан Бекжанов', age:'5 лет', group:'Солнышко', status:'present' },
    { name:'Дана Касенова',   age:'4 года',group:'Звёздочки', status:'present' },
    { name:'Темирлан Бакыт',  age:'5 лет', group:'Солнышко', status:'late' },
    { name:'Аяна Сатпаева',   age:'3 года',group:'Капельки',  status:'sick' },
    { name:'Камила Жумабекова', age:'4 года', group:'Звёздочки', status:'present' },
    { name:'Нурлан Омаров',   age:'6 лет', group:'Радуга',    status:'absent' },
    { name:'Аружан Каримова', age:'5 лет', group:'Солнышко', status:'present' },
    { name:'Ерасыл Бекболат', age:'4 года',group:'Звёздочки', status:'present' },
  ];
  const dotMap = { present:'present', late:'late', sick:'sick', absent:'absent' };
  const labelMap = { present:'В саду', late:'Опоздал', sick:'Болеет', absent:'Нет' };
  const toneMap = { present:'success', late:'warning', sick:'info', absent:'neutral' };

  return (
    <div className="m-shell">
      <MBar title="Дети" sub="76 активных" action={<button className="m-iconbtn primary"><Icon.Plus /></button>} />

      <div className="m-scroll">
        <div className="m-search">
          <Icon.Search />
          <input placeholder="Имя, телефон, ИИН родителя" />
        </div>

        <div className="m-chips">
          <span className="m-chip active">Все <span className="m-chip-count">76</span></span>
          <span className="m-chip">Солнышко <span className="m-chip-count">18</span></span>
          <span className="m-chip">Звёздочки <span className="m-chip-count">16</span></span>
          <span className="m-chip">Капельки <span className="m-chip-count">14</span></span>
          <span className="m-chip">Радуга <span className="m-chip-count">12</span></span>
          <span className="m-chip">Архив</span>
        </div>

        <div className="m-card flush">
          {children.map((c, i) => (
            <div key={i} className="m-list-row">
              <div style={{position:'relative'}}>
                <div className="m-avatar child">{M_initials(c.name)}</div>
                <span className={cx('m-status-dot', dotMap[c.status])}/>
              </div>
              <div>
                <div className="m-row-title">{c.name}</div>
                <div className="m-row-sub">{c.age} · {c.group}</div>
              </div>
              <div className="m-row-meta">
                <MStatusBadge tone={toneMap[c.status]}>{labelMap[c.status]}</MStatusBadge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="m-fab"><Icon.Plus /></button>
      <MTabBar active="children" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// SCREEN: Child detail
// ──────────────────────────────────────────────────────────
function ScreenChildDetail() {
  return (
    <div className="m-shell">
      <div className="m-bar flat">
        <button className="m-iconbtn ghost"><Icon.ChevronLeft /></button>
        <div className="grow"/>
        <button className="m-iconbtn ghost"><Icon.More /></button>
      </div>

      <div className="m-scroll no-bar" style={{paddingTop:0}}>
        <div className="m-profile-head">
          <div className="m-avatar child lg" style={{width:80, height:80, fontSize:28}}>ДК</div>
          <div className="name">Дана Касенова</div>
          <div className="meta">4 года · Группа «Звёздочки»</div>
          <span className="badge success" style={{marginTop:6}}><span className="b-dot"/>В саду</span>
        </div>

        <div className="m-qa-row" style={{margin:'18px 0 0'}}>
          <div className="m-qa"><Icon.Phone /><span>Позвонить</span></div>
          <div className="m-qa"><Icon.Mail /><span>Написать</span></div>
          <div className="m-qa"><Icon.QR /><span>QR-код</span></div>
          <div className="m-qa"><Icon.Receipt /><span>Счёт</span></div>
        </div>

        <div className="m-section-h">
          <div className="m-section-title">Опекуны</div>
          <div className="m-section-link">+ Добавить</div>
        </div>
        <div className="m-card flush">
          <div className="m-list-row">
            <div className="m-avatar guardian">АК</div>
            <div>
              <div className="m-row-title">Айгерим Касенова</div>
              <div className="m-row-sub">Мать · +7 701 555 11 22</div>
            </div>
            <Icon.ChevronRight className="m-row-chev" style={{width:16, height:16}} />
          </div>
          <div className="m-list-row">
            <div className="m-avatar guardian">МК</div>
            <div>
              <div className="m-row-title">Марат Касенов</div>
              <div className="m-row-sub">Отец · +7 707 234 88 91</div>
            </div>
            <Icon.ChevronRight className="m-row-chev" style={{width:16, height:16}} />
          </div>
        </div>

        <div className="m-section-h">
          <div className="m-section-title">Биллинг</div>
        </div>
        <div className="m-card flush">
          <div className="m-kv">
            <span className="k">Тариф</span>
            <span className="v">Полный день · 165 000 ₸/мес</span>
          </div>
          <div className="m-kv">
            <span className="k">Скидка</span>
            <span className="v" style={{color:'var(--success-fg)'}}>Второй ребёнок · −10%</span>
          </div>
          <div className="m-kv">
            <span className="k">Следующий счёт</span>
            <span className="v">01.06.2026</span>
          </div>
          <div className="m-kv">
            <span className="k">Баланс</span>
            <span className="v" style={{color:'var(--success-fg)', fontWeight:700}}>+12 500 ₸</span>
          </div>
        </div>

        <div className="m-section-h">
          <div className="m-section-title">Последние события</div>
        </div>
        <div className="m-card flush">
          <div className="m-tl">
            <div className="m-tl-item">
              <div className="m-tl-dot"><Icon.Check /></div>
              <div>
                <div className="m-tl-title">Приведён в сад</div>
                <div className="m-tl-meta">Сегодня, 08:42 · Айгерим К.</div>
              </div>
            </div>
            <div className="m-tl-item">
              <div className="m-tl-dot"><Icon.Check /></div>
              <div>
                <div className="m-tl-title">Оплачен счёт #INV-0241</div>
                <div className="m-tl-meta">Вчера, 14:18 · 165 000 ₸ · Kaspi</div>
              </div>
            </div>
            <div className="m-tl-item">
              <div className="m-tl-dot info"><Icon.Info style={{width:12, height:12}}/></div>
              <div>
                <div className="m-tl-title">Перевод в группу «Звёздочки»</div>
                <div className="m-tl-meta">22.05.2026</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <MTabBar active="children" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// SCREEN: Leads (kanban → mobile list with stage filter)
// ──────────────────────────────────────────────────────────
function ScreenLeads() {
  const leads = [
    { name:'Камила Жумабекова', age:'4 года · ясли', stage:'Новая',         tone:'info',    days:'1 день',  source:'Сайт' },
    { name:'Айдар Сериков',     age:'5 лет · полный', stage:'В обработке',  tone:'warning', days:'3 дня',   source:'Звонок' },
    { name:'Сабина Турсун',     age:'3 года · ясли', stage:'Лист ожидания', tone:'warning', days:'5 дней',  source:'Реком.' },
    { name:'Темирлан Жакып',    age:'6 лет · подгот.', stage:'Новая',       tone:'info',    days:'4 ч',     source:'2ГИС' },
    { name:'Аружан Беков',      age:'4 года · полный', stage:'В обработке', tone:'warning', days:'1 день',  source:'Сайт' },
  ];
  return (
    <div className="m-shell">
      <MBar title="Лиды" sub="14 в работе · 6 новых" action={<button className="m-iconbtn primary"><Icon.Plus /></button>} />

      <div className="m-scroll">
        <div className="m-segmented" style={{marginBottom:12}}>
          <button className="on">Воронка</button>
          <button>Список</button>
          <button>Архив</button>
        </div>

        <div className="m-chips">
          <span className="m-chip active">Все <span className="m-chip-count">14</span></span>
          <span className="m-chip"><span className="b-dot" style={{width:6,height:6,borderRadius:'50%',background:'var(--info)'}}/>Новые <span className="m-chip-count">6</span></span>
          <span className="m-chip"><span className="b-dot" style={{width:6,height:6,borderRadius:'50%',background:'var(--warning)'}}/>В обработке <span className="m-chip-count">5</span></span>
          <span className="m-chip">Лист ожидания <span className="m-chip-count">3</span></span>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {leads.map((l, i) => (
            <div key={i} className="m-lead">
              <div className={cx('m-lead-strip', l.tone)} />
              <div className="m-avatar child" style={{marginLeft:6}}>{M_initials(l.name)}</div>
              <div style={{flex:1, minWidth:0}}>
                <div className="m-row-title">{l.name}</div>
                <div className="m-row-sub">{l.age}</div>
                <div style={{display:'flex', gap:8, marginTop:6, fontSize:11, color:'var(--text-3)'}}>
                  <span>📍 {l.source}</span>
                  <span>· {l.days} в стадии</span>
                </div>
              </div>
              <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6}}>
                <MStatusBadge tone={l.tone}>{l.stage}</MStatusBadge>
                <Icon.ChevronRight className="m-row-chev" style={{width:14, height:14}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MTabBar active="more" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// SCREEN: Invoices
// ──────────────────────────────────────────────────────────
function ScreenInvoices() {
  const rows = [
    { id:'INV-0241', name:'Дана Касенова',     amount:165000, status:'paid',    tone:'success', date:'01.05.2026', sub:'Май · Полный день' },
    { id:'INV-0240', name:'Алихан Бекжанов',    amount:189000, status:'overdue', tone:'danger',  date:'01.05.2026', sub:'Май · Полный + питание' },
    { id:'INV-0239', name:'Темирлан Бакыт',     amount:165000, status:'partial', tone:'warning', date:'01.05.2026', sub:'Май · Оплачено 80 000' },
    { id:'INV-0238', name:'Аяна Сатпаева',      amount:135000, status:'pending', tone:'neutral', date:'01.05.2026', sub:'Май · Ясли' },
    { id:'INV-0237', name:'Камила Жумабекова',  amount:135000, status:'overdue', tone:'danger',  date:'01.05.2026', sub:'Май · Ясли' },
    { id:'INV-0236', name:'Нурлан Омаров',      amount:189000, status:'paid',    tone:'success', date:'01.05.2026', sub:'Май · Полный + питание' },
  ];
  const statusLabel = { paid:'Оплачен', overdue:'Просрочен', partial:'Частично', pending:'Ожидает' };

  return (
    <div className="m-shell">
      <MBar title="Счета" sub="Май 2026" action={<button className="m-iconbtn"><Icon.Filter /></button>} />

      <div className="m-scroll">
        {/* Summary */}
        <div className="m-kpi-row" style={{gridTemplateColumns:'1fr 1fr 1fr', gap:6}}>
          <div className="m-kpi" style={{padding:'10px 12px'}}>
            <div className="m-kpi-label" style={{fontSize:9.5}}>Выставлено</div>
            <div className="m-kpi-value" style={{fontSize:17}}>12.4 млн</div>
          </div>
          <div className="m-kpi" style={{padding:'10px 12px'}}>
            <div className="m-kpi-label" style={{fontSize:9.5, color:'var(--success-fg)'}}>Оплачено</div>
            <div className="m-kpi-value" style={{fontSize:17, color:'var(--success-fg)'}}>10.8</div>
          </div>
          <div className="m-kpi" style={{padding:'10px 12px'}}>
            <div className="m-kpi-label" style={{fontSize:9.5, color:'var(--danger-fg)'}}>Долг</div>
            <div className="m-kpi-value" style={{fontSize:17, color:'var(--danger-fg)'}}>324K</div>
          </div>
        </div>

        <div className="m-chips" style={{marginTop:12}}>
          <span className="m-chip active">Все <span className="m-chip-count">78</span></span>
          <span className="m-chip">Просроченные <span className="m-chip-count">2</span></span>
          <span className="m-chip">Ожидают <span className="m-chip-count">4</span></span>
          <span className="m-chip">Оплачены</span>
          <span className="m-chip">Частично</span>
        </div>

        <div className="m-card flush" style={{marginTop:4}}>
          {rows.map((r, i) => (
            <div key={i} className="m-inv-row">
              <div className="m-avatar child sm">{M_initials(r.name)}</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex', alignItems:'center', gap:6}}>
                  <div className="m-row-title" style={{fontSize:13.5}}>{r.name}</div>
                </div>
                <div className="m-row-sub" style={{display:'flex', alignItems:'center', gap:6, marginTop:3}}>
                  <span style={{fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--text-4)'}}>{r.id}</span>
                  <span>·</span>
                  <span>{r.sub}</span>
                </div>
              </div>
              <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4}}>
                <div className={cx('m-inv-amount', r.status==='overdue' && 'overdue')}>{M_fmtKzt(r.amount)}</div>
                <MStatusBadge tone={r.tone}>{statusLabel[r.status]}</MStatusBadge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="m-fab"><Icon.Plus /></button>
      <MTabBar active="invoices" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// SCREEN: Requests inbox
// ──────────────────────────────────────────────────────────
function ScreenRequests() {
  const items = [
    { type:'Перевод в группу', name:'Айдана Мукашева', child:'для Алихан Б.', ts:'12 мин', tone:'info', unread:true, body:'Здравствуйте, можно ли перевести сына из «Солнышко» в «Звёздочки»?' },
    { type:'Отпуск', name:'Дина К.', child:'для Дана К.', ts:'38 мин', tone:'warning', unread:true, body:'Заявка на отпуск с 02.06 по 16.06 (14 дней).' },
    { type:'Болезнь', name:'Бекет С.', child:'для Темирлан Б.', ts:'1 ч', tone:'info', unread:true, body:'Не приведу — температура. Справка завтра.' },
    { type:'Ранний забор', name:'Айгерим К.', child:'для Дана К.', ts:'3 ч', tone:'neutral', body:'Приду в 15:00, есть запись к врачу.' },
    { type:'Перевод', name:'Нурлан О.', child:'для Аяна С.', ts:'Вчера', tone:'neutral', body:'Решили перевести в другой садик с июля.' },
  ];
  return (
    <div className="m-shell">
      <MBar title="Заявки" sub="3 новых · 12 всего" action={<button className="m-iconbtn"><Icon.Filter /></button>} />

      <div className="m-scroll">
        <div className="m-segmented" style={{marginBottom:12}}>
          <button className="on">Новые<span style={{marginLeft:6, background:'var(--primary)', color:'white', fontSize:10, padding:'1px 6px', borderRadius:999, fontWeight:700}}>3</span></button>
          <button>В работе</button>
          <button>Закрытые</button>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {items.map((r, i) => (
            <div key={i} className="m-req-row">
              {r.unread && <span className="m-req-dot" />}
              <div className="m-avatar guardian">{M_initials(r.name)}</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:4}}>
                  <MStatusBadge tone={r.tone}>{r.type}</MStatusBadge>
                </div>
                <div className="m-row-title" style={{fontSize:13.5}}>{r.name} <span style={{fontWeight:400, color:'var(--text-3)'}}>· {r.child}</span></div>
                <div style={{fontSize:12.5, color:'var(--text-2)', marginTop:4, lineHeight:1.4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical'}}>{r.body}</div>
                <div style={{fontSize:11, color:'var(--text-4)', marginTop:6}}>{r.ts} назад</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <MTabBar active="requests" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// SCREEN: Attendance journal (today)
// ──────────────────────────────────────────────────────────
function ScreenAttendance() {
  const groups = [
    { name:'Солнышко', present:16, total:18 },
    { name:'Звёздочки', present:14, total:16 },
    { name:'Капельки', present:12, total:14 },
  ];
  const cells = [
    { name:'Алихан Б.', grp:'Солнышко', s:'present' },
    { name:'Дана К.',   grp:'Звёзд.',   s:'present' },
    { name:'Темирлан Б.', grp:'Солнышко', s:'late' },
    { name:'Аяна С.',   grp:'Капельки', s:'sick' },
    { name:'Камила Ж.', grp:'Звёзд.',   s:'present' },
    { name:'Нурлан О.', grp:'Радуга',   s:'absent' },
    { name:'Аружан К.', grp:'Солнышко', s:'present' },
    { name:'Ерасыл Б.', grp:'Звёзд.',   s:'present' },
  ];
  const dotCol = { present:'var(--success)', late:'var(--warning)', sick:'var(--info)', absent:'var(--text-4)' };
  const dotLbl = { present:'В саду', late:'Опоздал', sick:'Болеет', absent:'Нет' };

  return (
    <div className="m-shell">
      <MBar title="Посещаемость" sub="Сегодня, 24 мая" action={
        <>
          <button className="m-iconbtn"><Icon.Calendar /></button>
          <button className="m-iconbtn primary"><Icon.Plus /></button>
        </>
      }/>

      <div className="m-scroll">
        {/* Date picker row */}
        <div style={{display:'flex', gap:6, marginBottom:14, overflowX:'auto', scrollbarWidth:'none'}}>
          {['Пн 20','Вт 21','Ср 22','Чт 23','Пт 24','Сб 25','Вс 26'].map((d, i) => (
            <div key={d} style={{
              flexShrink:0, padding:'8px 12px', borderRadius:10,
              background: i===4 ? 'var(--primary)' : 'var(--bg-elev)',
              color: i===4 ? 'white' : 'var(--text-2)',
              border: i===4 ? '1px solid var(--primary)' : '1px solid var(--line)',
              fontSize:12.5, fontWeight:600, textAlign:'center',
              minWidth:54
            }}>
              <div style={{fontSize:10, opacity:0.75}}>{d.split(' ')[0]}</div>
              <div style={{fontSize:15, fontWeight:700, marginTop:2}}>{d.split(' ')[1]}</div>
            </div>
          ))}
        </div>

        {/* Overall pills */}
        <div className="m-card">
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div>
              <div className="caption" style={{margin:0}}>Всего сегодня</div>
              <div style={{fontSize:26, fontWeight:700, letterSpacing:'-0.02em'}}>58 / 76</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="caption" style={{margin:0}}>Заполняемость</div>
              <div style={{fontSize:18, fontWeight:700, color:'var(--success-fg)'}}>76%</div>
            </div>
          </div>
          <div className="m-att-bar">
            <div className="m-att-pill"><div className="m-att-num" style={{color:'var(--success-fg)'}}>58</div><div className="m-att-cap">В саду</div></div>
            <div className="m-att-pill"><div className="m-att-num" style={{color:'var(--warning-fg)'}}>3</div><div className="m-att-cap">Опозд.</div></div>
            <div className="m-att-pill"><div className="m-att-num" style={{color:'var(--info-fg)'}}>2</div><div className="m-att-cap">Болеют</div></div>
            <div className="m-att-pill"><div className="m-att-num" style={{color:'var(--text-3)'}}>13</div><div className="m-att-cap">Нет</div></div>
          </div>
        </div>

        {/* Groups */}
        <div className="m-section-h">
          <div className="m-section-title">По группам</div>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {groups.map(g => {
            const pct = (g.present / g.total) * 100;
            return (
              <div key={g.name} className="m-card" style={{padding:'12px 14px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                  <div style={{fontWeight:600, fontSize:14}}>{g.name}</div>
                  <div style={{fontSize:13, color:'var(--text-3)', fontVariantNumeric:'tabular-nums'}}>
                    <strong style={{color:'var(--text-1)'}}>{g.present}</strong> / {g.total}
                  </div>
                </div>
                <div className="cap-bar"><div className="cap-fill" style={{width:`${pct}%`, background: pct>=85?'var(--success)':pct>=60?'var(--warning)':'var(--danger)'}}/></div>
              </div>
            );
          })}
        </div>

        {/* Cells */}
        <div className="m-section-h">
          <div className="m-section-title">Дети</div>
          <div className="m-section-link">Все 76 →</div>
        </div>
        <div className="m-att-grid">
          {cells.map((c, i) => (
            <div key={i} className="m-att-cell">
              <div style={{position:'relative'}}>
                <div className="m-avatar child sm">{M_initials(c.name)}</div>
                <span style={{position:'absolute', bottom:-1, right:-1, width:10, height:10, borderRadius:'50%', background:dotCol[c.s], border:'2px solid var(--bg-elev)'}}/>
              </div>
              <div style={{minWidth:0}}>
                <div className="name" style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.name}</div>
                <div className="grp">{c.grp} · {dotLbl[c.s]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <MTabBar active="dashboard" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// SCREEN: More / Menu drawer
// ──────────────────────────────────────────────────────────
function ScreenMore() {
  return (
    <div className="m-shell">
      <MBar title="Ещё" action={<button className="m-iconbtn"><Icon.Settings /></button>} />

      <div className="m-scroll">
        {/* Profile */}
        <div className="m-card" style={{display:'flex', alignItems:'center', gap:12}}>
          <div className="m-avatar lg" style={{background:'linear-gradient(135deg, #E4C2F0, #B484E0)'}}>АТ</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:16, fontWeight:700, letterSpacing:'-0.01em'}}>Айгуль Тулегенова</div>
            <div style={{fontSize:12.5, color:'var(--text-3)'}}>Администратор · Балапан KZ</div>
            <div style={{fontSize:12, color:'var(--primary)', fontWeight:600, marginTop:4}}>Сменить садик →</div>
          </div>
          <Icon.ChevronRight style={{width:18, height:18, color:'var(--text-4)'}}/>
        </div>

        <div className="m-drawer-section">Воспитанники</div>
        <div className="m-card flush">
          <div className="m-drawer-item">
            <div className="m-drawer-ic warn"><Icon.Funnel /></div>
            <div className="grow">
              <div>Лиды</div>
              <div style={{fontSize:11.5, color:'var(--text-3)'}}>Воронка зачисления</div>
            </div>
            <span className="m-drawer-badge warn">6</span>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.Layers /></div>
            <div className="grow">
              <div>Группы</div>
              <div style={{fontSize:11.5, color:'var(--text-3)'}}>5 групп</div>
            </div>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.IdCard /></div>
            <div className="grow">
              <div>Сотрудники</div>
              <div style={{fontSize:11.5, color:'var(--text-3)'}}>11 человек</div>
            </div>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
        </div>

        <div className="m-drawer-section">Режим дня</div>
        <div className="m-card flush">
          <div className="m-drawer-item">
            <div className="m-drawer-ic info"><Icon.Calendar /></div>
            <div className="grow">Расписание</div>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.Bowl /></div>
            <div className="grow">Меню</div>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.News /></div>
            <div className="grow">Контент для родителей</div>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
        </div>

        <div className="m-drawer-section">Биллинг</div>
        <div className="m-card flush">
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.Tag /></div>
            <div className="grow">Тарифы</div>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.Gift /></div>
            <div className="grow">Скидки</div>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.Refresh /></div>
            <div className="grow">Возвраты</div>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.Receipt /></div>
            <div className="grow">Фискальные чеки</div>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
        </div>

        <div className="m-drawer-section">Операции</div>
        <div className="m-card flush">
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.Clipboard /></div>
            <div className="grow">Диагностика</div>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.Scan /></div>
            <div className="grow">
              <div>Face ID</div>
              <div style={{fontSize:11.5, color:'var(--text-3)'}}>Phase C</div>
            </div>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic danger"><Icon.AlertTri /></div>
            <div className="grow">Сбойные задачи</div>
            <span className="m-drawer-badge warn">2</span>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
        </div>

        <div className="m-card flush" style={{marginTop:18}}>
          <div className="m-drawer-item" style={{color:'var(--danger)'}}>
            <div className="m-drawer-ic danger"><Icon.Logout /></div>
            <div className="grow">Выйти из аккаунта</div>
          </div>
        </div>

        <div style={{textAlign:'center', fontSize:11, color:'var(--text-4)', marginTop:16}}>
          Shyraq Admin · v1.4.0
        </div>
      </div>
      <MTabBar active="more" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// SCREEN: Notifications
// ──────────────────────────────────────────────────────────
function ScreenNotifications() {
  const groups = [
    { label:'Сегодня', items:[
      { icon:Icon.AlertTri, tone:'warning', title:'Просрочен счёт #INV-0240', body:'Алихан Бекжанов · 189 000 ₸ · 3 дня просрочки', ts:'10:42', unread:true },
      { icon:Icon.Inbox, tone:'info', title:'Новая заявка от Айдана М.', body:'Перевод в группу «Звёздочки»', ts:'09:58', unread:true },
      { icon:Icon.CheckCircle, tone:'success', title:'Оплачен счёт #INV-0241', body:'Дана Касенова · 165 000 ₸ · Kaspi Pay', ts:'09:14', unread:true },
    ]},
    { label:'Вчера', items:[
      { icon:Icon.Users, tone:'info', title:'Лид перешёл в стадию «Создана карточка»', body:'Сабина Турсун · 3 года', ts:'17:22' },
      { icon:Icon.AlertTri, tone:'danger', title:'Сбой фискального чека', body:'INV-0237 · повтор через 5 мин', ts:'16:08' },
      { icon:Icon.Gift, tone:'info', title:'Скидка «Второй ребёнок» активирована', body:'Дана Касенова · −10% · до конца года', ts:'12:30' },
    ]},
    { label:'Эта неделя', items:[
      { icon:Icon.IdCard, tone:'info', title:'Новый сотрудник: Жанар Ким', body:'Воспитатель · группа «Капельки»', ts:'22 мая' },
    ]},
  ];
  const iconBg = { info:'var(--info-soft)', warning:'var(--warning-soft)', success:'var(--success-soft)', danger:'var(--danger-soft)' };
  const iconFg = { info:'var(--info-fg)', warning:'var(--warning-fg)', success:'var(--success-fg)', danger:'var(--danger-fg)' };

  return (
    <div className="m-shell">
      <div className="m-bar">
        <button className="m-iconbtn ghost"><Icon.ChevronLeft /></button>
        <div className="grow"><div className="m-bar-title">Уведомления</div></div>
        <button className="m-iconbtn ghost"><Icon.Check /></button>
      </div>

      <div className="m-scroll">
        <div className="m-segmented" style={{marginBottom:14}}>
          <button className="on">Все<span style={{marginLeft:6, background:'var(--bg-sunken)', fontSize:10, padding:'1px 6px', borderRadius:999}}>14</span></button>
          <button>Непрочитанные<span style={{marginLeft:6, background:'var(--primary)', color:'white', fontSize:10, padding:'1px 6px', borderRadius:999}}>3</span></button>
        </div>

        {groups.map(g => (
          <div key={g.label}>
            <div className="m-section-h">
              <div className="m-section-title">{g.label}</div>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {g.items.map((n, i) => (
                <div key={i} style={{
                  background: n.unread ? 'var(--primary-soft)' : 'var(--bg-elev)',
                  border:'1px solid', borderColor: n.unread ? 'color-mix(in oklab, var(--primary) 22%, transparent)' : 'var(--line)',
                  borderRadius:14, padding:14, display:'flex', gap:12, position:'relative'
                }}>
                  <div style={{
                    width:36, height:36, borderRadius:10,
                    background:iconBg[n.tone], color:iconFg[n.tone],
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
                  }}>
                    <n.icon style={{width:18, height:18}}/>
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:13.5, fontWeight:600, lineHeight:1.3}}>{n.title}</div>
                    <div style={{fontSize:12.5, color:'var(--text-2)', marginTop:3, lineHeight:1.4}}>{n.body}</div>
                    <div style={{fontSize:11, color:'var(--text-4)', marginTop:5}}>{n.ts}</div>
                  </div>
                  {n.unread && <span style={{width:8, height:8, borderRadius:'50%', background:'var(--primary)', marginTop:6}}/>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenLogin, ScreenOtp, ScreenDashboard, ScreenChildren, ScreenChildDetail,
  ScreenLeads, ScreenInvoices, ScreenRequests, ScreenAttendance,
  ScreenMore, ScreenNotifications,
});
