// app.jsx — Main router + glue + Tweaks (token themes)

// ── Token themes. Each one is a complete bundle of CSS-var overrides
//    that pages depend on. Switching here re-skins all 28 screens at once.
//    Brand palette: white #FFFFFF · gray #303030 · orange #FFAF36 ·
//                   green #47D848 · blue #007BE0 · black #191410
const THEMES = {
  // ── Brand-only themes (use ONLY the 6 brand colors as accents) ──
  green: {
    label: 'Жасыл — бренд',
    sub: 'Зелёный акцент, светлая база',
    swatches: ['#47D848', '#FFFFFF', '#303030', '#191410'],
    tokens: {
      '--primary':         '#47D848',
      '--primary-bright':  '#62E263',
      '--primary-hover':   '#39B83A',
      '--primary-active':  '#2A8B2C',
      '--primary-soft':    '#E0F7E0',
      '--primary-soft-hover': '#C9F0CA',
      '--primary-fg':      '#1F6B20',

      '--bg':              '#FFFFFF',
      '--bg-elev':         '#FFFFFF',
      '--bg-sunken':       '#F2F2F2',
      '--bg-subtle':       '#F8F8F8',
      '--bg-sidebar':      '#F8F8F8',
      '--border':          '#E5E5E5',
      '--border-strong':   '#D0D0D0',
      '--line':            '#EDEDED',

      '--text-1': '#191410', '--text-2': '#303030', '--text-3': '#6B6B6B', '--text-4': '#A0A0A0',
    },
  },

  orange: {
    label: 'Қызғылт сары — бренд',
    sub: 'Оранжевый акцент, светлая база',
    swatches: ['#FFAF36', '#FFFFFF', '#303030', '#191410'],
    tokens: {
      '--primary':         '#FFAF36',
      '--primary-bright':  '#FFC76A',
      '--primary-hover':   '#E5961F',
      '--primary-active':  '#B47215',
      '--primary-soft':    '#FFF3DC',
      '--primary-soft-hover': '#FFE6BC',
      '--primary-fg':      '#8B5A0E',

      '--bg':              '#FFFFFF',
      '--bg-elev':         '#FFFFFF',
      '--bg-sunken':       '#F2F2F2',
      '--bg-subtle':       '#F8F8F8',
      '--bg-sidebar':      '#F8F8F8',
      '--border':          '#E5E5E5',
      '--border-strong':   '#D0D0D0',
      '--line':            '#EDEDED',

      '--text-1': '#191410', '--text-2': '#303030', '--text-3': '#6B6B6B', '--text-4': '#A0A0A0',
    },
  },

  blue: {
    label: 'Көк — бренд',
    sub: 'Синий акцент, светлая база',
    swatches: ['#007BE0', '#FFFFFF', '#303030', '#191410'],
    tokens: {
      '--primary':         '#007BE0',
      '--primary-bright':  '#3FA0EE',
      '--primary-hover':   '#0061B0',
      '--primary-active':  '#00477D',
      '--primary-soft':    '#DDEDFC',
      '--primary-soft-hover': '#BFDDF9',
      '--primary-fg':      '#003D7A',

      '--bg':              '#FFFFFF',
      '--bg-elev':         '#FFFFFF',
      '--bg-sunken':       '#F2F2F2',
      '--bg-subtle':       '#F8F8F8',
      '--bg-sidebar':      '#F8F8F8',
      '--border':          '#E5E5E5',
      '--border-strong':   '#D0D0D0',
      '--line':            '#EDEDED',

      '--text-1': '#191410', '--text-2': '#303030', '--text-3': '#6B6B6B', '--text-4': '#A0A0A0',
    },
  },

  mono: {
    label: 'Қара — бренд',
    sub: 'Чёрно-белая монохромная',
    swatches: ['#191410', '#FFFFFF', '#303030', '#A0A0A0'],
    tokens: {
      '--primary':         '#191410',
      '--primary-bright':  '#303030',
      '--primary-hover':   '#0F0C08',
      '--primary-active':  '#000000',
      '--primary-soft':    '#EDEDED',
      '--primary-soft-hover': '#DCDCDC',
      '--primary-fg':      '#191410',

      '--bg':              '#FFFFFF',
      '--bg-elev':         '#FFFFFF',
      '--bg-sunken':       '#F2F2F2',
      '--bg-subtle':       '#F8F8F8',
      '--bg-sidebar':      '#F8F8F8',
      '--border':          '#E5E5E5',
      '--border-strong':   '#D0D0D0',
      '--line':            '#EDEDED',

      '--text-1': '#191410', '--text-2': '#303030', '--text-3': '#6B6B6B', '--text-4': '#A0A0A0',
    },
  },

  // ── Extended themes (use brand colors + complementary) ──
  warmCream: {
    label: 'Тёплая молочная',
    sub: 'Оранжевый + кремовая база',
    swatches: ['#FFAF36', '#F7F2E8', '#191410', '#7A776E'],
    tokens: {
      '--primary':         '#FFAF36',
      '--primary-bright':  '#FFC76A',
      '--primary-hover':   '#E5961F',
      '--primary-active':  '#B47215',
      '--primary-soft':    '#FFF0D6',
      '--primary-soft-hover': '#FFE2B5',
      '--primary-fg':      '#7A4A0A',

      '--bg':              '#F7F2E8',
      '--bg-elev':         '#FFFCF5',
      '--bg-sunken':       '#EFE9DA',
      '--bg-subtle':       '#FAF6EC',
      '--bg-sidebar':      '#F3EDDE',
      '--border':          '#E0D8C5',
      '--border-strong':   '#CFC5AC',
      '--line':            '#E7E0CC',

      '--text-1': '#191410', '--text-2': '#3A332A', '--text-3': '#7A6F5C', '--text-4': '#A89E89',
    },
  },

  forestMint: {
    label: 'Мятный лес',
    sub: 'Зелёный + холодная база',
    swatches: ['#47D848', '#F0F5F2', '#303030', '#9AA59E'],
    tokens: {
      '--primary':         '#47D848',
      '--primary-bright':  '#62E263',
      '--primary-hover':   '#39B83A',
      '--primary-active':  '#2A8B2C',
      '--primary-soft':    '#DDF3DD',
      '--primary-soft-hover': '#C7EBC7',
      '--primary-fg':      '#1F6B20',

      '--bg':              '#F0F5F2',
      '--bg-elev':         '#FFFFFF',
      '--bg-sunken':       '#E5EDE8',
      '--bg-subtle':       '#F5F8F6',
      '--bg-sidebar':      '#E9F0EC',
      '--border':          '#D6E0DA',
      '--border-strong':   '#BFCCC4',
      '--line':            '#DEE6E1',

      '--text-1': '#191410', '--text-2': '#303030', '--text-3': '#6B7570', '--text-4': '#9AA59E',
    },
  },

  oceanBlue: {
    label: 'Океан',
    sub: 'Синий + прохладная база',
    swatches: ['#007BE0', '#F3F6F9', '#0F172A', '#64748B'],
    tokens: {
      '--primary':         '#007BE0',
      '--primary-bright':  '#3FA0EE',
      '--primary-hover':   '#0061B0',
      '--primary-active':  '#00477D',
      '--primary-soft':    '#DDEAF9',
      '--primary-soft-hover': '#BED9F4',
      '--primary-fg':      '#003D7A',

      '--bg':              '#F3F6F9',
      '--bg-elev':         '#FFFFFF',
      '--bg-sunken':       '#E8EDF3',
      '--bg-subtle':       '#F7FAFC',
      '--bg-sidebar':      '#EBF0F5',
      '--border':          '#D5DDE6',
      '--border-strong':   '#BCC7D2',
      '--line':            '#DCE3EB',

      '--text-1': '#0F172A', '--text-2': '#334155', '--text-3': '#64748B', '--text-4': '#94A3B8',
    },
  },

  // ── Dark theme ──
  dark: {
    label: 'Қараңғы — тёмная',
    sub: 'Тёмный фон, оранжевый акцент',
    swatches: ['#FFAF36', '#191410', '#303030', '#F5F2EC'],
    tokens: {
      '--primary':         '#FFAF36',
      '--primary-bright':  '#FFC76A',
      '--primary-hover':   '#FFBE56',
      '--primary-active':  '#E5961F',
      '--primary-soft':    'rgba(255, 175, 54, 0.16)',
      '--primary-soft-hover': 'rgba(255, 175, 54, 0.24)',
      '--primary-fg':      '#FFC76A',
      '--on-primary':      '#191410',

      '--bg':              '#0F0B07',
      '--bg-elev':         '#1A1611',
      '--bg-sunken':       '#0A0805',
      '--bg-subtle':       '#15110D',
      '--bg-sidebar':      '#0C0905',
      '--border':          '#2A241C',
      '--border-strong':   '#3D352A',
      '--line':            '#241E16',

      '--text-1': '#F5F2EC', '--text-2': '#C5C0B6', '--text-3': '#8A867D', '--text-4': '#5F5C56',

      /* Semantic tones — softer, glowing for dark */
      '--success':         '#47D848',
      '--success-soft':    'rgba(71, 216, 72, 0.18)',
      '--success-fg':      '#7AE57B',
      '--warning':         '#FFAF36',
      '--warning-soft':    'rgba(255, 175, 54, 0.18)',
      '--warning-fg':      '#FFC76A',
      '--danger':          '#F87171',
      '--danger-soft':     'rgba(248, 113, 113, 0.18)',
      '--danger-fg':       '#FCA5A5',
      '--info':            '#60A5FA',
      '--info-soft':       'rgba(96, 165, 250, 0.18)',
      '--info-fg':         '#93C5FD',
      '--neutral-soft':    'rgba(255, 255, 255, 0.06)',
      '--neutral-fg':      '#C5C0B6',
    },
  },
};

// Light themes share the same semantic palette (brand-aligned):
//   success → green, info → blue, warning → orange, danger → red
const LIGHT_SEMANTIC = {
  '--success':       '#47D848',
  '--success-soft':  '#DFF3DF',
  '--success-fg':    '#1F6B20',
  '--warning':       '#FFAF36',
  '--warning-soft':  '#FFF0D6',
  '--warning-fg':    '#7A4A0A',
  '--danger':        '#D9342B',
  '--danger-soft':   '#FCE0DD',
  '--danger-fg':     '#911C16',
  '--info':          '#007BE0',
  '--info-soft':     '#DDEAF9',
  '--info-fg':       '#003D7A',
  '--neutral-soft':  '#EDEDED',
  '--neutral-fg':    '#303030',
  '--on-primary':    '#FFFFFF',
};

const RADII = {
  sharp: { '--r-xs':'2px','--r-sm':'3px','--r-md':'4px','--r-lg':'6px','--r-xl':'8px' },
  soft:  { '--r-xs':'4px','--r-sm':'6px','--r-md':'8px','--r-lg':'12px','--r-xl':'16px' },
  round: { '--r-xs':'6px','--r-sm':'10px','--r-md':'14px','--r-lg':'18px','--r-xl':'24px' },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "green",
  "radius": "soft",
  "showTokens": false
}/*EDITMODE-END*/;

function applyTokens(t) {
  const root = document.documentElement;
  const theme = THEMES[t.theme] || THEMES.green;
  const isDark = t.theme === 'dark';
  const merged = {
    ...(isDark ? {} : LIGHT_SEMANTIC),
    ...theme.tokens,
    ...(RADII[t.radius] || {}),
  };
  Object.entries(merged).forEach(([k, v]) => root.style.setProperty(k, v));
  // Mark dark for any conditional styles
  if (isDark) root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}

// Context to expose theme state to any page (Settings page reads this)
const ThemeCtx = React.createContext(null);
const useTheme = () => React.useContext(ThemeCtx);
Object.assign(window, { ThemeCtx, useTheme, THEMES, RADII });

function buildCrumbs(segs) {
  if (segs.length === 0) return ['Дашборд'];
  const head = segs[0];
  const map = {
    enrollments: 'Лиды', children: 'Дети', groups: 'Группы', staff: 'Сотрудники',
    structure: 'Структура', schedule: 'Расписание', meals: 'Меню', content: 'Контент',
    requests: 'Заявки родителей', attendance: 'Посещаемость', diagnostics: 'Диагностика',
    face: 'Face ID', operations: 'Операции', settings: 'Настройки', profile: 'Профиль',
  };
  if (head === 'billing') {
    const sub = { invoices: 'Счета', payments: 'Оплаты', tariffs: 'Тарифы', refunds: 'Возвраты', discounts: 'Скидки', holidays: 'Праздники', fiscal: 'Фискальные чеки' };
    return ['Биллинг', sub[segs[1]] || ''];
  }
  return [map[head] || head, segs[1] ? '…' : null].filter(Boolean);
}

// ── Tokens preview swatch ─────────────────────────────────────────────────
function TokenPreview() {
  const groups = [
    { label: 'Primary', tokens: ['--primary', '--primary-hover', '--primary-soft', '--primary-fg'] },
    { label: 'Surface', tokens: ['--bg', '--bg-elev', '--bg-sunken'] },
    { label: 'Text',    tokens: ['--text-1', '--text-2', '--text-3', '--text-4'] },
    { label: 'Border',  tokens: ['--border', '--border-strong', '--line'] },
  ];
  const [vals, setVals] = useState({});
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const out = {};
    groups.forEach(g => g.tokens.forEach(t => out[t] = cs.getPropertyValue(t).trim()));
    setVals(out);
    const id = setInterval(() => {
      const cs2 = getComputedStyle(document.documentElement);
      const out2 = {};
      groups.forEach(g => g.tokens.forEach(t => out2[t] = cs2.getPropertyValue(t).trim()));
      setVals(out2);
    }, 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {groups.map(g => (
        <div key={g.label}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>{g.label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {g.tokens.map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontFamily: 'ui-monospace, monospace' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: vals[t] || '#fff', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                <span style={{ flex: 1, color: 'rgba(0,0,0,0.7)' }}>{t}</span>
                <span style={{ color: 'rgba(0,0,0,0.4)' }}>{vals[t]}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useEffect(() => { applyTokens(t); }, [t.theme, t.radius]);
  useEffect(() => { applyTokens(t); }, []);

  const [authed, setAuthed] = useState(() => localStorage.getItem('shyraq_authed') === '1');
  const [lang, setLang] = useState('ru');
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { hash, navigate } = useHashRoute();
  const { segs, query } = parseRoute(hash);

  useEffect(() => { setNotifOpen(false); setUserOpen(false); }, [hash]);

  // Build theme picker: swatches mapped to theme keys
  const themeGroups = [
    { label: 'Бренд', keys: ['green', 'orange', 'blue', 'mono'] },
    { label: 'Расширенные', keys: ['warmCream', 'forestMint', 'oceanBlue'] },
    { label: 'Тёмная', keys: ['dark'] },
  ];

  const tweaksPanel = (
    <TweaksPanel title="Дизайн-токены">
      <TweakSection label="Тема" />
      {themeGroups.map(g => (
        <div style={{display:'contents'}} key={g.label}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(41,38,27,0.55)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4, marginTop: 4 }}>{g.label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
            {g.keys.map(k => {
              const th = THEMES[k];
              const active = t.theme === k;
              return (
                <button key={k}
                  onClick={() => setTweak('theme', k)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                    border: active ? '1px solid rgba(41,38,27,0.45)' : '1px solid transparent',
                    background: active ? 'rgba(0,0,0,0.04)' : 'transparent',
                    textAlign: 'left', width: '100%',
                  }}>
                  <span style={{ display: 'flex', gap: 0, borderRadius: 4, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(0,0,0,0.1)', flexShrink: 0 }}>
                    {th.swatches.map((c, i) => (
                      <span key={i} style={{ width: 14, height: 18, background: c }} />
                    ))}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(41,38,27,0.85)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{th.label}</span>
                    <span style={{ fontSize: 10, color: 'rgba(41,38,27,0.5)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{th.sub}</span>
                  </span>
                  {active && <span style={{ fontSize: 10, color: 'rgba(41,38,27,0.6)' }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <TweakSection label="Форма" />
      <TweakRadio
        label="Скругления"
        value={t.radius}
        options={[{ value: 'sharp', label: 'Sharp' }, { value: 'soft', label: 'Soft' }, { value: 'round', label: 'Round' }]}
        onChange={(v) => setTweak('radius', v)}
      />

      <TweakSection label="Отладка" />
      <TweakToggle
        label="Показать значения токенов"
        value={t.showTokens}
        onChange={(v) => setTweak('showTokens', v)}
      />
      {t.showTokens && <TokenPreview />}
    </TweaksPanel>
  );

  if (!authed) {
    return (
      <>
        <LoginScreen lang={lang} setLang={setLang} onDone={() => { localStorage.setItem('shyraq_authed', '1'); setAuthed(true); navigate('#/'); }} />
        {tweaksPanel}
      </>
    );
  }

  const activeId = activeNavId(segs);
  const crumbs = buildCrumbs(segs);

  let screen = null;
  if (segs.length === 0) screen = <Dashboard navigate={navigate} />;
  else if (segs[0] === 'enrollments' && !segs[1]) screen = <EnrollmentsKanban navigate={navigate} />;
  else if (segs[0] === 'enrollments') screen = <EnrollmentDetail id={segs[1]} navigate={navigate} />;
  else if (segs[0] === 'children' && !segs[1]) screen = <ChildrenList navigate={navigate} />;
  else if (segs[0] === 'children' && segs[1] === 'new') screen = <ChildCreate navigate={navigate} />;
  else if (segs[0] === 'children') screen = <ChildDetail id={segs[1]} navigate={navigate} />;
  else if (segs[0] === 'groups' && !segs[1]) screen = <GroupsList navigate={navigate} />;
  else if (segs[0] === 'groups') screen = <GroupDetail id={segs[1]} navigate={navigate} />;
  else if (segs[0] === 'staff' && !segs[1]) screen = <StaffList navigate={navigate} />;
  else if (segs[0] === 'staff') screen = <StaffDetail id={segs[1]} navigate={navigate} />;
  else if (segs[0] === 'structure') screen = <Structure query={query} navigate={navigate} />;
  else if (segs[0] === 'schedule') screen = <Schedule query={query} navigate={navigate} />;
  else if (segs[0] === 'meals') screen = <Meals />;
  else if (segs[0] === 'content') screen = <ContentFeed query={query} navigate={navigate} />;
  else if (segs[0] === 'billing' && segs[1] === 'invoices' && !segs[2]) screen = <InvoicesList navigate={navigate} query={query} />;
  else if (segs[0] === 'billing' && segs[1] === 'invoices') screen = <InvoiceDetail id={segs[2]} navigate={navigate} />;
  else if (segs[0] === 'billing' && segs[1] === 'payments' && !segs[2]) screen = <PaymentsList navigate={navigate} />;
  else if (segs[0] === 'billing' && segs[1] === 'payments') screen = <PaymentDetail id={segs[2]} />;
  else if (segs[0] === 'billing' && segs[1] === 'tariffs') screen = <TariffsList />;
  else if (segs[0] === 'billing' && segs[1] === 'refunds') screen = <RefundsList />;
  else if (segs[0] === 'billing' && segs[1] === 'discounts' && !segs[2]) screen = <DiscountsList navigate={navigate} />;
  else if (segs[0] === 'billing' && segs[1] === 'discounts') screen = <DiscountWizard navigate={navigate} isNew={segs[2] === 'new'} />;
  else if (segs[0] === 'billing' && segs[1] === 'holidays') screen = <HolidaysList />;
  else if (segs[0] === 'billing' && segs[1] === 'fiscal') screen = <FiscalList />;
  else if (segs[0] === 'requests' && !segs[1]) screen = <RequestsList navigate={navigate} />;
  else if (segs[0] === 'requests') screen = <RequestDetail id={segs[1]} navigate={navigate} />;
  else if (segs[0] === 'attendance') screen = <AttendanceJournal navigate={navigate} query={query} />;
  else if (segs[0] === 'diagnostics') screen = <Diagnostics />;
  else if (segs[0] === 'face') screen = <FaceId query={query} navigate={navigate} />;
  else if (segs[0] === 'operations' && segs[1] === 'dlq') screen = <DLQ />;
  else if (segs[0] === 'settings') screen = <Settings query={query} navigate={navigate} />;
  else if (segs[0] === 'profile') screen = <Profile query={query} />;
  else if (segs[0] === 'system') screen = <SystemState kind={segs[1]} />;
  else screen = <SystemState kind="404" />;

  const handleNav = (route) => {
    if (route === '#/auth') { localStorage.removeItem('shyraq_authed'); setAuthed(false); return; }
    navigate(route);
  };

  return (
    <ThemeCtx.Provider value={{ t, setTweak }}>
      <div className="app">
        <Sidebar activeId={activeId} onNavigate={() => {}} />
        <div className="main">
          <Topbar crumbs={crumbs} lang={lang} setLang={setLang} unread={3}
            onNotif={() => { setNotifOpen(v => !v); setUserOpen(false); }}
            onUser={() => { setUserOpen(v => !v); setNotifOpen(false); }} />
          {screen}
        </div>
        <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        <UserMenu open={userOpen} onClose={() => setUserOpen(false)} onNav={handleNav} />
      </div>
      {tweaksPanel}
    </ThemeCtx.Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ToastProvider><App /></ToastProvider>);
