// shell.jsx — App shell, sidebar, topbar, navigation, login

const NAV_GROUPS = [
  { label: null, items: [
    { id: 'dashboard', label: 'Дашборд', icon: Icon.Home, route: '#/' },
  ]},
  { label: 'Воспитанники', items: [
    { id: 'enrollments', label: 'Лиды', icon: Icon.Funnel, route: '#/enrollments', badge: 6 },
    { id: 'children', label: 'Дети', icon: Icon.Users, route: '#/children' },
    { id: 'groups', label: 'Группы', icon: Icon.Layers, route: '#/groups' },
  ]},
  { label: 'Сотрудники', items: [
    { id: 'staff', label: 'Сотрудники', icon: Icon.IdCard, route: '#/staff' },
    { id: 'structure', label: 'Локации и камеры', icon: Icon.Building, route: '#/structure' },
  ]},
  { label: 'Режим дня', items: [
    { id: 'schedule', label: 'Расписание', icon: Icon.Calendar, route: '#/schedule' },
    { id: 'meals', label: 'Меню', icon: Icon.Bowl, route: '#/meals' },
    { id: 'content', label: 'Контент', icon: Icon.News, route: '#/content' },
  ]},
  { label: 'Биллинг', items: [
    { id: 'invoices', label: 'Счета', icon: Icon.Receipt, route: '#/billing/invoices', badge: 2, badgeWarn: true },
    { id: 'payments', label: 'Оплаты', icon: Icon.CreditCard, route: '#/billing/payments' },
    { id: 'tariffs', label: 'Тарифы', icon: Icon.Tag, route: '#/billing/tariffs' },
    { id: 'refunds', label: 'Возвраты', icon: Icon.Refresh, route: '#/billing/refunds' },
    { id: 'discounts', label: 'Скидки', icon: Icon.Gift, route: '#/billing/discounts' },
    { id: 'holidays', label: 'Праздники', icon: Icon.Star, route: '#/billing/holidays' },
    { id: 'fiscal', label: 'Фискальные чеки', icon: Icon.Receipt, route: '#/billing/fiscal' },
  ]},
  { label: 'Операции', items: [
    { id: 'requests', label: 'Заявки родителей', icon: Icon.Inbox, route: '#/requests', badge: 3 },
    { id: 'attendance', label: 'Посещаемость', icon: Icon.CheckCircle, route: '#/attendance' },
    { id: 'diagnostics', label: 'Диагностика', icon: Icon.Clipboard, route: '#/diagnostics' },
    { id: 'face', label: 'Face ID', icon: Icon.Scan, route: '#/face', tag: 'Phase C' },
    { id: 'dlq', label: 'Сбойные задачи', icon: Icon.AlertTri, route: '#/operations/dlq', badge: 2, badgeWarn: true },
  ]},
  { label: 'Система', items: [
    { id: 'settings', label: 'Настройки садика', icon: Icon.Settings, route: '#/settings' },
  ]},
];

function Sidebar({ activeId, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-mark">Sh</div>
        <div>
          <div className="brand-name">Shyraq</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600, lineHeight: 1 }}>Admin</div>
        </div>
      </div>
      <div className="sidebar-scroll">
        {NAV_GROUPS.map((g, gi) => (
          <div className="nav-group" key={gi}>
            {g.label && <div className="nav-group-label">{g.label}</div>}
            {g.items.map(it => (
              <a key={it.id} className={cx('nav-item', activeId === it.id && 'active')} href={it.route} onClick={(e) => { onNavigate?.(it.route); }}>
                <it.icon className="nav-icon" />
                <span>{it.label}</span>
                {it.badge != null && <span className={cx('nav-badge', it.badgeWarn && 'warn')}>{it.badge}</span>}
                {it.tag && <span className="nav-tag">{it.tag}</span>}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        <div className="kg-card">
          <div className="kg-emoji">🌱</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="kg-name">{DATA.kg.name}</div>
            <div className="kg-role">Администратор · 2 садика</div>
          </div>
          <Icon.ChevronRight style={{ width: 14, height: 14, color: 'var(--text-4)' }} />
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumbs, lang, setLang, onNotif, onUser, unread }) {
  return (
    <div className="topbar">
      <div className="breadcrumbs">
        {crumbs.map((c, i) => (
          <div style={{display:'contents'}} key={i}>
            {i > 0 && <span className="sep"><Icon.ChevronRight style={{ width: 12, height: 12 }} /></span>}
            <span className={i === crumbs.length - 1 ? 'crumb-now' : 'crumb-link'}>{c}</span>
          </div>
        ))}
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-actions">
        <div className="lang-toggle">
          <button className={cx(lang === 'ru' && 'on')} onClick={() => setLang('ru')}>RU</button>
          <button className={cx(lang === 'kk' && 'on')} onClick={() => setLang('kk')}>KK</button>
        </div>
        <IconBtn icon={Icon.Bell} dot={unread > 0} onClick={onNotif} title="Уведомления" />
        <div className="user-chip" onClick={onUser}>
          <div className="avatar admin">{initials(DATA.me.name)}</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{DATA.me.name.split(' ')[0]}</span>
          <Icon.ChevronDown style={{ width: 14, height: 14, color: 'var(--text-3)' }} />
        </div>
      </div>
    </div>
  );
}

function NotificationsPanel({ open, onClose }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 56, right: 16, width: 380, maxHeight: 'calc(100vh - 72px)', background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-3)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Уведомления</div>
        <div className="row gap-8">
          <button className="btn ghost sm">Прочитать всё</button>
          <IconBtn icon={Icon.X} onClick={onClose} />
        </div>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {DATA.notifications.map(n => (
          <div key={n.id} style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--line)', background: n.unread ? 'var(--primary-soft)' : 'transparent', cursor: 'pointer' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.unread ? 'var(--primary)' : 'transparent', marginTop: 6, flexShrink: 0 }} />
            <div className="grow">
              <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2 }}>{n.body}</div>
              <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>{n.ts}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserMenu({ open, onClose, onNav }) {
  if (!open) return null;
  const item = (icon, label, onClick) => (
    <div onClick={() => { onClick?.(); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderRadius: 6 }}
         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-sunken)'}
         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
      <span style={{ width: 14, display: 'flex', alignItems: 'center' }}>{icon}</span>
      {label}
    </div>
  );
  return (
    <div style={{ position: 'fixed', top: 56, right: 16, width: 240, background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-3)', zIndex: 50, padding: 6 }}>
      <div style={{ padding: 10, borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{DATA.me.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{DATA.me.phone}</div>
      </div>
      {item(<Icon.IdCard style={{ width: 14, height: 14 }} />, 'Профиль', () => onNav('#/profile'))}
      {item(<Icon.QR style={{ width: 14, height: 14 }} />, 'Мой QR', () => onNav('#/profile?tab=qr'))}
      {item(<Icon.Layers style={{ width: 14, height: 14 }} />, 'Сменить садик', () => onNav('#/auth?step=select'))}
      <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0' }} />
      {item(<Icon.Logout style={{ width: 14, height: 14 }} />, 'Выход', () => onNav('#/auth'))}
    </div>
  );
}

// Hash router
function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((to) => {
    if (to.startsWith('#')) window.location.hash = to.slice(1);
    else window.location.hash = to;
  }, []);
  return { hash, navigate };
}

// Parse hash into route + params (very small)
function parseRoute(hash) {
  const raw = hash.replace(/^#/, '');
  const [path, queryStr] = raw.split('?');
  const segs = path.split('/').filter(Boolean);
  const query = {};
  if (queryStr) queryStr.split('&').forEach(p => { const [k, v] = p.split('='); query[k] = decodeURIComponent(v || ''); });
  return { segs, query };
}

// Find active nav id given segments
function activeNavId(segs) {
  if (segs.length === 0) return 'dashboard';
  const head = segs[0];
  if (head === 'enrollments') return 'enrollments';
  if (head === 'children') return 'children';
  if (head === 'groups') return 'groups';
  if (head === 'staff') return 'staff';
  if (head === 'structure') return 'structure';
  if (head === 'schedule') return 'schedule';
  if (head === 'meals') return 'meals';
  if (head === 'content') return 'content';
  if (head === 'billing') return segs[1] === 'invoices' ? 'invoices' :
                          segs[1] === 'payments' ? 'payments' :
                          segs[1] === 'tariffs' ? 'tariffs' :
                          segs[1] === 'refunds' ? 'refunds' :
                          segs[1] === 'discounts' ? 'discounts' :
                          segs[1] === 'holidays' ? 'holidays' :
                          segs[1] === 'fiscal' ? 'fiscal' : 'invoices';
  if (head === 'requests') return 'requests';
  if (head === 'attendance') return 'attendance';
  if (head === 'diagnostics') return 'diagnostics';
  if (head === 'face') return 'face';
  if (head === 'operations') return 'dlq';
  if (head === 'settings') return 'settings';
  if (head === 'profile') return null;
  return null;
}

// ============ Login screen ============
function LoginScreen({ onDone, lang, setLang }) {
  const [step, setStep] = useState('phone'); // phone | otp | select
  const [phone, setPhone] = useState('+7 ');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resend, setResend] = useState(60);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (step !== 'otp') return;
    setResend(60);
    const t = setInterval(() => setResend(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [step]);

  const onOtpInput = (idx, v) => {
    if (v.length > 1) v = v[v.length - 1];
    if (!/^[0-9]?$/.test(v)) return;
    const next = [...otp]; next[idx] = v; setOtp(next);
    if (v && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  return (
    <div className="auth-page">
      <div className="auth-art">
        <div className="auth-art-grid" />
        <div className="row gap-12" style={{ position: 'relative', zIndex: 1 }}>
          <div className="brand-mark" style={{ width: 36, height: 36, fontSize: 14 }}>Sh</div>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em' }}>Shyraq</div>
          <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, padding: '4px 8px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4 }}>Admin</div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div className="auth-tag">Кабинет администратора</div>
          <h1 className="auth-hero">Управляйте детским садом — спокойно и без лишних шагов.</h1>
          <div className="auth-bullets">
            <div className="b"><Icon.CheckCircle style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} /><span>Лиды, дети, группы и сотрудники — в одном окне</span></div>
            <div className="b"><Icon.CheckCircle style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} /><span>Биллинг, скидки и фискальные чеки — автоматически</span></div>
            <div className="b"><Icon.CheckCircle style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} /><span>Заявки родителей и расписание — в реальном времени</span></div>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, fontSize: 12, opacity: 0.55 }}>© 2026 Shyraq · SaaS для частных детских садов в Казахстане</div>
      </div>

      <div className="auth-card-wrap">
        <div className="auth-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div className="h2">{step === 'select' ? 'Выберите садик' : 'Вход в кабинет'}</div>
            <div className="lang-toggle">
              <button className={cx(lang === 'ru' && 'on')} onClick={() => setLang('ru')}>RU</button>
              <button className={cx(lang === 'kk' && 'on')} onClick={() => setLang('kk')}>KK</button>
            </div>
          </div>

          {step === 'phone' && (
            <>
              <p className="muted" style={{ marginTop: 0, fontSize: 13.5 }}>Мы пришлём SMS-код на ваш номер. Введите тот же номер, которым вы зарегистрированы в Shyraq.</p>
              <Field label="Номер телефона" required>
                <Input value={phone} onChange={setPhone} placeholder="+7 ___ ___ __ __" icon={Icon.Phone} />
              </Field>
              <Btn variant="primary" size="lg" block onClick={() => setStep('otp')}>Получить код</Btn>
              <div className="caption" style={{ textAlign: 'center', marginTop: 14 }}>Нажимая «Получить код», вы соглашаетесь с правилами использования</div>
            </>
          )}

          {step === 'otp' && (
            <>
              <p className="muted" style={{ marginTop: 0, fontSize: 13.5 }}>Введите 6-значный код, отправленный на <strong style={{ color: 'var(--text-1)' }}>{phone}</strong>. <a href="#" onClick={(e) => { e.preventDefault(); setStep('phone'); }} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Изменить номер</a></p>
              <div className="otp-row mt-16 mb-16">
                {otp.map((v, i) => (
                  <input key={i} ref={el => otpRefs.current[i] = el} className={cx('otp-cell', v && 'filled')} value={v}
                    onChange={(e) => onOtpInput(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Backspace' && !v && i > 0) otpRefs.current[i - 1]?.focus(); }}
                    maxLength={1} inputMode="numeric" />
                ))}
              </div>
              <div className="caption text-center mb-16">{resend > 0 ? <>Отправить повторно через <strong style={{ color: 'var(--text-2)' }}>0:{String(resend).padStart(2, '0')}</strong></> : <a href="#" style={{ color: 'var(--primary)', fontWeight: 600 }}>Отправить код повторно</a>}</div>
              <Btn variant="primary" size="lg" block onClick={() => setStep('select')}>Войти</Btn>
            </>
          )}

          {step === 'select' && (
            <>
              <p className="muted" style={{ marginTop: 0, fontSize: 13.5 }}>Вы администратор в нескольких садиках. Выберите тот, с которым хотите работать.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, marginBottom: 16 }}>
                {[
                  { id: 'k1', name: 'Балапан KZ', slug: 'balapan-kz', emoji: '🌱', sub: '76 детей · 5 групп' },
                  { id: 'k2', name: 'Күншуақ', slug: 'kunshuak', emoji: '☀️', sub: '42 ребёнка · 3 группы' },
                ].map((k, i) => (
                  <label key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, border: `1.5px solid ${i === 0 ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', background: i === 0 ? 'var(--primary-soft)' : 'var(--bg-elev)' }}>
                    <div style={{ width: 36, height: 36, background: 'var(--bg-sunken)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{k.emoji}</div>
                    <div className="grow">
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{k.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{k.sub}</div>
                    </div>
                    <input type="radio" name="kg" defaultChecked={i === 0} />
                  </label>
                ))}
              </div>
              <Btn variant="primary" size="lg" block onClick={onDone}>Продолжить</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  NAV_GROUPS, Sidebar, Topbar, NotificationsPanel, UserMenu,
  useHashRoute, parseRoute, activeNavId, LoginScreen,
});
