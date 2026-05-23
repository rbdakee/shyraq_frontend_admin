// mobile-screens-2.jsx — remaining 17+ mobile screens for Shyraq admin

// ─────────────────────────────────────────────────────────
// Helpers (use globals from mobile-screens.jsx via window)
// ─────────────────────────────────────────────────────────
function _MBar({ title, sub, back=true, action, flat }) {
  return (
    <div className={cx('m-bar', flat && 'flat')}>
      {back && <button className="m-iconbtn ghost"><Icon.ChevronLeft /></button>}
      <div className="grow" style={{minWidth:0}}>
        <div className="m-bar-title" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{title}</div>
        {sub && <div className="m-bar-sub">{sub}</div>}
      </div>
      {action}
    </div>
  );
}
const _initials = (s='') => s.split(' ').filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase();
const _fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₸';

// ─────────────────────────────────────────────────────────
// SCREEN: Groups list
// ─────────────────────────────────────────────────────────
function ScreenGroups() {
  const groups = [
    { name:'Солнышко', age:'5–6 лет', kids:18, cap:18, mentor:'Жанар Ким',     loc:'Корпус А · 1 эт.', emoji:'☀️', tone:'warning' },
    { name:'Звёздочки', age:'4–5 лет', kids:16, cap:20, mentor:'Динара О.',     loc:'Корпус А · 2 эт.', emoji:'⭐', tone:'success' },
    { name:'Капельки',  age:'3–4 года', kids:14, cap:18, mentor:'Айдана С.',    loc:'Корпус Б · 1 эт.', emoji:'💧', tone:'success' },
    { name:'Радуга',    age:'5–6 лет', kids:12, cap:18, mentor:'Гульнар А.',   loc:'Корпус Б · 2 эт.', emoji:'🌈', tone:'success' },
    { name:'Бабочки',   age:'2–3 года', kids:16, cap:14, mentor:'Сабина М.',   loc:'Корпус Б · 1 эт.', emoji:'🦋', tone:'danger', over:true },
  ];
  return (
    <div className="m-shell">
      <_MBar back={false} title="Группы" sub="5 активных · 76 детей" action={<button className="m-iconbtn primary"><Icon.Plus/></button>}/>
      <div className="m-scroll">
        <div className="m-kpi-row" style={{gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:12}}>
          <div className="m-kpi" style={{padding:'10px 12px'}}><div className="m-kpi-label" style={{fontSize:9.5}}>Групп</div><div className="m-kpi-value" style={{fontSize:18}}>5</div></div>
          <div className="m-kpi" style={{padding:'10px 12px'}}><div className="m-kpi-label" style={{fontSize:9.5}}>Детей</div><div className="m-kpi-value" style={{fontSize:18}}>76</div></div>
          <div className="m-kpi" style={{padding:'10px 12px'}}><div className="m-kpi-label" style={{fontSize:9.5, color:'var(--danger-fg)'}}>Перепол.</div><div className="m-kpi-value" style={{fontSize:18, color:'var(--danger-fg)'}}>1</div></div>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {groups.map((g, i) => {
            const pct = Math.min(100, (g.kids/g.cap)*100);
            return (
              <div key={i} className="m-card" style={{padding:14}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
                  <div style={{display:'flex', gap:10, alignItems:'center'}}>
                    <div style={{width:40, height:40, borderRadius:12, background:'var(--bg-sunken)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20}}>{g.emoji}</div>
                    <div>
                      <div style={{fontWeight:700, fontSize:15}}>{g.name}</div>
                      <div style={{fontSize:12, color:'var(--text-3)', marginTop:1}}>{g.age}</div>
                    </div>
                  </div>
                  {g.over && <span className="badge danger" style={{fontSize:10.5, padding:'1px 7px'}}><span className="b-dot"/>Перепол.</span>}
                </div>
                <div style={{fontSize:12, color:'var(--text-3)', display:'flex', alignItems:'center', gap:6, marginBottom:8}}>
                  <Icon.IdCard style={{width:13, height:13}}/>{g.mentor} · <Icon.Building style={{width:13, height:13}}/>{g.loc}
                </div>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-3)', marginBottom:5}}>
                  <span>Заполненность</span>
                  <span><strong style={{color:'var(--text-1)', fontVariantNumeric:'tabular-nums'}}>{g.kids}</strong> / {g.cap}</span>
                </div>
                <div className="cap-bar"><div className="cap-fill" style={{width:`${pct}%`, background: pct>=100?'var(--danger)':pct>=85?'var(--warning)':'var(--success)'}}/></div>
              </div>
            );
          })}
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// Re-use of the tab bar - export from globals
const ScreenMore_Tabbar = (props) => {
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
        <button key={t.id} className={cx('m-tab', props.active===t.id && 'active')}>
          <t.icon />
          <span>{t.label}</span>
          {t.badge && <span className="m-tab-badge">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// SCREEN: Group detail
// ─────────────────────────────────────────────────────────
function ScreenGroupDetail() {
  const kids = [
    { name:'Алихан Бекжанов', s:'present' },
    { name:'Аружан Каримова', s:'present' },
    { name:'Темирлан Бакыт', s:'late' },
    { name:'Айдар Назаров', s:'present' },
    { name:'Ерасыл Бекболат', s:'present' },
    { name:'Алуа Сериккызы', s:'sick' },
  ];
  const dotCol = { present:'var(--success)', late:'var(--warning)', sick:'var(--info)', absent:'var(--text-4)' };
  return (
    <div className="m-shell">
      <_MBar title="Солнышко" sub="5–6 лет" action={<button className="m-iconbtn ghost"><Icon.More/></button>}/>
      <div className="m-scroll">
        <div style={{background:'linear-gradient(135deg, var(--warning-soft), var(--bg))', borderRadius:18, padding:18, marginBottom:14, display:'flex', alignItems:'center', gap:14}}>
          <div style={{width:60, height:60, borderRadius:16, background:'rgba(255,175,54,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28}}>☀️</div>
          <div style={{flex:1}}>
            <div style={{fontSize:18, fontWeight:700, letterSpacing:'-0.01em'}}>18 / 18</div>
            <div style={{fontSize:12, color:'var(--text-3)'}}>Заполнено · лист ожидания: 2</div>
          </div>
          <span className="badge warning"><span className="b-dot"/>Полная</span>
        </div>

        <div className="m-card flush" style={{marginBottom:14}}>
          <div className="m-kv"><span className="k">Воспитатель</span><span className="v">Жанар Ким</span></div>
          <div className="m-kv"><span className="k">Помощник</span><span className="v">Айгерим Б.</span></div>
          <div className="m-kv"><span className="k">Локация</span><span className="v">Корпус А · 1 этаж</span></div>
          <div className="m-kv"><span className="k">Возраст</span><span className="v">5–6 лет (60–72 мес)</span></div>
          <div className="m-kv"><span className="k">Тариф по умолч.</span><span className="v">Полный день · 165 000 ₸</span></div>
        </div>

        <div className="m-segmented" style={{marginBottom:12}}>
          <button className="on">Дети<span style={{marginLeft:5, background:'var(--primary-soft)', color:'var(--primary-fg)', fontSize:10, padding:'1px 6px', borderRadius:999, fontWeight:700}}>18</span></button>
          <button>Расписание</button>
          <button>История</button>
        </div>

        <div className="m-card flush">
          {kids.map((k, i) => (
            <div key={i} className="m-list-row">
              <div style={{position:'relative'}}>
                <div className="m-avatar child">{_initials(k.name)}</div>
                <span style={{position:'absolute', bottom:-1, right:-1, width:10, height:10, borderRadius:'50%', background:dotCol[k.s], border:'2px solid var(--bg-elev)'}}/>
              </div>
              <div>
                <div className="m-row-title">{k.name}</div>
                <div className="m-row-sub">5 лет · Зачислен 09.2024</div>
              </div>
              <Icon.ChevronRight className="m-row-chev" style={{width:16, height:16}}/>
            </div>
          ))}
          <div className="m-list-row" style={{justifyContent:'center', color:'var(--primary)', fontWeight:600, fontSize:13}}>
            <div></div>
            <div style={{textAlign:'center'}}>Показать ещё 12 →</div>
            <div></div>
          </div>
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Staff list
// ─────────────────────────────────────────────────────────
function ScreenStaff() {
  const staff = [
    { name:'Жанар Ким',        role:'Воспитатель', grp:'Солнышко',   tone:'success', active:true,  phone:'+7 701 555 12 34' },
    { name:'Динара Омарова',   role:'Воспитатель', grp:'Звёздочки', tone:'success', active:true,  phone:'+7 702 888 91 02' },
    { name:'Айдана Сериккызы', role:'Воспитатель', grp:'Капельки',  tone:'success', active:true,  phone:'+7 707 333 44 55' },
    { name:'Раушан Жанибекова',role:'Психолог',    grp:'Все группы', tone:'info',   active:true,  phone:'+7 705 222 78 90' },
    { name:'Айжан Кенжебекова',role:'Логопед',     grp:'По расписанию', tone:'info',active:true,  phone:'+7 708 111 23 45' },
    { name:'Гульнар Аубакирова',role:'Воспитатель',grp:'Радуга',     tone:'success', active:true,  phone:'+7 701 444 56 78' },
    { name:'Мадина Жакупова',  role:'Повар',       grp:'Кухня',      tone:'neutral', active:true,  phone:'+7 702 999 88 77' },
    { name:'Бакыт Ниязбеков',  role:'Охрана',      grp:'Все корпуса',tone:'neutral', active:false, phone:'+7 707 666 00 11' },
  ];
  return (
    <div className="m-shell">
      <_MBar back={false} title="Сотрудники" sub="11 активных" action={<button className="m-iconbtn primary"><Icon.Plus/></button>}/>
      <div className="m-scroll">
        <div className="m-search">
          <Icon.Search/>
          <input placeholder="Имя, телефон, должность"/>
        </div>
        <div className="m-chips">
          <span className="m-chip active">Все <span className="m-chip-count">11</span></span>
          <span className="m-chip">Воспитатели <span className="m-chip-count">6</span></span>
          <span className="m-chip">Специалисты <span className="m-chip-count">3</span></span>
          <span className="m-chip">Кухня <span className="m-chip-count">1</span></span>
          <span className="m-chip">Охрана <span className="m-chip-count">1</span></span>
        </div>
        <div className="m-card flush">
          {staff.map((s, i) => (
            <div key={i} className="m-list-row" style={{opacity: s.active ? 1 : 0.55}}>
              <div className="m-avatar staff">{_initials(s.name)}</div>
              <div>
                <div className="m-row-title">{s.name}</div>
                <div className="m-row-sub" style={{display:'flex', alignItems:'center', gap:6, marginTop:3}}>
                  <span className={cx('badge', s.tone)} style={{fontSize:10.5, padding:'1px 6px'}}><span className="b-dot"/>{s.role}</span>
                  <span style={{color:'var(--text-3)'}}>· {s.grp}</span>
                </div>
              </div>
              {!s.active && <span style={{fontSize:11, color:'var(--text-4)'}}>Неактивен</span>}
              {s.active && <Icon.ChevronRight className="m-row-chev" style={{width:16, height:16}}/>}
            </div>
          ))}
        </div>
      </div>
      <button className="m-fab"><Icon.Plus/></button>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Staff detail
// ─────────────────────────────────────────────────────────
function ScreenStaffDetail() {
  return (
    <div className="m-shell">
      <div className="m-bar flat">
        <button className="m-iconbtn ghost"><Icon.ChevronLeft/></button>
        <div className="grow"/>
        <button className="m-iconbtn ghost"><Icon.More/></button>
      </div>
      <div className="m-scroll no-bar" style={{paddingTop:0}}>
        <div className="m-profile-head">
          <div className="m-avatar staff lg" style={{width:80, height:80, fontSize:28}}>ЖК</div>
          <div className="name">Жанар Ким</div>
          <div className="meta">Воспитатель · Солнышко</div>
          <span className="badge success" style={{marginTop:6}}><span className="b-dot"/>Активна</span>
        </div>
        <div className="m-qa-row" style={{margin:'18px 0 0'}}>
          <div className="m-qa"><Icon.Phone/><span>Позвонить</span></div>
          <div className="m-qa"><Icon.Mail/><span>SMS</span></div>
          <div className="m-qa"><Icon.QR/><span>QR</span></div>
          <div className="m-qa"><Icon.Calendar/><span>Смены</span></div>
        </div>

        <div className="m-section-h"><div className="m-section-title">Контакты</div></div>
        <div className="m-card flush">
          <div className="m-kv"><span className="k">Телефон</span><span className="v">+7 701 555 12 34</span></div>
          <div className="m-kv"><span className="k">Email</span><span className="v" style={{fontSize:12}}>j.kim@balapan.kz</span></div>
          <div className="m-kv"><span className="k">ИИН</span><span className="v" style={{fontFamily:'JetBrains Mono, monospace', fontSize:12}}>881204 401 234</span></div>
        </div>

        <div className="m-section-h"><div className="m-section-title">Трудовая</div></div>
        <div className="m-card flush">
          <div className="m-kv"><span className="k">Должность</span><span className="v">Воспитатель</span></div>
          <div className="m-kv"><span className="k">Группа</span><span className="v">Солнышко (5–6 лет)</span></div>
          <div className="m-kv"><span className="k">Стаж</span><span className="v">7 лет · с 09.2018</span></div>
          <div className="m-kv"><span className="k">Ставка</span><span className="v">220 000 ₸ / мес</span></div>
          <div className="m-kv"><span className="k">График</span><span className="v">Пн–Пт · 8:00 – 18:00</span></div>
        </div>

        <div className="m-section-h"><div className="m-section-title">Документы</div><div className="m-section-link">+ Добавить</div></div>
        <div className="m-card flush">
          <div className="m-list-row">
            <div style={{width:40, height:40, borderRadius:10, background:'var(--success-soft)', color:'var(--success-fg)', display:'flex', alignItems:'center', justifyContent:'center'}}><Icon.Check style={{width:18, height:18}}/></div>
            <div>
              <div className="m-row-title">Медкомиссия</div>
              <div className="m-row-sub">Действует до 22.09.2026</div>
            </div>
            <Icon.ChevronRight className="m-row-chev" style={{width:16, height:16}}/>
          </div>
          <div className="m-list-row">
            <div style={{width:40, height:40, borderRadius:10, background:'var(--warning-soft)', color:'var(--warning-fg)', display:'flex', alignItems:'center', justifyContent:'center'}}><Icon.AlertTri style={{width:18, height:18}}/></div>
            <div>
              <div className="m-row-title">Диплом</div>
              <div className="m-row-sub">Истекает через 38 дней</div>
            </div>
            <Icon.ChevronRight className="m-row-chev" style={{width:16, height:16}}/>
          </div>
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Structure (Locations & Cameras)
// ─────────────────────────────────────────────────────────
function ScreenStructure() {
  const locs = [
    { name:'Корпус А · 1 этаж', desc:'Главное здание · игровая, спальня', groups:2, cams:3 },
    { name:'Корпус А · 2 этаж', desc:'Звёздочки + актовый зал', groups:1, cams:2 },
    { name:'Корпус Б · 1 этаж', desc:'Малыши + столовая', groups:2, cams:4 },
    { name:'Кухня',             desc:'Производственная зона', groups:0, cams:1 },
    { name:'Двор',              desc:'Прогулочная площадка', groups:0, cams:2 },
  ];
  return (
    <div className="m-shell">
      <_MBar title="Структура" sub="Локации и камеры" action={<button className="m-iconbtn primary"><Icon.Plus/></button>}/>
      <div className="m-scroll">
        <div className="m-segmented" style={{marginBottom:12}}>
          <button className="on">Локации<span style={{marginLeft:5, background:'var(--bg-sunken)', fontSize:10, padding:'1px 6px', borderRadius:999}}>5</span></button>
          <button>Камеры<span style={{marginLeft:5, background:'var(--bg-sunken)', fontSize:10, padding:'1px 6px', borderRadius:999}}>12</span></button>
        </div>

        <div className="m-card flush" style={{marginBottom:12}}>
          {locs.map((l, i) => (
            <div key={i} className="m-list-row">
              <div style={{width:40, height:40, borderRadius:10, background:'var(--primary-soft)', color:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <Icon.Building style={{width:18, height:18}}/>
              </div>
              <div>
                <div className="m-row-title">{l.name}</div>
                <div className="m-row-sub">{l.desc}</div>
                <div style={{display:'flex', gap:10, marginTop:5, fontSize:11, color:'var(--text-3)'}}>
                  <span><strong style={{color:'var(--text-1)'}}>{l.groups}</strong> групп</span>
                  <span><strong style={{color:'var(--text-1)'}}>{l.cams}</strong> камер</span>
                </div>
              </div>
              <Icon.ChevronRight className="m-row-chev" style={{width:16, height:16}}/>
            </div>
          ))}
        </div>

        <div style={{padding:14, borderRadius:12, background:'var(--info-soft)', color:'var(--info-fg)', fontSize:12.5, display:'flex', gap:10}}>
          <Icon.Info style={{width:16, height:16, flexShrink:0, marginTop:1}}/>
          <div>Просмотр потоков с камер появится в Phase C, когда заработает edge-сервис CCTV.</div>
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Schedule
// ─────────────────────────────────────────────────────────
function ScreenSchedule() {
  const slots = [
    { time:'08:00', dur:'до 09:00', title:'Приём детей', tone:'primary' },
    { time:'09:00', dur:'до 09:30', title:'Завтрак', tone:'warning' },
    { time:'09:30', dur:'до 10:30', title:'Музыкальное занятие', tone:'info', who:'Әсем Б.' },
    { time:'10:30', dur:'до 11:30', title:'Прогулка', tone:'primary' },
    { time:'11:30', dur:'до 12:30', title:'Обед', tone:'warning' },
    { time:'12:30', dur:'до 15:00', title:'Тихий час', tone:'neutral' },
    { time:'15:00', dur:'до 15:30', title:'Полдник', tone:'warning' },
    { time:'15:30', dur:'до 16:30', title:'Творческая мастерская', tone:'info', who:'Динара О.' },
    { time:'16:30', dur:'до 17:30', title:'Свободная игра', tone:'primary' },
    { time:'17:30', dur:'до 19:00', title:'Уход домой', tone:'primary' },
  ];
  const toneBg = { primary:'var(--primary-soft)', info:'var(--info-soft)', warning:'var(--warning-soft)', neutral:'var(--bg-sunken)' };
  const toneFg = { primary:'var(--primary-fg)', info:'var(--info-fg)', warning:'var(--warning-fg)', neutral:'var(--text-2)' };
  const toneBd = { primary:'var(--primary)', info:'var(--info)', warning:'var(--warning)', neutral:'var(--text-4)' };
  return (
    <div className="m-shell">
      <_MBar title="Расписание" sub="Солнышко · понедельник" action={<button className="m-iconbtn primary"><Icon.Plus/></button>}/>
      <div className="m-scroll">
        <div style={{display:'flex', gap:6, marginBottom:14, overflowX:'auto', scrollbarWidth:'none'}}>
          {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d, i) => (
            <div key={d} style={{
              flexShrink:0, padding:'8px 16px', borderRadius:10,
              background: i===0 ? 'var(--primary)' : 'var(--bg-elev)',
              color: i===0 ? 'white' : 'var(--text-2)',
              border: i===0 ? '1px solid var(--primary)' : '1px solid var(--line)',
              fontSize:13, fontWeight:600, opacity: i>=5 ? 0.5 : 1
            }}>{d}</div>
          ))}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:0}}>
          {slots.map((s, i) => (
            <div key={i} style={{display:'grid', gridTemplateColumns:'52px 1fr', gap:10, padding:'6px 0', position:'relative'}}>
              <div style={{fontFamily:'JetBrains Mono, monospace', fontSize:12, color:'var(--text-3)', textAlign:'right', paddingTop:12}}>
                <div style={{fontWeight:700, color:'var(--text-1)', fontSize:13}}>{s.time}</div>
                <div style={{fontSize:10}}>{s.dur}</div>
              </div>
              <div style={{
                background: toneBg[s.tone],
                borderLeft: `3px solid ${toneBd[s.tone]}`,
                padding:'10px 12px',
                borderRadius:'0 10px 10px 0',
              }}>
                <div style={{fontWeight:600, fontSize:14, color:toneFg[s.tone]}}>{s.title}</div>
                {s.who && <div style={{fontSize:11.5, color:toneFg[s.tone], opacity:0.75, marginTop:2}}>{s.who}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Meals
// ─────────────────────────────────────────────────────────
function ScreenMeals() {
  const meals = [
    { type:'Завтрак', time:'09:00', items:['Каша рисовая молочная','Бутерброд с сыром','Какао с молоком','Яблоко'], cal:420, kk:'Тауғы ас' },
    { type:'2-й завтрак', time:'10:30', items:['Фруктовый микс','Печенье овсяное'], cal:180, kk:'Жеңіл тамақ' },
    { type:'Обед', time:'12:00', items:['Борщ со сметаной','Котлета куриная','Гречка отварная','Салат из огурцов','Компот'], cal:580, kk:'Түскі ас' },
    { type:'Полдник', time:'15:30', items:['Ватрушка с творогом','Чай с лимоном'], cal:240, kk:'Шай' },
    { type:'Ужин', time:'17:30', items:['Запеканка картофельная','Овощной салат','Кисель'], cal:380, kk:'Кешкі ас' },
  ];
  return (
    <div className="m-shell">
      <_MBar title="Меню" sub="Понедельник, 19 мая" action={<button className="m-iconbtn"><Icon.Edit/></button>}/>
      <div className="m-scroll">
        <div style={{display:'flex', gap:6, marginBottom:14, overflowX:'auto', scrollbarWidth:'none'}}>
          {[
            { d:'Пн', n:19, on:true }, { d:'Вт', n:20 }, { d:'Ср', n:21 }, { d:'Чт', n:22 }, { d:'Пт', n:23 },
          ].map((x, i) => (
            <div key={i} style={{
              flexShrink:0, padding:'8px 14px', borderRadius:10,
              background: x.on ? 'var(--primary)' : 'var(--bg-elev)',
              color: x.on ? 'white' : 'var(--text-2)',
              border: x.on ? '1px solid var(--primary)' : '1px solid var(--line)',
              fontSize:12, fontWeight:600, textAlign:'center', minWidth:54
            }}>
              <div style={{fontSize:10.5, opacity:0.75}}>{x.d}</div>
              <div style={{fontSize:15, fontWeight:700, marginTop:2}}>{x.n}</div>
            </div>
          ))}
        </div>

        <div className="m-card" style={{padding:'12px 14px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div className="caption" style={{margin:0}}>Калорий за день</div>
            <div style={{fontSize:22, fontWeight:700, letterSpacing:'-0.02em'}}>1 800 ккал</div>
          </div>
          <span className="badge success"><span className="b-dot"/>Опубликовано</span>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {meals.map((m, i) => (
            <div key={i} className="m-card" style={{padding:14}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10}}>
                <div>
                  <div style={{fontWeight:700, fontSize:14.5, letterSpacing:'-0.01em'}}>{m.type}</div>
                  <div style={{fontSize:11, color:'var(--text-3)', marginTop:2}}>{m.kk} · {m.time}</div>
                </div>
                <span className="badge neutral" style={{fontSize:10.5}}><span className="b-dot"/>{m.cal} ккал</span>
              </div>
              <ul style={{margin:0, paddingLeft:18, fontSize:13, color:'var(--text-2)', lineHeight:1.6}}>
                {m.items.map((x, j) => <li key={j}>{x}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="m-section-h"><div className="m-section-title">Аллергены</div></div>
        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
          <span className="m-chip">🥛 Молочные · 4</span>
          <span className="m-chip">🌾 Глютен · 3</span>
          <span className="m-chip">🥚 Яйца · 2</span>
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Content
// ─────────────────────────────────────────────────────────
function ScreenContent() {
  const posts = [
    { author:'Динара О.', grp:'Звёздочки', ts:'15 мин', title:'Сегодня лепили из пластилина 🎨', body:'Наши малыши сделали целый зоопарк из глины. Завтра принесём в группу — приходите смотреть!', img:true, likes:18, comments:4, status:'published' },
    { author:'Жанар К.', grp:'Солнышко', ts:'2 ч', title:'Музыкальное занятие', body:'Сегодня учили колыбельную «Бесік жыры». Дети поют замечательно!', img:false, likes:12, comments:2, status:'published' },
    { author:'Айгуль Т.', grp:'Всем родителям', ts:'Вчера', title:'Праздник 1 июня — программа', body:'Дорогие родители! Делимся программой Дня защиты детей. Просьба прийти к 10:00 в нарядной одежде.', img:true, likes:34, comments:11, status:'published', pinned:true },
    { author:'Динара О.', grp:'Звёздочки', ts:'Завтра в 09:00', title:'Утренник: подготовка', body:'Напоминаем: завтра репетиция к выпускному. Форма — белый верх, тёмный низ.', img:false, likes:0, comments:0, status:'scheduled' },
  ];
  return (
    <div className="m-shell">
      <_MBar title="Контент" sub="Лента для родителей" action={<button className="m-iconbtn primary"><Icon.Plus/></button>}/>
      <div className="m-scroll">
        <div className="m-segmented" style={{marginBottom:12}}>
          <button className="on">Лента</button>
          <button>Запланированные<span style={{marginLeft:5, background:'var(--bg-sunken)', fontSize:10, padding:'1px 6px', borderRadius:999}}>2</span></button>
          <button>Черновики</button>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          {posts.map((p, i) => (
            <div key={i} className="m-card" style={{padding:0, overflow:'hidden', position:'relative'}}>
              {p.pinned && <div style={{position:'absolute', top:14, right:14, background:'var(--primary)', color:'white', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, display:'flex', alignItems:'center', gap:4, zIndex:1}}><Icon.Star style={{width:11, height:11}}/>Закреп.</div>}
              <div style={{padding:'14px 14px 0', display:'flex', alignItems:'center', gap:10}}>
                <div className="m-avatar staff sm">{_initials(p.author)}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:600}}>{p.author}</div>
                  <div style={{fontSize:11, color:'var(--text-3)'}}>{p.grp} · {p.ts}</div>
                </div>
                {p.status === 'scheduled' && <span className="badge info" style={{fontSize:10.5}}><span className="b-dot"/>Запланирован</span>}
              </div>
              <div style={{padding:'10px 14px'}}>
                <div style={{fontWeight:700, fontSize:14.5, marginBottom:4, letterSpacing:'-0.005em'}}>{p.title}</div>
                <div style={{fontSize:13, color:'var(--text-2)', lineHeight:1.5}}>{p.body}</div>
              </div>
              {p.img && <div className="img-ph" style={{height:140, margin:'0 14px', borderRadius:8}}>фото группы</div>}
              {p.status === 'published' && (
                <div style={{padding:'12px 14px', display:'flex', gap:14, fontSize:12.5, color:'var(--text-3)', borderTop:'1px solid var(--line)', marginTop:12}}>
                  <span style={{display:'flex', alignItems:'center', gap:4}}><Icon.Heart style={{width:14, height:14}}/>{p.likes}</span>
                  <span style={{display:'flex', alignItems:'center', gap:4}}><Icon.Mail style={{width:14, height:14}}/>{p.comments}</span>
                  <span style={{marginLeft:'auto'}}><Icon.Eye style={{width:14, height:14}}/></span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <button className="m-fab"><Icon.Plus/></button>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Invoice detail
// ─────────────────────────────────────────────────────────
function ScreenInvoiceDetail() {
  return (
    <div className="m-shell">
      <_MBar title="INV-0241" sub="Май 2026" action={<button className="m-iconbtn ghost"><Icon.More/></button>}/>
      <div className="m-scroll" style={{paddingBottom:170}}>
        <div className="m-card" style={{padding:18, marginBottom:14, textAlign:'center', background:'linear-gradient(180deg, var(--success-soft), var(--bg-elev))'}}>
          <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--success-fg)'}}>Оплачен</div>
          <div style={{fontSize:32, fontWeight:700, letterSpacing:'-0.02em', marginTop:4}}>{_fmt(148500)}</div>
          <div style={{fontSize:12, color:'var(--text-3)', marginTop:4}}>Оплачен 18.05.2026 в 14:18</div>
        </div>

        <div className="m-card flush" style={{marginBottom:14}}>
          <div className="m-kv"><span className="k">Ребёнок</span><span className="v" style={{display:'flex', alignItems:'center', gap:6}}><div className="m-avatar child sm">ДК</div>Дана Касенова</span></div>
          <div className="m-kv"><span className="k">Период</span><span className="v">Май 2026</span></div>
          <div className="m-kv"><span className="k">Срок оплаты</span><span className="v">10.05.2026</span></div>
          <div className="m-kv"><span className="k">Метод</span><span className="v">Kaspi Pay · ****1234</span></div>
        </div>

        <div className="m-section-h"><div className="m-section-title">Расчёт</div></div>
        <div className="m-card flush">
          <div className="m-kv"><span className="k">Полный день · 22 раб. дня</span><span className="v">165 000 ₸</span></div>
          <div className="m-kv"><span className="k" style={{color:'var(--success-fg)'}}>Скидка «Второй ребёнок» −10%</span><span className="v" style={{color:'var(--success-fg)'}}>−16 500 ₸</span></div>
          <div className="m-kv" style={{background:'var(--bg-subtle)'}}><span className="k" style={{fontWeight:700, color:'var(--text-1)'}}>Итого</span><span className="v" style={{fontSize:18, fontWeight:700}}>{_fmt(148500)}</span></div>
        </div>

        <div className="m-section-h"><div className="m-section-title">Платежи</div></div>
        <div className="m-card flush">
          <div className="m-list-row">
            <div style={{width:40, height:40, borderRadius:10, background:'var(--success-soft)', color:'var(--success-fg)', display:'flex', alignItems:'center', justifyContent:'center'}}><Icon.Check style={{width:18, height:18}}/></div>
            <div>
              <div className="m-row-title">PAY-0418</div>
              <div className="m-row-sub">Kaspi Pay · 18.05.2026 14:18</div>
            </div>
            <div style={{textAlign:'right', fontWeight:700}}>{_fmt(148500)}</div>
          </div>
        </div>

        <div className="m-section-h"><div className="m-section-title">Фискальный чек</div></div>
        <div className="m-card" style={{padding:14, display:'flex', gap:12, alignItems:'center'}}>
          <div style={{width:40, height:40, borderRadius:10, background:'var(--success-soft)', color:'var(--success-fg)', display:'flex', alignItems:'center', justifyContent:'center'}}><Icon.Receipt style={{width:18, height:18}}/></div>
          <div style={{flex:1}}>
            <div style={{fontSize:13, fontWeight:600}}>Подтверждён ОФД</div>
            <div style={{fontSize:11, color:'var(--text-3)', fontFamily:'JetBrains Mono, monospace', marginTop:2}}>F-2401-0418 · 18.05 14:19</div>
          </div>
          <button className="m-iconbtn"><Icon.Download/></button>
        </div>
      </div>
      <div style={{position:'absolute', left:8, right:8, bottom:88, padding:'8px 8px 0', display:'flex', gap:8, zIndex:4}}>
        <button className="m-btn" style={{flex:1}}><Icon.Download/>PDF</button>
        <button className="m-btn primary" style={{flex:1}}><Icon.Mail/>Отправить</button>
      </div>
      <ScreenMore_Tabbar active="invoices"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Payments list
// ─────────────────────────────────────────────────────────
function ScreenPayments() {
  const pays = [
    { id:'PAY-0418', name:'Дана Касенова',     amount:148500, provider:'Kaspi Pay',   ts:'Сегодня 14:18', status:'completed', tone:'success' },
    { id:'PAY-0417', name:'Алихан Бекжанов',    amount:165000, provider:'Halyk ePay',  ts:'Сегодня 11:42', status:'completed', tone:'success' },
    { id:'PAY-0416', name:'Темирлан Бакыт',     amount:80000,  provider:'Kaspi Pay',   ts:'Сегодня 09:30', status:'processing',tone:'info' },
    { id:'PAY-0415', name:'Аяна Сатпаева',      amount:135000, provider:'Наличные',    ts:'Вчера 16:55', status:'completed', tone:'success' },
    { id:'PAY-0414', name:'Камила Жумабекова',  amount:135000, provider:'Halyk ePay',  ts:'Вчера 12:18', status:'failed',    tone:'danger' },
    { id:'PAY-0413', name:'Нурлан Омаров',      amount:189000, provider:'Kaspi Pay',   ts:'20.05 17:12', status:'completed', tone:'success' },
  ];
  const lbl = { completed:'Проведён', processing:'Обработка', failed:'Ошибка' };
  return (
    <div className="m-shell">
      <_MBar title="Оплаты" sub="Май · 78 транзакций" action={<button className="m-iconbtn"><Icon.Filter/></button>}/>
      <div className="m-scroll">
        <div className="m-kpi-row" style={{gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:12}}>
          <div className="m-kpi" style={{padding:'10px 12px'}}><div className="m-kpi-label" style={{fontSize:9.5}}>Сумма</div><div className="m-kpi-value" style={{fontSize:17}}>10.8 млн</div></div>
          <div className="m-kpi" style={{padding:'10px 12px'}}><div className="m-kpi-label" style={{fontSize:9.5}}>Успех</div><div className="m-kpi-value" style={{fontSize:17, color:'var(--success-fg)'}}>96%</div></div>
          <div className="m-kpi" style={{padding:'10px 12px'}}><div className="m-kpi-label" style={{fontSize:9.5, color:'var(--danger-fg)'}}>Ошибок</div><div className="m-kpi-value" style={{fontSize:17, color:'var(--danger-fg)'}}>3</div></div>
        </div>

        <div className="m-chips">
          <span className="m-chip active">Все провайдеры <span className="m-chip-count">78</span></span>
          <span className="m-chip">Kaspi Pay <span className="m-chip-count">38</span></span>
          <span className="m-chip">Halyk ePay <span className="m-chip-count">21</span></span>
          <span className="m-chip">Наличные <span className="m-chip-count">7</span></span>
        </div>

        <div className="m-card flush">
          {pays.map((p, i) => (
            <div key={i} className="m-inv-row">
              <div className="m-avatar child sm">{_initials(p.name)}</div>
              <div style={{flex:1, minWidth:0}}>
                <div className="m-row-title" style={{fontSize:13.5}}>{p.name}</div>
                <div style={{display:'flex', gap:6, fontSize:11.5, color:'var(--text-3)', marginTop:3}}>
                  <span style={{fontFamily:'JetBrains Mono, monospace', color:'var(--text-4)'}}>{p.id}</span>
                  <span>·</span>
                  <span>{p.provider}</span>
                </div>
                <div style={{fontSize:11, color:'var(--text-4)', marginTop:1}}>{p.ts}</div>
              </div>
              <div style={{textAlign:'right', display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end'}}>
                <div className="m-inv-amount">{_fmt(p.amount)}</div>
                <span className={cx('badge', p.tone)} style={{fontSize:10.5, padding:'1px 7px'}}><span className="b-dot"/>{lbl[p.status]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ScreenMore_Tabbar active="invoices"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Payment detail
// ─────────────────────────────────────────────────────────
function ScreenPaymentDetail() {
  return (
    <div className="m-shell">
      <_MBar title="PAY-0418" sub="Платёж · Kaspi Pay" action={<button className="m-iconbtn ghost"><Icon.More/></button>}/>
      <div className="m-scroll">
        <div className="m-card" style={{padding:20, marginBottom:14, textAlign:'center'}}>
          <div style={{
            width:64, height:64, borderRadius:'50%',
            background:'var(--success-soft)', color:'var(--success-fg)',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            marginBottom:10
          }}><Icon.Check style={{width:32, height:32}}/></div>
          <div style={{fontSize:13, fontWeight:700, color:'var(--success-fg)', textTransform:'uppercase', letterSpacing:'0.06em'}}>Проведён</div>
          <div style={{fontSize:32, fontWeight:700, letterSpacing:'-0.02em', marginTop:6}}>{_fmt(148500)}</div>
          <div style={{fontSize:12, color:'var(--text-3)', marginTop:4}}>18.05.2026 в 14:18:42</div>
        </div>

        <div className="m-card flush" style={{marginBottom:14}}>
          <div className="m-kv"><span className="k">Счёт</span><span className="v" style={{color:'var(--primary)', fontWeight:600}}>INV-0241 →</span></div>
          <div className="m-kv"><span className="k">Ребёнок</span><span className="v">Дана Касенова</span></div>
          <div className="m-kv"><span className="k">Плательщик</span><span className="v">Айгерим Касенова</span></div>
          <div className="m-kv"><span className="k">Провайдер</span><span className="v">Kaspi Pay</span></div>
          <div className="m-kv"><span className="k">Карта</span><span className="v" style={{fontFamily:'JetBrains Mono, monospace'}}>**** **** **** 1234</span></div>
          <div className="m-kv"><span className="k">Reference</span><span className="v" style={{fontFamily:'JetBrains Mono, monospace', fontSize:11}}>kp_28401a9f3b</span></div>
        </div>

        <div className="m-section-h"><div className="m-section-title">События</div></div>
        <div className="m-card flush" style={{padding:'4px 0'}}>
          <div className="m-tl">
            <div className="m-tl-item">
              <div className="m-tl-dot"><Icon.Check/></div>
              <div>
                <div className="m-tl-title">Фискальный чек подтверждён</div>
                <div className="m-tl-meta">14:19:18 · F-2401-0418</div>
              </div>
            </div>
            <div className="m-tl-item">
              <div className="m-tl-dot info"><Icon.Info style={{width:12, height:12}}/></div>
              <div>
                <div className="m-tl-title">Чек отправлен в ОФД</div>
                <div className="m-tl-meta">14:18:55</div>
              </div>
            </div>
            <div className="m-tl-item">
              <div className="m-tl-dot"><Icon.Check/></div>
              <div>
                <div className="m-tl-title">Платёж завершён</div>
                <div className="m-tl-meta">14:18:42 · 148 500 ₸</div>
              </div>
            </div>
            <div className="m-tl-item">
              <div className="m-tl-dot neutral"><Icon.Clock style={{width:12, height:12}}/></div>
              <div>
                <div className="m-tl-title">Инициирован</div>
                <div className="m-tl-meta">14:18:01 · kp_28401a9f3b</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ScreenMore_Tabbar active="invoices"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Tariffs
// ─────────────────────────────────────────────────────────
function ScreenTariffs() {
  const plans = [
    { name:'Полный день',         price:165000, kids:48, hours:'08:00 – 18:00', incl:'Питание, занятия, прогулки', tone:'success' },
    { name:'Полный + питание',    price:189000, kids:14, hours:'08:00 – 18:00', incl:'+ Ужин, доп. меню', tone:'success' },
    { name:'Ясли',                price:135000, kids:12, hours:'08:00 – 18:00', incl:'Адаптивная программа',  tone:'success' },
    { name:'Полдня',              price:95000,  kids:2,  hours:'08:00 – 13:00', incl:'Без сна и ужина',  tone:'neutral' },
    { name:'Только присмотр',     price:60000,  kids:0,  hours:'08:00 – 18:00', incl:'Без занятий', tone:'neutral', draft:true },
  ];
  return (
    <div className="m-shell">
      <_MBar title="Тарифы" sub="5 планов · 76 назначений" action={<button className="m-iconbtn primary"><Icon.Plus/></button>}/>
      <div className="m-scroll">
        <div className="m-segmented" style={{marginBottom:14}}>
          <button className="on">Планы<span style={{marginLeft:5, background:'var(--bg-sunken)', fontSize:10, padding:'1px 6px', borderRadius:999}}>5</span></button>
          <button>Назначения<span style={{marginLeft:5, background:'var(--bg-sunken)', fontSize:10, padding:'1px 6px', borderRadius:999}}>76</span></button>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {plans.map((p, i) => (
            <div key={i} className="m-card" style={{padding:16, opacity: p.draft ? 0.7 : 1}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
                <div>
                  <div style={{fontWeight:700, fontSize:15.5, letterSpacing:'-0.01em'}}>{p.name}</div>
                  <div style={{fontSize:12, color:'var(--text-3)', marginTop:2}}>{p.hours}</div>
                </div>
                {p.draft
                  ? <span className="badge neutral" style={{fontSize:10.5}}><span className="b-dot"/>Черновик</span>
                  : <span className="badge success" style={{fontSize:10.5}}><span className="b-dot"/>Активен</span>}
              </div>
              <div style={{fontSize:24, fontWeight:700, letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums', color:'var(--primary-fg)'}}>{_fmt(p.price)}<span style={{fontSize:13, color:'var(--text-3)', fontWeight:500}}> /мес</span></div>
              <div style={{fontSize:12.5, color:'var(--text-2)', marginTop:8, lineHeight:1.4}}>{p.incl}</div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10, paddingTop:10, borderTop:'1px solid var(--line)'}}>
                <div style={{fontSize:12, color:'var(--text-3)'}}>На тарифе: <strong style={{color:'var(--text-1)'}}>{p.kids}</strong> детей</div>
                <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Refunds
// ─────────────────────────────────────────────────────────
function ScreenRefunds() {
  const items = [
    { id:'RFD-0042', name:'Аяна Сатпаева', amount:32000, reason:'Болезнь 8 дней', ts:'Сегодня', status:'pending', tone:'warning' },
    { id:'RFD-0041', name:'Нурлан Омаров',  amount:54000, reason:'Отпуск 14 дней', ts:'Вчера', status:'approved', tone:'info' },
    { id:'RFD-0040', name:'Алихан Бекжанов',amount:18000, reason:'Праздничные дни', ts:'21.05', status:'processed', tone:'success' },
    { id:'RFD-0039', name:'Дана Касенова',  amount:8000,  reason:'Корректировка', ts:'18.05', status:'processed', tone:'success' },
    { id:'RFD-0038', name:'Камила Ж.',       amount:0,    reason:'Дубликат заявки', ts:'15.05', status:'rejected', tone:'danger' },
  ];
  const lbl = { pending:'Ожидает', approved:'Одобрен', processed:'Проведён', rejected:'Отклонён' };
  return (
    <div className="m-shell">
      <_MBar title="Возвраты" sub="3 ожидают · ручная обработка" action={<button className="m-iconbtn"><Icon.Filter/></button>}/>
      <div className="m-scroll">
        <div style={{padding:14, background:'var(--warning-soft)', borderRadius:14, color:'var(--warning-fg)', fontSize:12.5, display:'flex', gap:10, marginBottom:14}}>
          <Icon.AlertTri style={{width:16, height:16, flexShrink:0, marginTop:1}}/>
          <div>Phase A: возвраты создаются автоматически, но обработка выполняется вручную через провайдера.</div>
        </div>

        <div className="m-segmented" style={{marginBottom:12}}>
          <button className="on">Ожидают<span style={{marginLeft:5, background:'var(--warning)', color:'white', fontSize:10, padding:'1px 6px', borderRadius:999, fontWeight:700}}>3</span></button>
          <button>В работе</button>
          <button>История</button>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {items.map((r, i) => (
            <div key={i} className="m-card" style={{padding:14}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--text-4)'}}>{r.id}</div>
                  <div style={{fontWeight:600, fontSize:14, marginTop:2}}>{r.name}</div>
                </div>
                <div style={{fontSize:16, fontWeight:700, fontVariantNumeric:'tabular-nums'}}>{_fmt(r.amount)}</div>
              </div>
              <div style={{fontSize:12.5, color:'var(--text-2)', marginBottom:8}}>{r.reason}</div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontSize:11, color:'var(--text-3)'}}>{r.ts}</span>
                <span className={cx('badge', r.tone)} style={{fontSize:10.5, padding:'1px 7px'}}><span className="b-dot"/>{lbl[r.status]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Discounts list
// ─────────────────────────────────────────────────────────
function ScreenDiscounts() {
  const list = [
    { name:'Второй ребёнок',   type:'−10%', kids:8,  status:'active', tone:'success', desc:'Семьям с 2+ детьми в саду', until:'до конца года' },
    { name:'Сотрудник садика', type:'−25%', kids:2,  status:'active', tone:'success', desc:'Детям воспитателей', until:'бессрочно' },
    { name:'Раннее бронирование', type:'−5%', kids:14, status:'active', tone:'success', desc:'При оплате до 1 числа', until:'до 31.12' },
    { name:'Летняя акция',     type:'−15%', kids:0,  status:'scheduled', tone:'info', desc:'Июль–август', until:'с 01.07' },
    { name:'День защиты детей',type:'−500 ₸', kids:0, status:'expired', tone:'neutral', desc:'1 июня · разовая', until:'истекла' },
  ];
  const lbl = { active:'Активна', scheduled:'Запланир.', expired:'Истекла', paused:'Пауза' };
  return (
    <div className="m-shell">
      <_MBar title="Скидки" sub="3 активных · 24 применений" action={<button className="m-iconbtn primary"><Icon.Plus/></button>}/>
      <div className="m-scroll">
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {list.map((d, i) => (
            <div key={i} className="m-card" style={{padding:14, position:'relative'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                    <div style={{width:34, height:34, borderRadius:10, background:'var(--primary-soft)', color:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                      <Icon.Gift style={{width:18, height:18}}/>
                    </div>
                    <div>
                      <div style={{fontWeight:700, fontSize:14.5}}>{d.name}</div>
                      <div style={{fontSize:11, color:'var(--text-3)'}}>{d.desc}</div>
                    </div>
                  </div>
                </div>
                <div style={{fontSize:18, fontWeight:700, color:'var(--primary)', fontVariantNumeric:'tabular-nums'}}>{d.type}</div>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8, paddingTop:10, borderTop:'1px solid var(--line)'}}>
                <div style={{display:'flex', gap:10, fontSize:11.5, color:'var(--text-3)'}}>
                  <span><strong style={{color:'var(--text-1)'}}>{d.kids}</strong> детей</span>
                  <span>· {d.until}</span>
                </div>
                <span className={cx('badge', d.tone)} style={{fontSize:10.5, padding:'1px 7px'}}><span className="b-dot"/>{lbl[d.status]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Discount wizard
// ─────────────────────────────────────────────────────────
function ScreenDiscountWizard() {
  return (
    <div className="m-shell">
      <_MBar title="Новая скидка" sub="Шаг 2 из 4" action={<button className="m-iconbtn ghost"><Icon.X/></button>}/>
      <div className="m-scroll" style={{paddingBottom:170}}>
        {/* Stepper */}
        <div style={{display:'flex', gap:6, marginBottom:18}}>
          {[1,2,3,4].map(s => (
            <div key={s} style={{
              flex:1, height:4, borderRadius:2,
              background: s <= 2 ? 'var(--primary)' : 'var(--bg-sunken)'
            }}/>
          ))}
        </div>
        <div style={{fontSize:11, fontWeight:700, color:'var(--primary)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4}}>Шаг 2</div>
        <div style={{fontSize:22, fontWeight:700, letterSpacing:'-0.02em', marginBottom:6}}>Условия применения</div>
        <div style={{fontSize:13, color:'var(--text-3)', marginBottom:18}}>Кому будет автоматически назначаться эта скидка.</div>

        <div className="m-section-h" style={{margin:'4px 0 8px'}}><div className="m-section-title">Условие 1</div></div>
        <div className="m-card" style={{padding:14, background:'var(--bg-subtle)'}}>
          <div className="field">
            <label className="field-label">Поле</label>
            <select className="select" defaultValue="siblings">
              <option value="siblings">Кол-во детей в саду</option>
              <option value="age">Возраст ребёнка</option>
              <option value="tariff">Тип тарифа</option>
            </select>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            <div className="field" style={{marginBottom:0}}>
              <label className="field-label">Оператор</label>
              <select className="select" defaultValue="gte">
                <option value="gte">≥</option>
                <option value="eq">=</option>
                <option value="lte">≤</option>
              </select>
            </div>
            <div className="field" style={{marginBottom:0}}>
              <label className="field-label">Значение</label>
              <input className="input" defaultValue="2"/>
            </div>
          </div>
        </div>

        <button className="m-btn ghost" style={{marginTop:10, justifyContent:'flex-start', background:'var(--primary-soft)', color:'var(--primary-fg)'}}>
          <Icon.Plus/>Добавить условие
        </button>

        <div className="m-section-h"><div className="m-section-title">Превью</div></div>
        <div className="m-card" style={{padding:14, background:'var(--success-soft)', color:'var(--success-fg)', border:'1px solid color-mix(in oklab, var(--success) 25%, transparent)'}}>
          <div style={{fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:6}}>Применится к</div>
          <div style={{fontSize:14, fontWeight:600}}>8 детям из 76</div>
          <div style={{fontSize:12, marginTop:4, opacity:0.85}}>4 семьи с 2 и более детьми в саду</div>
        </div>
      </div>
      <div style={{position:'absolute', left:8, right:8, bottom:88, padding:'8px 8px 0', display:'flex', gap:8, zIndex:4}}>
        <button className="m-btn" style={{flex:1}}>Назад</button>
        <button className="m-btn primary" style={{flex:2}}>Далее → Период</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Holidays
// ─────────────────────────────────────────────────────────
function ScreenHolidays() {
  const days = Array.from({length:31}, (_, i) => i+1);
  const holidayMap = { 1:true, 7:true, 8:true, 9:true };
  const holidayItems = [
    { d:1,  name:'Праздник Единства народа',     kk:'Бірлік мерекесі',           bill:false },
    { d:7,  name:'День защитника Отечества',     kk:'Отан Қорғаушы күні',         bill:false },
    { d:8,  name:'Международный женский день',   kk:'Халықаралық әйелдер күні',  bill:false },
    { d:9,  name:'День Победы',                  kk:'Жеңіс күні',                 bill:false },
  ];
  return (
    <div className="m-shell">
      <_MBar title="Праздники" sub="2026 · влияют на тариф" action={<button className="m-iconbtn primary"><Icon.Plus/></button>}/>
      <div className="m-scroll">
        <div className="m-card" style={{padding:14, marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <button className="m-iconbtn ghost"><Icon.ChevronLeft/></button>
          <div style={{fontWeight:700, fontSize:16, letterSpacing:'-0.01em'}}>Май 2026</div>
          <button className="m-iconbtn ghost"><Icon.ChevronRight/></button>
        </div>

        <div className="m-card" style={{padding:14, marginBottom:14}}>
          <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4, marginBottom:6}}>
            {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
              <div key={d} style={{fontSize:10, fontWeight:700, color:'var(--text-3)', textAlign:'center'}}>{d}</div>
            ))}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4}}>
            {Array.from({length:3}).map((_, i) => <div key={`p${i}`}/>)}
            {days.map(d => {
              const h = holidayMap[d];
              return (
                <div key={d} style={{
                  aspectRatio:'1/1', borderRadius:8,
                  background: h ? 'var(--danger-soft)' : 'transparent',
                  border: h ? 'none' : '1px solid var(--line)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, fontWeight:600,
                  color: h ? 'var(--danger-fg)' : 'var(--text-1)'
                }}>{d}</div>
              );
            })}
          </div>
        </div>

        <div className="m-section-h"><div className="m-section-title">Праздники в мае</div></div>
        <div className="m-card flush">
          {holidayItems.map((h, i) => (
            <div key={i} className="m-list-row">
              <div style={{
                width:44, height:44, borderRadius:12,
                background:'var(--danger-soft)', color:'var(--danger-fg)',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                fontWeight:700
              }}>
                <div style={{fontSize:18, lineHeight:1}}>{h.d}</div>
                <div style={{fontSize:8, opacity:0.7, marginTop:1}}>МАЙ</div>
              </div>
              <div>
                <div className="m-row-title" style={{fontSize:13.5}}>{h.name}</div>
                <div className="m-row-sub">{h.kk}</div>
              </div>
              <span className="badge neutral" style={{fontSize:10}}><span className="b-dot"/>Не тариф.</span>
            </div>
          ))}
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Fiscal receipts
// ─────────────────────────────────────────────────────────
function ScreenFiscal() {
  const items = [
    { id:'F-2401-0418', pay:'PAY-0418', prov:'Kaspi Pay',  sign:'9438192834521', ts:'Сегодня 14:19', status:'success', tone:'success' },
    { id:'F-2401-0417', pay:'PAY-0417', prov:'Halyk ePay', sign:'8392019283740', ts:'Сегодня 11:43', status:'success', tone:'success' },
    { id:'F-2401-0416', pay:'PAY-0416', prov:'Kaspi Pay',  sign:'—',             ts:'Сегодня 09:31', status:'sent',    tone:'info' },
    { id:'F-2401-0415', pay:'PAY-0415', prov:'Наличные',   sign:'7283910283740', ts:'Вчера 16:56',   status:'success', tone:'success' },
    { id:'F-2401-0414', pay:'PAY-0414', prov:'Halyk ePay', sign:'—',             ts:'Вчера 12:19',   status:'failed',  tone:'danger' },
  ];
  const lbl = { success:'Подтверждён', sent:'Отправлен', failed:'Ошибка', queued:'В очереди' };
  return (
    <div className="m-shell">
      <_MBar title="Фискальные чеки" sub="ОФД РК · 78 чеков" action={<button className="m-iconbtn"><Icon.Filter/></button>}/>
      <div className="m-scroll">
        <div style={{padding:14, background:'var(--info-soft)', borderRadius:14, color:'var(--info-fg)', fontSize:12.5, display:'flex', gap:10, marginBottom:14}}>
          <Icon.Info style={{width:16, height:16, flexShrink:0, marginTop:1}}/>
          <div><strong>Phase A: read-only.</strong> Ретраи и отчёты появятся в Phase B.</div>
        </div>

        <div className="m-kpi-row" style={{gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:12}}>
          <div className="m-kpi" style={{padding:'10px 12px'}}><div className="m-kpi-label" style={{fontSize:9.5}}>Всего</div><div className="m-kpi-value" style={{fontSize:18}}>78</div></div>
          <div className="m-kpi" style={{padding:'10px 12px'}}><div className="m-kpi-label" style={{fontSize:9.5, color:'var(--success-fg)'}}>Успех</div><div className="m-kpi-value" style={{fontSize:18, color:'var(--success-fg)'}}>74</div></div>
          <div className="m-kpi" style={{padding:'10px 12px'}}><div className="m-kpi-label" style={{fontSize:9.5, color:'var(--danger-fg)'}}>Ошибки</div><div className="m-kpi-value" style={{fontSize:18, color:'var(--danger-fg)'}}>2</div></div>
        </div>

        <div className="m-card flush">
          {items.map((f, i) => (
            <div key={i} className="m-list-row">
              <div style={{
                width:40, height:40, borderRadius:10,
                background: f.tone === 'success' ? 'var(--success-soft)' : f.tone === 'danger' ? 'var(--danger-soft)' : 'var(--info-soft)',
                color: f.tone === 'success' ? 'var(--success-fg)' : f.tone === 'danger' ? 'var(--danger-fg)' : 'var(--info-fg)',
                display:'flex', alignItems:'center', justifyContent:'center'
              }}>
                <Icon.Receipt style={{width:18, height:18}}/>
              </div>
              <div>
                <div className="m-row-title" style={{fontSize:13, fontFamily:'JetBrains Mono, monospace'}}>{f.id}</div>
                <div className="m-row-sub" style={{fontSize:11}}>{f.pay} · {f.prov}</div>
                <div style={{fontSize:10.5, color:'var(--text-4)', marginTop:1, fontFamily:'JetBrains Mono, monospace'}}>{f.sign}</div>
              </div>
              <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4}}>
                <span className={cx('badge', f.tone)} style={{fontSize:10}}><span className="b-dot"/>{lbl[f.status]}</span>
                <span style={{fontSize:10, color:'var(--text-4)'}}>{f.ts}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Diagnostics
// ─────────────────────────────────────────────────────────
function ScreenDiagnostics() {
  const list = [
    { spec:'Психолог',  name:'Адаптация к саду',  ver:4, used:42, active:true, tone:'info' },
    { spec:'Психолог',  name:'Эмоциональный фон', ver:2, used:18, active:true, tone:'info' },
    { spec:'Логопед',   name:'Артикуляция',       ver:6, used:31, active:true, tone:'info' },
    { spec:'Логопед',   name:'Связная речь',      ver:3, used:14, active:true, tone:'info' },
    { spec:'Музыка',    name:'Ритм и слух',        ver:1, used:8,  active:false, tone:'neutral' },
  ];
  return (
    <div className="m-shell">
      <_MBar title="Диагностика" sub="Шаблоны для специалистов" action={<button className="m-iconbtn primary"><Icon.Plus/></button>}/>
      <div className="m-scroll">
        <div className="m-chips">
          <span className="m-chip active">Все <span className="m-chip-count">5</span></span>
          <span className="m-chip">Психолог <span className="m-chip-count">2</span></span>
          <span className="m-chip">Логопед <span className="m-chip-count">2</span></span>
          <span className="m-chip">Музыка <span className="m-chip-count">1</span></span>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {list.map((d, i) => (
            <div key={i} className="m-card" style={{padding:14, opacity: d.active ? 1 : 0.6}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
                <div style={{flex:1, minWidth:0}}>
                  <span className={cx('badge', d.tone)} style={{fontSize:10.5}}><span className="b-dot"/>{d.spec}</span>
                  <div style={{fontWeight:700, fontSize:14.5, marginTop:6, letterSpacing:'-0.005em'}}>{d.name}</div>
                </div>
                {d.active
                  ? <span className="badge success" style={{fontSize:10.5}}><span className="b-dot"/>Активен</span>
                  : <span className="badge neutral" style={{fontSize:10.5}}><span className="b-dot"/>Деактив.</span>}
              </div>
              <div style={{display:'flex', gap:14, fontSize:11.5, color:'var(--text-3)', marginTop:8, paddingTop:10, borderTop:'1px solid var(--line)'}}>
                <span>Версия <strong style={{color:'var(--text-1)', fontFamily:'JetBrains Mono, monospace'}}>v{d.ver}</strong></span>
                <span>· <strong style={{color:'var(--text-1)'}}>{d.used}</strong> записей</span>
                <Icon.ChevronRight style={{width:14, height:14, marginLeft:'auto', color:'var(--text-4)'}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Face ID
// ─────────────────────────────────────────────────────────
function ScreenFaceId() {
  return (
    <div className="m-shell">
      <_MBar title="Face ID" sub="Биометрия" action={<button className="m-iconbtn ghost"><Icon.More/></button>}/>
      <div className="m-scroll">
        <div style={{
          padding:18, marginBottom:14,
          background:'linear-gradient(135deg, var(--warning-soft), var(--bg))',
          borderRadius:16, display:'flex', gap:14, alignItems:'flex-start'
        }}>
          <div style={{width:48, height:48, borderRadius:14, background:'rgba(255,175,54,0.25)', color:'var(--warning-fg)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
            <Icon.AlertTri style={{width:22, height:22}}/>
          </div>
          <div>
            <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--warning-fg)', marginBottom:4}}>Phase C — в разработке</div>
            <div style={{fontSize:13, color:'var(--text-2)', lineHeight:1.5}}>Зарегистрировать профили и собрать согласия можно уже сейчас. Распознавание заработает после развёртывания edge-сервиса.</div>
          </div>
        </div>

        <div className="m-segmented" style={{marginBottom:14}}>
          <button className="on">Согласия<span style={{marginLeft:5, background:'var(--bg-sunken)', fontSize:10, padding:'1px 6px', borderRadius:999}}>62</span></button>
          <button>Профили<span style={{marginLeft:5, background:'var(--bg-sunken)', fontSize:10, padding:'1px 6px', borderRadius:999}}>58</span></button>
          <button>Камеры</button>
        </div>

        <div className="m-kpi-row" style={{gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:14}}>
          <div className="m-kpi" style={{padding:'10px 12px'}}><div className="m-kpi-label" style={{fontSize:9.5, color:'var(--success-fg)'}}>Подпис.</div><div className="m-kpi-value" style={{fontSize:18, color:'var(--success-fg)'}}>62</div></div>
          <div className="m-kpi" style={{padding:'10px 12px'}}><div className="m-kpi-label" style={{fontSize:9.5, color:'var(--warning-fg)'}}>Ожидают</div><div className="m-kpi-value" style={{fontSize:18, color:'var(--warning-fg)'}}>11</div></div>
          <div className="m-kpi" style={{padding:'10px 12px'}}><div className="m-kpi-label" style={{fontSize:9.5}}>Отказы</div><div className="m-kpi-value" style={{fontSize:18}}>3</div></div>
        </div>

        <div className="m-card flush">
          <div className="m-list-row">
            <div className="m-avatar guardian">АК</div>
            <div>
              <div className="m-row-title">Айгерим Касенова</div>
              <div className="m-row-sub">Дана К. · мать · 14.09.2024</div>
            </div>
            <span className="badge success" style={{fontSize:10.5}}><span className="b-dot"/>Подпис.</span>
          </div>
          <div className="m-list-row">
            <div className="m-avatar guardian">МК</div>
            <div>
              <div className="m-row-title">Марат Касенов</div>
              <div className="m-row-sub">Дана К. · отец · отправлено вчера</div>
            </div>
            <span className="badge warning" style={{fontSize:10.5}}><span className="b-dot"/>Ожидает</span>
          </div>
          <div className="m-list-row">
            <div className="m-avatar guardian">ДЖ</div>
            <div>
              <div className="m-row-title">Дина Жакыпова</div>
              <div className="m-row-sub">Темирлан Б. · мать · 12.05</div>
            </div>
            <span className="badge danger" style={{fontSize:10.5}}><span className="b-dot"/>Отказ</span>
          </div>
          <div className="m-list-row">
            <div className="m-avatar guardian">БС</div>
            <div>
              <div className="m-row-title">Бекет Сатпаев</div>
              <div className="m-row-sub">Аяна С. · отец · 22.04</div>
            </div>
            <span className="badge success" style={{fontSize:10.5}}><span className="b-dot"/>Подпис.</span>
          </div>
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: DLQ
// ─────────────────────────────────────────────────────────
function ScreenDlq() {
  const items = [
    { kind:'fiscal',  title:'Отправка чека в ОФД', detail:'INV-0237 · 135 000 ₸', err:'Connection timeout', retries:3, ts:'12 мин', tone:'danger' },
    { kind:'fiscal',  title:'Отправка чека в ОФД', detail:'INV-0214 · 165 000 ₸', err:'Invalid signature',  retries:5, ts:'1 ч',   tone:'danger' },
    { kind:'sms',     title:'SMS родителю', detail:'+7 701 555 ** ** · OTP-забор', err:'Operator rejected',  retries:2, ts:'2 ч',   tone:'warning' },
    { kind:'notif',   title:'Push в мобильное приложение', detail:'Бекет С. · «Болезнь принята»', err:'Token expired', retries:1, ts:'Вчера', tone:'warning' },
  ];
  return (
    <div className="m-shell">
      <_MBar title="Сбойные задачи" sub="2 критичных · ручной разбор" action={<button className="m-iconbtn"><Icon.Refresh/></button>}/>
      <div className="m-scroll">
        <div style={{padding:14, background:'var(--danger-soft)', borderRadius:14, color:'var(--danger-fg)', fontSize:12.5, display:'flex', gap:10, marginBottom:14}}>
          <Icon.AlertTri style={{width:16, height:16, flexShrink:0, marginTop:1}}/>
          <div><strong>2 задачи требуют внимания.</strong> Просрочка чеков ОФД может привести к штрафам.</div>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {items.map((q, i) => (
            <div key={i} className="m-card" style={{padding:14}}>
              <div style={{display:'flex', gap:12, alignItems:'flex-start', marginBottom:8}}>
                <div style={{
                  width:36, height:36, borderRadius:10,
                  background: q.tone === 'danger' ? 'var(--danger-soft)' : 'var(--warning-soft)',
                  color: q.tone === 'danger' ? 'var(--danger-fg)' : 'var(--warning-fg)',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
                }}>
                  <Icon.AlertTri style={{width:18, height:18}}/>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontWeight:700, fontSize:14}}>{q.title}</div>
                  <div style={{fontSize:11.5, color:'var(--text-3)', marginTop:2}}>{q.detail}</div>
                </div>
              </div>
              <div style={{padding:'8px 10px', background:'var(--bg-sunken)', borderRadius:8, fontFamily:'JetBrains Mono, monospace', fontSize:11, color:'var(--danger-fg)', marginBottom:10}}>
                {q.err}
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{fontSize:11, color:'var(--text-3)'}}>Попыток: <strong style={{color:'var(--text-1)'}}>{q.retries}</strong> · {q.ts}</div>
                <div style={{display:'flex', gap:6}}>
                  <button className="btn ghost sm" style={{height:30, fontSize:12}}>Лог</button>
                  <button className="btn secondary sm" style={{height:30, fontSize:12, background:'var(--primary)', color:'white', borderColor:'transparent'}}>Повтор</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: Settings
// ─────────────────────────────────────────────────────────
function ScreenSettings() {
  return (
    <div className="m-shell">
      <_MBar title="Настройки" sub="Балапан KZ"/>
      <div className="m-scroll">
        <div className="m-section-h" style={{marginTop:0}}><div className="m-section-title">Садик</div></div>
        <div className="m-card flush">
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.Building/></div>
            <div className="grow"><div>Общие</div><div style={{fontSize:11.5, color:'var(--text-3)'}}>Название, адрес, часы работы</div></div>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.Globe/></div>
            <div className="grow"><div>Языки</div><div style={{fontSize:11.5, color:'var(--text-3)'}}>RU · KK</div></div>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic info"><Icon.IdCard/></div>
            <div className="grow"><div>Реквизиты</div><div style={{fontSize:11.5, color:'var(--text-3)'}}>БИН, расчётный счёт</div></div>
            <Icon.ChevronRight style={{width:16, height:16, color:'var(--text-4)'}}/>
          </div>
        </div>

        <div className="m-section-h"><div className="m-section-title">Биллинг</div></div>
        <div className="m-card flush">
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.CreditCard/></div>
            <div className="grow"><div>Провайдеры</div><div style={{fontSize:11.5, color:'var(--text-3)'}}>Kaspi, Halyk</div></div>
            <span className="badge success" style={{fontSize:10}}><span className="b-dot"/>2/2</span>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.Receipt/></div>
            <div className="grow"><div>ОФД</div><div style={{fontSize:11.5, color:'var(--text-3)'}}>Onlinekassa.kz</div></div>
            <span className="badge success" style={{fontSize:10}}><span className="b-dot"/>OK</span>
          </div>
        </div>

        <div className="m-section-h"><div className="m-section-title">Уведомления</div></div>
        <div className="m-card flush">
          <div className="m-drawer-item">
            <div className="m-drawer-ic warn"><Icon.Bell/></div>
            <div className="grow">Push на сбои</div>
            <label className="toggle on"><span className="track"/></label>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.Mail/></div>
            <div className="grow">Email-дайджест</div>
            <label className="toggle on"><span className="track"/></label>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.Phone/></div>
            <div className="grow">SMS-оповещения родителям</div>
            <label className="toggle"><span className="track"/></label>
          </div>
        </div>

        <div className="m-section-h"><div className="m-section-title">Внешний вид</div></div>
        <div className="m-card" style={{padding:14}}>
          <div style={{fontSize:13, fontWeight:600, marginBottom:10}}>Тема</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            {[
              { name:'Жасыл', sw:['#47D848','#FFFFFF','#303030'], on:true },
              { name:'Қызғылт сары', sw:['#FFAF36','#FFFFFF','#303030'] },
              { name:'Көк', sw:['#007BE0','#FFFFFF','#303030'] },
              { name:'Тёмная', sw:['#FFAF36','#191410','#303030'] },
            ].map((t, i) => (
              <div key={i} style={{
                padding:10, borderRadius:10,
                border: t.on ? '1.5px solid var(--primary)' : '1px solid var(--line)',
                background: t.on ? 'var(--primary-soft)' : 'var(--bg-elev)'
              }}>
                <div style={{display:'flex', gap:0, borderRadius:6, overflow:'hidden', marginBottom:6, boxShadow:'0 0 0 1px rgba(0,0,0,0.08)'}}>
                  {t.sw.map((c, j) => <div key={j} style={{flex:1, height:24, background:c}}/>)}
                </div>
                <div style={{fontSize:11.5, fontWeight:600}}>{t.name}{t.on && ' ✓'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="m-section-h"><div className="m-section-title">Интеграции</div></div>
        <div className="m-card flush" style={{marginBottom:18}}>
          <div className="m-drawer-item">
            <div className="m-drawer-ic info"><Icon.News/></div>
            <div className="grow"><div>Мобильное приложение родителей</div><div style={{fontSize:11.5, color:'var(--text-3)'}}>API · 1.4.0</div></div>
            <span className="badge success" style={{fontSize:10}}><span className="b-dot"/>Активна</span>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic"><Icon.Scan/></div>
            <div className="grow"><div>Face ID edge-сервис</div><div style={{fontSize:11.5, color:'var(--text-3)'}}>Phase C</div></div>
            <span className="badge neutral" style={{fontSize:10}}><span className="b-dot"/>Phase C</span>
          </div>
        </div>
      </div>
      <ScreenMore_Tabbar active="more"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SCREEN: System state (404)
// ─────────────────────────────────────────────────────────
function ScreenError() {
  return (
    <div className="m-shell">
      <_MBar title="" flat back={true}/>
      <div className="m-scroll no-bar" style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'40px 32px', paddingBottom:130}}>
        <div style={{
          width:120, height:120, borderRadius:32,
          background:'var(--bg-sunken)', color:'var(--text-3)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:48, fontWeight:800, letterSpacing:'-0.04em',
          marginBottom:24, fontFamily:'JetBrains Mono, monospace'
        }}>404</div>
        <div style={{fontSize:22, fontWeight:700, letterSpacing:'-0.02em', marginBottom:8}}>Страница не найдена</div>
        <div style={{fontSize:14, color:'var(--text-3)', lineHeight:1.5, marginBottom:24}}>
          Возможно, ссылка устарела, раздел был переименован или перенесён в архив.
        </div>
        <button className="m-btn primary" style={{width:'100%'}}><Icon.Home/>Вернуться на главную</button>
        <button className="m-btn ghost" style={{width:'100%', marginTop:8}}>Сообщить о проблеме</button>
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenGroups, ScreenGroupDetail,
  ScreenStaff, ScreenStaffDetail,
  ScreenStructure, ScreenSchedule, ScreenMeals, ScreenContent,
  ScreenInvoiceDetail, ScreenPayments, ScreenPaymentDetail,
  ScreenTariffs, ScreenRefunds,
  ScreenDiscounts, ScreenDiscountWizard,
  ScreenHolidays, ScreenFiscal,
  ScreenDiagnostics, ScreenFaceId, ScreenDlq,
  ScreenSettings, ScreenError,
});
