// ds.jsx — Design system primitives + icons
const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, Fragment } = React;

// ============ Icons (lucide-style, stroked) ============
const ic = (path, viewBox = '0 0 24 24') => ({ className, style }) => (
  <svg className={className} style={style} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
);
const Icon = {
  // nav
  Home: ic(<><path d="M3 9.5 12 3l9 6.5V21H3z"/><path d="M9 21v-7h6v7"/></>),
  Funnel: ic(<><path d="M3 4h18l-7 9v6l-4 2v-8z"/></>),
  Users: ic(<><circle cx="9" cy="8" r="3.5"/><path d="M3 21c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M14 21c0-2.4 1.7-4.5 4-5"/></>),
  Layers: ic(<><path d="M12 3 3 8l9 5 9-5z"/><path d="m3 13 9 5 9-5"/><path d="m3 18 9 5 9-5"/></>),
  IdCard: ic(<><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M5 17c1-2 3-3 4-3s3 1 4 3"/><path d="M15 9h4M15 13h3"/></>),
  Building: ic(<><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></>),
  Calendar: ic(<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>),
  Bowl: ic(<><path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M11 8c-2-1-2-3 0-4M15 8c-2-1-2-3 0-4"/></>),
  News: ic(<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></>),
  Wallet: ic(<><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14" r="1"/></>),
  Inbox: ic(<><path d="M21 12h-6l-2 3h-2l-2-3H3"/><path d="M5 4h14l2 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z"/></>),
  CheckCircle: ic(<><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></>),
  Clipboard: ic(<><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/></>),
  Scan: ic(<><path d="M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2M20 7V5a1 1 0 0 0-1-1h-2M20 17v2a1 1 0 0 1-1 1h-2"/><path d="M4 12h16"/></>),
  AlertTri: ic(<><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></>),
  Settings: ic(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>),
  Bell: ic(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></>),
  // util
  Search: ic(<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>),
  Plus: ic(<><path d="M12 5v14M5 12h14"/></>),
  X: ic(<><path d="M18 6 6 18M6 6l12 12"/></>),
  ChevronDown: ic(<><path d="m6 9 6 6 6-6"/></>),
  ChevronRight: ic(<><path d="m9 6 6 6-6 6"/></>),
  ChevronLeft: ic(<><path d="m15 6-6 6 6 6"/></>),
  More: ic(<><circle cx="12" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>),
  Edit: ic(<><path d="M16 3.5 20.5 8 7 21.5H3V17z"/></>),
  Trash: ic(<><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>),
  Filter: ic(<><path d="M3 5h18l-7 9v5l-4 2v-7z"/></>),
  Phone: ic(<><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7A2 2 0 0 1 22 17z"/></>),
  Mail: ic(<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/></>),
  Upload: ic(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></>),
  Download: ic(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></>),
  QR: ic(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM21 17v4M17 21h4M14 19h2"/></>),
  Camera: ic(<><path d="M3 7h3l2-3h8l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/></>),
  PieChart: ic(<><path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M21 12A9 9 0 0 0 12 3v9z"/></>),
  Refresh: ic(<><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></>),
  CreditCard: ic(<><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></>),
  Gift: ic(<><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9"/><path d="M16 8c0-2-2-3-4-1-2-2-4-1-4 1"/></>),
  Tag: ic(<><path d="M20 12 12 20l-9-9V3h8z"/><circle cx="8" cy="8" r="1.5"/></>),
  Receipt: ic(<><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h4"/></>),
  Clock: ic(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>),
  ClockAlert: ic(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5"/><path d="M12 16h.01"/></>),
  ArrowUp: ic(<><path d="M12 19V5M5 12l7-7 7 7"/></>),
  ArrowDown: ic(<><path d="M12 5v14M19 12l-7 7-7-7"/></>),
  ArrowRight: ic(<><path d="M5 12h14M13 5l7 7-7 7"/></>),
  ArrowLeft: ic(<><path d="M19 12H5M11 5 4 12l7 7"/></>),
  Info: ic(<><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></>),
  Check: ic(<><path d="m5 12 5 5L20 7"/></>),
  Star: ic(<><path d="m12 3 2.6 6 6.4.6-4.8 4.4 1.4 6.4L12 17l-5.6 3.4 1.4-6.4L3 9.6 9.4 9z"/></>),
  Sparkles: ic(<><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="m19 14 .7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9z"/></>),
  GripDots: ic(<><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></>),
  Logout: ic(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>),
  Menu: ic(<><path d="M3 6h18M3 12h18M3 18h18"/></>),
  Eye: ic(<><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>),
  Pause: ic(<><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>),
  Play: ic(<><path d="M6 4v16l14-8z"/></>),
  Lock: ic(<><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></>),
  Globe: ic(<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>),
  Heart: ic(<><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></>),
  Stethoscope: ic(<><path d="M11 2v6a4 4 0 0 1-8 0V2M7 16v2a4 4 0 1 0 8 0v-3"/><circle cx="20" cy="10" r="2"/><path d="M18 10c0 5-3 8-7 8"/></>),
  Smile: ic(<><circle cx="12" cy="12" r="9"/><path d="M8 14s1 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></>),
};

// ============ Helpers ============
const fmtKzt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₸';
const fmtDate = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${String(x.getDate()).padStart(2,'0')}.${String(x.getMonth()+1).padStart(2,'0')}.${x.getFullYear()}`;
};
const fmtDateTime = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${fmtDate(x)} ${String(x.getHours()).padStart(2,'0')}:${String(x.getMinutes()).padStart(2,'0')}`;
};
const initials = (name) => name.split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
const cx = (...xs) => xs.filter(Boolean).join(' ');

// ============ Components ============
function Btn({ variant='secondary', size, icon: Ico, iconRight: IcoR, children, block, disabled, onClick, type='button' }) {
  return (
    <button type={type} className={cx('btn', variant, size, block && 'block')} disabled={disabled} onClick={onClick}>
      {Ico && <Ico className="ic" />}
      {children}
      {IcoR && <IcoR className="ic" />}
    </button>
  );
}

function IconBtn({ icon: Ico, onClick, dot, title }) {
  return (
    <button className="icon-btn" onClick={onClick} title={title}>
      <Ico style={{ width: 16, height: 16 }} />
      {dot && <span className="dot"></span>}
    </button>
  );
}

function Badge({ tone='neutral', children, withDot=true, size }) {
  return (
    <span className={cx('badge', tone, size)}>
      {withDot && <span className="b-dot" />}
      {children}
    </span>
  );
}

function Avatar({ name, kind='guardian', size }) {
  return <div className={cx('avatar', kind === 'lg' || kind === 'xl' ? '' : kind, size)}>{initials(name || '?')}</div>;
}

function Card({ children, className, pad }) {
  return <div className={cx('card', className)} style={pad ? { padding: pad } : null}>{children}</div>;
}

function Field({ label, hint, error, required, children }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}{required && <span className="req"> *</span>}</label>}
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type='text', icon: Ico, sm, disabled }) {
  if (Ico) {
    return (
      <span className="input-wrap">
        <Ico className="input-ic" />
        <input className={cx('input', 'search', sm && 'sm')} type={type} value={value || ''} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} disabled={disabled} />
      </span>
    );
  }
  return <input className={cx('input', sm && 'sm')} type={type} value={value || ''} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} disabled={disabled} />;
}

function Textarea({ value, onChange, placeholder, rows=4 }) {
  return <textarea className="textarea" value={value || ''} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} rows={rows} />;
}

function Select({ value, onChange, options, sm, placeholder }) {
  return (
    <select className={cx('select', sm && 'sm')} value={value || ''} onChange={e => onChange?.(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <label className={cx('toggle', on && 'on')} onClick={() => onChange?.(!on)}>
      <span className="track"></span>
      {label && <span style={{ fontSize: 13 }}>{label}</span>}
    </label>
  );
}

function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(t => (
        <button key={t.id} className={cx('tab', value === t.id && 'active')} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

function Modal({ open, onClose, title, children, footer, size }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={cx('modal', size)} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <IconBtn icon={Icon.X} onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

function Empty({ icon: Ico = Icon.Inbox, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-art"><Ico style={{ width: 36, height: 36 }} /></div>
      <div className="empty-title">{title}</div>
      <div className="empty-text">{text}</div>
      {action}
    </div>
  );
}

function Banner({ tone='info', title, children, action }) {
  return (
    <div className={cx('banner', tone)}>
      <div style={{ marginTop: 1 }}>
        {tone === 'warning' || tone === 'danger' ? <Icon.AlertTri style={{ width: 16, height: 16 }} /> :
         tone === 'success' ? <Icon.CheckCircle style={{ width: 16, height: 16 }} /> :
         <Icon.Info style={{ width: 16, height: 16 }} />}
      </div>
      <div className="grow">
        {title && <div className="banner-title">{title}</div>}
        <div>{children}</div>
      </div>
      {action && <div className="banner-actions">{action}</div>}
    </div>
  );
}

function BilingualField({ valueRu, valueKk, onChangeRu, onChangeKk, placeholder, multiline }) {
  const [lang, setLang] = useState('ru');
  const ruMissing = !valueRu;
  const kkMissing = !valueKk;
  return (
    <div>
      <div className="lang-tabs">
        <button className={cx(lang === 'ru' && 'on')} onClick={() => setLang('ru')}>RU {ruMissing && <span className="dot-missing">●</span>}</button>
        <button className={cx(lang === 'kk' && 'on')} onClick={() => setLang('kk')}>KK {kkMissing && <span className="dot-missing">●</span>}</button>
      </div>
      {multiline ? (
        <Textarea value={lang === 'ru' ? valueRu : valueKk} onChange={lang === 'ru' ? onChangeRu : onChangeKk} placeholder={placeholder} />
      ) : (
        <Input value={lang === 'ru' ? valueRu : valueKk} onChange={lang === 'ru' ? onChangeRu : onChangeKk} placeholder={placeholder} />
      )}
    </div>
  );
}

// QR pattern (deterministic pseudo)
function QrSvg({ seed = 'abc' }) {
  const grid = 21;
  const cells = useMemo(() => {
    let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    const out = [];
    for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      out.push({ x, y, on: (h % 100) < 48 });
    }
    return out;
  }, [seed]);
  const finder = (x, y) => (
    <g key={`f-${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} fill="#1A1916"/>
      <rect x={x+1} y={y+1} width={5} height={5} fill="white"/>
      <rect x={x+2} y={y+2} width={3} height={3} fill="#1A1916"/>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${grid} ${grid}`} shapeRendering="crispEdges">
      <rect width={grid} height={grid} fill="white"/>
      {cells.map((c, i) => {
        const inFinder = (c.x < 7 && c.y < 7) || (c.x > grid-8 && c.y < 7) || (c.x < 7 && c.y > grid-8);
        if (inFinder) return null;
        return c.on ? <rect key={i} x={c.x} y={c.y} width={1} height={1} fill="#1A1916"/> : null;
      })}
      {finder(0,0)} {finder(grid-7, 0)} {finder(0, grid-7)}
    </svg>
  );
}

// Toast system
const ToastCtx = createContext(null);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random();
    setToasts(arr => [...arr, { id, tone: 'info', ...t }]);
    setTimeout(() => setToasts(arr => arr.filter(x => x.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={cx('toast', t.tone)}>
            <div style={{ marginTop: 1 }}>
              {t.tone === 'success' ? <Icon.CheckCircle style={{ width: 16, height: 16, color: 'var(--success)' }} /> :
               t.tone === 'warning' ? <Icon.AlertTri style={{ width: 16, height: 16, color: 'var(--warning)' }} /> :
               t.tone === 'danger' ? <Icon.AlertTri style={{ width: 16, height: 16, color: 'var(--danger)' }} /> :
               <Icon.Info style={{ width: 16, height: 16, color: 'var(--primary)' }} />}
            </div>
            <div className="grow">
              <div className="toast-title">{t.title}</div>
              {t.body && <div className="toast-body">{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => useContext(ToastCtx);

// Skeleton
function Skel({ w, h = 12, r = 6 }) { return <div className="sk" style={{ width: w, height: h, borderRadius: r }} />; }

// Donut chart from segments
function Donut({ segments, total, centerNum, centerCap }) {
  const sum = segments.reduce((a, b) => a + b.value, 0) || 1;
  let acc = 0;
  const stops = segments.map(s => {
    const start = (acc / sum) * 360;
    acc += s.value;
    const end = (acc / sum) * 360;
    return `${s.color} ${start}deg ${end}deg`;
  }).join(', ');
  return (
    <div className="donut" style={{ background: `conic-gradient(${stops})` }}>
      <div className="donut-center">
        <div className="donut-num">{centerNum ?? total}</div>
        <div className="donut-cap">{centerCap || 'всего'}</div>
      </div>
    </div>
  );
}

// Status badge helpers
const statusBadge = (kind, status) => {
  const M = {
    child: { card_created: ['info', 'Карточка создана'], active: ['success', 'Активен'], archived: ['neutral', 'Архив'] },
    lead: { new: ['info', 'Новая'], in_processing: ['warning', 'В обработке'], waitlist: ['warning', 'Лист ожидания'], card_created: ['success', 'Создана карточка'], cancelled: ['neutral', 'Отменён'], archive: ['neutral', 'Архив'] },
    invoice: { pending: ['neutral', 'Ожидает'], partial: ['warning', 'Частично'], paid: ['success', 'Оплачен'], overdue: ['danger', 'Просрочен'], refunded: ['info', 'Возвращён'], cancelled: ['neutral', 'Отменён'] },
    payment: { initiated: ['neutral', 'Инициирован'], processing: ['info', 'Обработка'], completed: ['success', 'Проведён'], failed: ['danger', 'Ошибка'], refunded: ['info', 'Возвращён'] },
    refund: { pending: ['warning', 'Ожидает'], approved: ['info', 'Одобрен'], processed: ['success', 'Проведён'], rejected: ['danger', 'Отклонён'] },
    discount: { draft: ['neutral', 'Черновик'], active: ['success', 'Активна'], paused: ['warning', 'Пауза'], expired: ['neutral', 'Истекла'], cancelled: ['neutral', 'Отменена'] },
    content: { draft: ['neutral', 'Черновик'], scheduled: ['info', 'Запланирован'], published: ['success', 'Опубликован'] },
    request: { pending: ['warning', 'Ожидает'], accepted: ['success', 'Принята'], rejected: ['danger', 'Отклонена'], cancelled: ['neutral', 'Отменена'] },
    staff: { active: ['success', 'Активен'], inactive: ['neutral', 'Неактивен'] },
    day: { present: ['success', 'В саду'], late: ['warning', 'Опоздал'], sick: ['info', 'Болеет'], early_pickup: ['info', 'Ранний забор'], on_vacation: ['neutral', 'Отпуск'], absent: ['neutral', 'Отсутствует'] },
    fiscal: { queued: ['neutral', 'В очереди'], sent: ['info', 'Отправлен'], success: ['success', 'Подтверждён'], failed: ['danger', 'Ошибка'] },
    guardian: { pending: ['warning', 'Ожидает'], approved: ['success', 'Одобрен'], rejected: ['danger', 'Отклонён'], revoked: ['neutral', 'Отозван'] },
  };
  const [tone, label] = (M[kind] || {})[status] || ['neutral', status];
  return <Badge tone={tone}>{label}</Badge>;
};

Object.assign(window, {
  Icon, Btn, IconBtn, Badge, Avatar, Card, Field, Input, Textarea, Select, Toggle, Tabs, Modal, Empty, Banner,
  BilingualField, QrSvg, Skel, Donut, statusBadge,
  ToastProvider, useToast,
  fmtKzt, fmtDate, fmtDateTime, initials, cx,
  useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, Fragment,
});
