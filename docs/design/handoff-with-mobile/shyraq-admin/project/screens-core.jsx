// screens-core.jsx — Dashboard, Children, Enrollments, Groups, Staff

// ============== DASHBOARD ==============
function Dashboard({ navigate }) {
  const today = new Date();
  const todayStr = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const attendance = [
    { label: 'В саду', value: 58, color: '#1F7A3F' },
    { label: 'Ушли домой', value: 4, color: '#7BA897' },
    { label: 'Отсутствуют', value: 8, color: '#A85D08' },
    { label: 'В отпуске', value: 4, color: '#5B7DB1' },
    { label: 'Болеют', value: 2, color: '#B42318' },
  ];
  const attTotal = attendance.reduce((s, x) => s + x.value, 0);
  const providers = [
    { name: 'Halyk ePay', count: 38, amount: 6_280_000 },
    { name: 'Kaspi Pay', count: 21, amount: 3_410_000 },
    { name: 'Наличные', count: 7, amount: 1_180_000 },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Доброе утро, Айгуль 👋</h1>
          <div className="page-sub">Сегодня · {todayStr} · {DATA.kg.name}</div>
        </div>
        <div className="row gap-8">
          <Btn icon={Icon.Plus}>Создать лид</Btn>
          <Btn icon={Icon.Plus} variant="primary">Создать карточку</Btn>
        </div>
      </div>

      <div className="kpi-grid">
        <Card className="kpi" onClick={() => navigate('#/children')}>
          <div className="kpi-label">Активных детей</div>
          <div className="kpi-value">76</div>
          <div className="kpi-sub up"><Icon.ArrowUp style={{ width: 12, height: 12 }} />+3 за неделю</div>
        </Card>
        <Card className="kpi" onClick={() => navigate('#/enrollments')}>
          <div className="kpi-label">Лидов в работе</div>
          <div className="kpi-value">14</div>
          <div className="kpi-sub"><Badge tone="warning" size="lg">6 новых</Badge></div>
        </Card>
        <Card className="kpi" onClick={() => navigate('#/staff')}>
          <div className="kpi-label">Сотрудников</div>
          <div className="kpi-value">11</div>
          <div className="kpi-sub muted">10 активных</div>
        </Card>
        <Card className="kpi" onClick={() => navigate('#/groups')}>
          <div className="kpi-label">Активных групп</div>
          <div className="kpi-value">5</div>
          <div className="kpi-sub muted">2 группы переполнены</div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>
        <Card>
          <div className="card-header">
            <div>
              <div className="h3">Посещаемость сегодня</div>
              <div className="caption">{attTotal} детей · обновлено в 10:42</div>
            </div>
            <Select sm options={[{value:'all', label:'Все группы'}, ...DATA.groups.map(g => ({value:g.id, label:g.name}))]} value="all" onChange={() => {}} />
          </div>
          <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 28 }}>
            <Donut segments={attendance} centerNum={attTotal} centerCap="детей" />
            <div className="legend" style={{ flex: 1 }}>
              {attendance.map(a => (
                <div key={a.label} className="legend-row">
                  <span className="sw" style={{ background: a.color }} />
                  <span className="ll">{a.label}</span>
                  <span className="lv">{a.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-header">
            <div className="h3">Финансы</div>
            <a href="#/billing/invoices" className="caption" style={{ color: 'var(--primary)', fontWeight: 600 }}>Перейти в счета →</a>
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div onClick={() => navigate('#/billing/invoices?status=overdue')} style={{ cursor: 'pointer', padding: 14, background: 'var(--danger-soft)', borderRadius: 10, border: '1px solid color-mix(in oklab, var(--danger) 28%, transparent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger-fg)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Просрочено</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger-fg)', marginTop: 4 }}>{fmtKzt(324000)}</div>
                  <div style={{ fontSize: 12, color: 'var(--danger-fg)', marginTop: 2 }}>2 счёта · требует внимания</div>
                </div>
                <Icon.ClockAlert style={{ width: 28, height: 28, color: 'var(--danger)' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ padding: 12, background: 'var(--bg-sunken)', borderRadius: 8 }}>
                <div className="caption">Выручка MTD</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{fmtKzt(10870000)}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--bg-sunken)', borderRadius: 8 }}>
                <div className="caption">Выручка YTD</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{fmtKzt(52340000)}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="card-header">
          <div>
            <div className="h3">Обзор оплат</div>
            <div className="caption">01.05.2026 — 18.05.2026 · по провайдерам</div>
          </div>
          <div className="row gap-8">
            <Select sm options={[{value:'this_month', label:'Этот месяц'},{value:'last_month', label:'Прошлый месяц'},{value:'q', label:'Этот квартал'}]} value="this_month" onChange={() => {}} />
            <Btn size="sm" icon={Icon.Download}>Экспорт</Btn>
          </div>
        </div>
        <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 1.2fr', gap: 16 }}>
          {[
            { label: 'Оплачено', count: 66, amount: 10870000, tone: 'success' },
            { label: 'Ожидает', count: 11, amount: 1820000, tone: 'neutral' },
            { label: 'Просрочено', count: 2, amount: 324000, tone: 'danger' },
            { label: 'Возвращено', count: 1, amount: 165000, tone: 'info' },
          ].map((s, i) => (
            <div key={i} style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 10 }}>
              <Badge tone={s.tone} size="lg">{s.label}</Badge>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 10 }}>{s.count}</div>
              <div className="caption" style={{ marginTop: 2 }}>{fmtKzt(s.amount)}</div>
            </div>
          ))}
          <div style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg-subtle)' }}>
            <div className="caption" style={{ fontWeight: 600, color: 'var(--text-2)' }}>По провайдерам</div>
            <div style={{ marginTop: 8 }}>
              {providers.map(p => {
                const max = Math.max(...providers.map(x => x.amount));
                return (
                  <div key={p.name} className="bar-row" style={{ gridTemplateColumns: '90px 1fr 70px', padding: '4px 0' }}>
                    <span>{p.name}</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(p.amount / max) * 100}%` }} /></div>
                    <span className="bv">{Math.round(p.amount / 1000)}к</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============== CHILDREN list ==============
function ChildrenList({ navigate }) {
  const [filter, setFilter] = useState({ status: 'all', group: 'all', q: '' });
  const list = DATA.children.filter(c => {
    if (filter.status !== 'all' && c.status !== filter.status) return false;
    if (filter.group !== 'all' && c.group !== filter.group) return false;
    if (filter.q && !c.name.toLowerCase().includes(filter.q.toLowerCase()) && !c.iin.includes(filter.q)) return false;
    return true;
  });
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Дети</h1>
          <div className="page-sub">{DATA.children.filter(c => c.status === 'active').length} активных · {DATA.children.filter(c => c.status === 'archived').length} в архиве</div>
        </div>
        <Btn variant="primary" icon={Icon.Plus} onClick={() => navigate('#/children/new')}>Создать карточку</Btn>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div style={{ width: 280 }}>
            <Input sm icon={Icon.Search} placeholder="Поиск по ФИО или ИИН" value={filter.q} onChange={(v) => setFilter(f => ({...f, q: v}))} />
          </div>
          <Select sm value={filter.status} onChange={(v) => setFilter(f => ({...f, status: v}))}
            options={[{value:'all', label:'Все статусы'},{value:'active', label:'Активны'},{value:'card_created', label:'Новые карточки'},{value:'archived', label:'В архиве'}]} />
          <Select sm value={filter.group} onChange={(v) => setFilter(f => ({...f, group: v}))}
            options={[{value:'all', label:'Все группы'}, ...DATA.groups.map(g => ({value: g.id, label: g.name}))]} />
          <div className="spacer" />
          <Btn size="sm" icon={Icon.Download}>Экспорт</Btn>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 56 }}></th>
              <th>ФИО</th>
              <th>ИИН</th>
              <th>Группа</th>
              <th>Статус</th>
              <th>Дата зачисления</th>
              <th className="num">Возраст</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => {
              const months = Math.floor((Date.now() - new Date(c.dob).getTime()) / (1000 * 60 * 60 * 24 * 30.4));
              const years = Math.floor(months / 12);
              const rem = months % 12;
              return (
                <tr key={c.id} className={c.status === 'archived' ? 'archived' : ''} onClick={() => navigate(`#/children/${c.id}`)}>
                  <td><Avatar name={c.name} kind="child" /></td>
                  <td><strong>{c.name}</strong><div className="caption">{c.sex === 'м' ? 'Мальчик' : 'Девочка'}</div></td>
                  <td className="mono" style={{ color: 'var(--text-3)' }}>{c.iin}</td>
                  <td>{groupById(c.group)?.name}</td>
                  <td>{statusBadge('child', c.status)}</td>
                  <td>{fmtDate(c.enrolled_at)}</td>
                  <td className="num">{years}л {rem}м</td>
                  <td className="actions"><IconBtn icon={Icon.More} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="table-footer">
          <div>1–{list.length} из {DATA.children.length}</div>
          <div className="pager">
            <button><Icon.ChevronLeft style={{ width: 12, height: 12 }} /></button>
            <button className="on">1</button>
            <button>2</button>
            <button><Icon.ChevronRight style={{ width: 12, height: 12 }} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== CHILDREN — Create ==============
function ChildCreate({ navigate }) {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <div className="row gap-8 caption" style={{ marginBottom: 6 }}>
            <a className="crumb-link" href="#/children">Дети</a>
            <Icon.ChevronRight style={{ width: 12, height: 12, color: 'var(--text-4)' }} />
            <span>Создать карточку</span>
          </div>
          <h1 className="h1">Новая карточка ребёнка</h1>
        </div>
        <div className="row gap-8">
          <Btn onClick={() => navigate('#/children')}>Отменить</Btn>
          <Btn variant="primary">Создать карточку</Btn>
        </div>
      </div>

      <div className="two-col">
        <Card pad={20}>
          <div className="h3 mb-12">Фото</div>
          <div className="img-ph" style={{ width: 200, height: 200, marginBottom: 14 }}>200 × 200 PHOTO</div>
          <Btn icon={Icon.Upload} block>Загрузить фото</Btn>
          <div className="caption mt-8">JPG/PNG до 5 МБ. Можно добавить позже.</div>
          <div className="divider" />
          <Banner tone="info">Карточку можно создать без ИИН — для перевода из другого садика или офлайн-договора. ИИН можно добавить позже.</Banner>
        </Card>

        <Card pad={20}>
          <div className="h3 mb-12">Основные данные</div>
          <div className="field-row">
            <Field label="Фамилия" required><Input placeholder="Жумабаев" /></Field>
            <Field label="Имя" required><Input placeholder="Алихан" /></Field>
          </div>
          <Field label="Отчество"><Input placeholder="Жанибекович" /></Field>
          <div className="field-row">
            <Field label="Дата рождения" required><Input type="date" /></Field>
            <Field label="Пол"><Select value="m" onChange={() => {}} options={[{value:'m', label:'Мальчик'},{value:'f', label:'Девочка'}]} /></Field>
          </div>
          <Field label="ИИН" hint="12 цифр. Можно оставить пустым."><Input placeholder="000000 000000" /></Field>

          <div className="h3 mb-12 mt-20">Группа</div>
          <Field label="Группа" hint="Назначение может быть изменено позже"><Select value="" onChange={() => {}} options={[{value:'', label:'Не выбрана'}, ...DATA.groups.map(g => ({value: g.id, label: `${g.name} · ${g.kids}/${g.capacity}`}))]} /></Field>

          <div className="h3 mb-12 mt-20">Здоровье</div>
          <Field label="Аллергии"><Textarea rows={2} placeholder="Цитрусовые, орехи..." /></Field>
          <Field label="Медицинские заметки" hint="Хронические заболевания, особенности"><Textarea rows={3} /></Field>
        </Card>
      </div>
    </div>
  );
}

// ============== CHILDREN — Detail ==============
function ChildDetail({ id, navigate }) {
  const child = childById(id) || DATA.children[0];
  const [tab, setTab] = useState('profile');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const toast = useToast();
  const guardians = DATA.guardians[child.id] || DATA.guardians.c1;

  const TABS = [
    { id: 'profile', label: 'Профиль' },
    { id: 'guardians', label: 'Опекуны', count: guardians.length },
    { id: 'group', label: 'Группа и история' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'payments', label: 'Платежи' },
    { id: 'diagnostics', label: 'Диагностика' },
    { id: 'audit', label: 'Статус-история' },
    { id: 'face', label: 'Face ID' },
  ];

  return (
    <div className="page">
      <div className="row gap-8 caption mb-12">
        <a className="crumb-link" href="#/children">Дети</a>
        <Icon.ChevronRight style={{ width: 12, height: 12, color: 'var(--text-4)' }} />
        <span style={{ color: 'var(--text-1)' }}>{child.name}</span>
      </div>

      {child.status === 'archived' && (
        <Banner tone="neutral" title="Карточка в архиве">Карточка переведена в архив {fmtDate(child.archived_at)}. Причина: «{child.archive_reason}». Все поля доступны только для чтения.<br/></Banner>
      )}

      <Card className="mb-16">
        <div style={{ padding: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
          <Avatar name={child.name} kind="child" size="xl" />
          <div className="grow">
            <div className="row gap-8" style={{ alignItems: 'center' }}>
              <h1 className="h1" style={{ margin: 0 }}>{child.name}</h1>
              {statusBadge('child', child.status)}
            </div>
            <div className="caption mt-8" style={{ display: 'flex', gap: 14 }}>
              <span>ИИН: <strong className="mono" style={{ color: 'var(--text-2)' }}>{child.iin}</strong></span>
              <span className="dot-sep" />
              <span>{fmtDate(child.dob)} ({Math.floor((Date.now() - new Date(child.dob).getTime()) / (1000 * 60 * 60 * 24 * 365))} лет)</span>
              <span className="dot-sep" />
              <span>Группа: <strong style={{ color: 'var(--text-2)' }}>{groupById(child.group)?.name}</strong></span>
              <span className="dot-sep" />
              <span>Зачислен: {fmtDate(child.enrolled_at)}</span>
            </div>
          </div>
          <div className="row gap-8">
            <Btn icon={Icon.ArrowRight} onClick={() => setTransferOpen(true)} disabled={child.status === 'archived'}>Перевести в группу</Btn>
            {child.status !== 'archived' ?
              <Btn variant="danger-ghost" icon={Icon.Trash} onClick={() => setArchiveOpen(true)}>В архив</Btn> :
              <Btn variant="primary" icon={Icon.Refresh}>Реактивировать</Btn>
            }
          </div>
        </div>
      </Card>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'profile' && (
        <div className="two-col-right">
          <Card pad={20}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="h3">Основные данные</div>
              <Btn size="sm" icon={Icon.Edit}>Редактировать</Btn>
            </div>
            <div className="divider" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="ФИО"><Input value={child.name} disabled /></Field>
              <Field label="ИИН"><Input value={child.iin} disabled /></Field>
              <Field label="Дата рождения"><Input value={fmtDate(child.dob)} disabled /></Field>
              <Field label="Пол"><Input value={child.sex === 'м' ? 'Мальчик' : 'Девочка'} disabled /></Field>
            </div>
            <div className="h3 mb-12 mt-16">Здоровье</div>
            <Field label="Аллергии"><Textarea value={child.allergies || '—'} rows={2} /></Field>
            <Field label="Медицинские заметки"><Textarea value={child.medical || '—'} rows={3} /></Field>
          </Card>
          <div className="section-stack">
            <Card pad={20}>
              <div className="h3 mb-8">Фото</div>
              <div className="img-ph" style={{ width: '100%', aspectRatio: '1/1' }}>{child.name.toUpperCase()}</div>
            </Card>
            <Card pad={16}>
              <div className="h3 mb-8">Быстрая статистика</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Посещений за месяц</span><strong>18</strong></div>
                <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Опозданий</span><strong>2</strong></div>
                <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Открытых счетов</span><strong>1</strong></div>
                <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Активных опекунов</span><strong>{guardians.filter(g => g.status === 'approved').length}</strong></div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'guardians' && (
        <div>
          <div className="row mb-12" style={{ justifyContent: 'flex-end' }}>
            <Btn variant="primary" icon={Icon.Plus} onClick={() => setGuardianOpen(true)}>Добавить опекуна</Btn>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ФИО / Связь</th><th>Телефон</th><th>Роль</th><th>Статус</th><th>Забор</th><th>Право одобрения</th><th></th>
                </tr>
              </thead>
              <tbody>
                {guardians.map(g => (
                  <tr key={g.id}>
                    <td><div className="row gap-8"><Avatar name={g.name} kind="guardian" /><div><strong>{g.name}</strong><div className="caption">{g.relationship}</div></div></div></td>
                    <td className="mono" style={{ color: 'var(--text-2)' }}>{g.phone}</td>
                    <td><Badge tone={g.role === 'primary' ? 'primary' : g.role === 'nanny' ? 'info' : 'neutral'}>{g.role === 'primary' ? 'Основной' : g.role === 'secondary' ? 'Второй' : 'Няня'}</Badge></td>
                    <td>{statusBadge('guardian', g.status)}</td>
                    <td>{g.can_pickup ? <Icon.Check style={{ width: 16, height: 16, color: 'var(--success)' }} /> : <Icon.X style={{ width: 16, height: 16, color: 'var(--text-4)' }} />}</td>
                    <td>{g.approval ? <Icon.Check style={{ width: 16, height: 16, color: 'var(--success)' }} /> : <Icon.X style={{ width: 16, height: 16, color: 'var(--text-4)' }} />}</td>
                    <td className="actions"><IconBtn icon={Icon.More} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Banner tone="neutral" title="Безопасность">Чтобы отозвать все Identity QR-токены пользователя, используйте кнопку «Отозвать все QR» в меню действий опекуна. После отзыва все попытки скана старых QR будут отклоняться.</Banner>
        </div>
      )}

      {tab === 'group' && (
        <div className="two-col-right">
          <Card pad={20}>
            <div className="h3 mb-16">История переводов</div>
            <div className="timeline">
              <div className="tl-item">
                <div className="tl-dot info"><Icon.ArrowRight style={{ width: 12, height: 12 }} /></div>
                <div className="tl-content">
                  <div className="tl-title">Переведён: <strong>Ботақан</strong> → <strong>Кішкентайлар</strong></div>
                  <div className="tl-meta">{fmtDateTime('2024-09-01T10:00:00')} · Айгуль С. · «Возрастная группа»</div>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-dot info"><Icon.ArrowRight style={{ width: 12, height: 12 }} /></div>
                <div className="tl-content">
                  <div className="tl-title">Зачислен: <strong>Жұлдызшалар</strong> → <strong>Ботақан</strong></div>
                  <div className="tl-meta">{fmtDateTime('2023-09-04T09:30:00')} · Айгуль С.</div>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-dot success"><Icon.Plus style={{ width: 12, height: 12 }} /></div>
                <div className="tl-content">
                  <div className="tl-title">Первичное зачисление в группу <strong>Жұлдызшалар</strong></div>
                  <div className="tl-meta">{fmtDateTime('2022-09-15T10:00:00')} · Айгуль С.</div>
                </div>
              </div>
            </div>
          </Card>
          <Card pad={20}>
            <div className="h3 mb-12">Текущая группа</div>
            <div style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--primary-soft)' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{groupById(child.group)?.name}</div>
              <div className="caption mt-8">Возраст {groupById(child.group)?.age_min}–{groupById(child.group)?.age_max} мес.</div>
              <div className="caption">Воспитатель: <strong>{groupById(child.group)?.mentor}</strong></div>
              <div className="caption">Локация: {groupById(child.group)?.location}</div>
            </div>
            <Btn block icon={Icon.ArrowRight} className="mt-16" onClick={() => setTransferOpen(true)}>Перевести в другую группу</Btn>
          </Card>
        </div>
      )}

      {tab === 'timeline' && (
        <Card>
          <div className="card-header">
            <div className="h3">События ребёнка</div>
            <Select sm value="all" onChange={() => {}} options={[{value:'all', label:'Все события'},{value:'attendance', label:'Посещаемость'},{value:'activity', label:'Активности'},{value:'notes', label:'Заметки'}]} />
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Сегодня, 18 мая</div>
            <div className="timeline mb-16">
              <div className="tl-item"><div className="tl-dot success"><Icon.Check style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">Приход — Face ID</div><div className="tl-meta">08:14 · Жанибек Жумабаев (отец)</div></div></div>
              <div className="tl-item"><div className="tl-dot info"><Icon.Heart style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">Активность: Музыкальное занятие</div><div className="tl-meta">10:00 · 60 мин · Әсем Бакитжанова</div></div></div>
              <div className="tl-item"><div className="tl-dot warning"><Icon.Edit style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">Заметка от Мадины Жакуповой</div><div className="tl-meta">12:40 · «Хорошо поел сегодня, попросил добавки»</div></div></div>
              <div className="tl-item"><div className="tl-dot success"><Icon.Check style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">Уход — OTP-забор</div><div className="tl-meta">18:42 · Зейнеп Калиева (няня)</div></div></div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Вчера, 17 мая</div>
            <div className="timeline">
              <div className="tl-item"><div className="tl-dot success"><Icon.Check style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">Приход — Face ID</div><div className="tl-meta">08:21</div></div></div>
              <div className="tl-item"><div className="tl-dot info"><Icon.Heart style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">Активность: Творческая мастерская</div><div className="tl-meta">10:00 · 90 мин</div></div></div>
              <div className="tl-item"><div className="tl-dot success"><Icon.Check style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">Уход — Face ID</div><div className="tl-meta">17:48 · Айгерим Жумабаева (мать)</div></div></div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'payments' && (
        <Card>
          <div className="card-header">
            <div>
              <div className="h3">Платежи и счета</div>
              <div className="caption">Превью · полная информация в разделе «Биллинг»</div>
            </div>
            <Btn size="sm" iconRight={Icon.ArrowRight} onClick={() => navigate('#/billing/invoices?child=' + child.id)}>Все платежи</Btn>
          </div>
          <table className="table">
            <thead><tr><th>Счёт</th><th>Период</th><th className="num">Сумма</th><th>Статус</th><th>Срок</th></tr></thead>
            <tbody>
              {DATA.invoices.filter(i => i.child === child.id).slice(0, 5).map(inv => (
                <tr key={inv.id}><td className="mono">{inv.id}</td><td>{inv.period}</td><td className="num">{fmtKzt(inv.discounted)}</td><td>{statusBadge('invoice', inv.status)}</td><td>{fmtDate(inv.due)}</td></tr>
              ))}
              {!DATA.invoices.find(i => i.child === child.id) && <tr><td colSpan={5}><Empty title="Счетов пока нет" text="Они появятся после назначения тарифа" /></td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'diagnostics' && (
        <div className="section-stack">
          <Card pad={16}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div><div className="h3">Психолог · Адаптация к саду (v4)</div><div className="caption">Раушан Жанибекова · 12.05.2026</div></div>
              <Btn size="sm" icon={Icon.Eye}>Открыть</Btn>
            </div>
            <div className="row gap-8 mt-12">
              <Badge tone="success">Адаптация: хорошая</Badge>
              <Badge tone="info">Эмоц. фон: стабильный</Badge>
              <Badge tone="neutral">Контакт: средний</Badge>
            </div>
          </Card>
          <Card pad={16}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div><div className="h3">Логопед · Артикуляция (v6)</div><div className="caption">Айжан Кенжебекова · 28.04.2026</div></div>
              <Btn size="sm" icon={Icon.Eye}>Открыть</Btn>
            </div>
          </Card>
        </div>
      )}

      {tab === 'audit' && (
        <Card>
          <div className="card-header">
            <div className="h3">Аудит изменений статуса</div>
          </div>
          <table className="table">
            <thead><tr><th>Дата</th><th>Из</th><th>В</th><th>Кем</th><th>Причина</th></tr></thead>
            <tbody>
              <tr><td>{fmtDateTime('2024-09-02T10:00:00')}</td><td>{statusBadge('child', 'card_created')}</td><td>{statusBadge('child', 'active')}</td><td>Айгуль С.</td><td className="muted">—</td></tr>
              <tr><td>{fmtDateTime('2024-09-01T14:30:00')}</td><td className="muted">—</td><td>{statusBadge('child', 'card_created')}</td><td>Айгуль С.</td><td className="muted">Создание из лида #l7</td></tr>
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'face' && (
        <div className="two-col-right">
          <Card pad={20}>
            <Banner tone="warning" title="Phase C">Face ID — раздел в разработке. Зарегистрировать профиль можно уже сейчас, но фактическое распознавание заработает после развёртывания edge-сервиса.</Banner>
            <div className="h3 mb-12">Биометрический профиль</div>
            <div style={{ padding: 14, background: 'var(--bg-sunken)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, background: 'var(--success-soft)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon.Scan style={{ width: 22, height: 22, color: 'var(--success-fg)' }} />
              </div>
              <div className="grow">
                <div style={{ fontWeight: 600 }}>Профиль зарегистрирован</div>
                <div className="caption">Активное согласие № F-0921 · 14.09.2024</div>
              </div>
              <Btn size="sm" onClick={() => navigate('#/face')}>Перейти в раздел</Btn>
            </div>
          </Card>
          <Card pad={20}>
            <div className="h3 mb-12">Согласия</div>
            <div className="caption">Активное согласие на обработку биометрических данных — на руках у садика, скан загружен.</div>
            <Btn block icon={Icon.Eye} className="mt-12">Открыть скан</Btn>
          </Card>
        </div>
      )}

      <Modal open={archiveOpen} onClose={() => setArchiveOpen(false)} title="Архивировать карточку"
        footer={<><Btn onClick={() => setArchiveOpen(false)}>Отменить</Btn><Btn variant="danger" onClick={() => { setArchiveOpen(false); toast({ tone: 'success', title: 'Карточка отправлена в архив', body: 'Тарифы будут закрыты, инициирован перерасчёт.' }); }} disabled={archiveReason.length < 1}>Архивировать</Btn></>}>
        <Banner tone="danger">
          <strong>Это необратимое действие.</strong> Все активные тарифы будут закрыты, а излишне оплаченные дни автоматически отправлены в очередь на возврат (требует ручной обработки в разделе «Возвраты»). Реактивировать карточку можно позже, но прежние назначения тарифов не восстановятся.
        </Banner>
        <Field label="Причина архива" required hint={`${archiveReason.length} / 500`}>
          <Textarea value={archiveReason} onChange={setArchiveReason} placeholder="Например: переезд семьи в другой город" rows={4} />
        </Field>
      </Modal>

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Перевести в группу"
        footer={<><Btn onClick={() => setTransferOpen(false)}>Отменить</Btn><Btn variant="primary" onClick={() => { setTransferOpen(false); toast({ tone: 'success', title: 'Ребёнок переведён', body: 'История переводов обновлена.' }); }}>Перевести</Btn></>}>
        <Field label="Новая группа" required>
          <Select value="" onChange={() => {}} options={DATA.groups.filter(g => g.id !== child.group).map(g => ({ value: g.id, label: `${g.name} · ${g.kids}/${g.capacity} мест` }))} />
        </Field>
        <Field label="Причина" hint="Помогает менторам понять контекст"><Textarea rows={3} placeholder="Возрастная группа / по запросу родителей / ..." /></Field>
      </Modal>

      <Modal open={guardianOpen} onClose={() => setGuardianOpen(false)} title="Добавить опекуна"
        footer={<><Btn onClick={() => setGuardianOpen(false)}>Отменить</Btn><Btn variant="primary" onClick={() => { setGuardianOpen(false); toast({ tone: 'success', title: 'Опекун добавлен', body: 'Ему будет отправлен SMS-код для подтверждения.' }); }}>Добавить</Btn></>}>
        <Field label="ФИО" required><Input placeholder="Иванова Айгерим Болатовна" /></Field>
        <Field label="Телефон" required><Input placeholder="+7 ___ ___ __ __" icon={Icon.Phone} /></Field>
        <div className="field-row">
          <Field label="Связь с ребёнком"><Select value="mother" onChange={() => {}} options={[{value:'mother', label:'Мать'},{value:'father', label:'Отец'},{value:'grandparent', label:'Бабушка/дедушка'},{value:'other', label:'Другая родственная связь'},{value:'nanny', label:'Няня'}]} /></Field>
          <Field label="Роль"><Select value="secondary" onChange={() => {}} options={[{value:'primary', label:'Основной'},{value:'secondary', label:'Второй'},{value:'nanny', label:'Няня'}]} /></Field>
        </div>
        <div className="row gap-16 mt-8">
          <Toggle on={true} label="Может забирать ребёнка" />
        </div>
      </Modal>
    </div>
  );
}

// ============== ENROLLMENTS — Kanban ==============
function EnrollmentsKanban({ navigate }) {
  const cols = [
    { id: 'new', title: 'Новая заявка', tone: 'info' },
    { id: 'in_processing', title: 'В обработке', tone: 'warning' },
    { id: 'waitlist', title: 'Лист ожидания', tone: 'warning' },
    { id: 'card_created', title: 'Создана карточка', tone: 'success' },
    { id: 'cancelled', title: 'Отменён', tone: 'neutral' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Лиды</h1>
          <div className="page-sub">Воронка зачисления · {DATA.leads.length} активных лидов</div>
        </div>
        <div className="row gap-8">
          <div className="lang-toggle">
            <button className="on">Канбан</button>
            <button>Таблица</button>
          </div>
          <Btn icon={Icon.Search}>Поиск</Btn>
          <Btn variant="primary" icon={Icon.Plus}>Создать лид</Btn>
        </div>
      </div>

      <div className="kanban">
        {cols.map(c => {
          const list = DATA.leads.filter(l => l.status === c.id);
          return (
            <div key={c.id} className="kanban-col">
              <div className="kanban-col-header">
                <Badge tone={c.tone} withDot={false}>{c.title}</Badge>
                <span className="count">{list.length}</span>
                <div style={{ flex: 1 }} />
                <IconBtn icon={Icon.Plus} />
              </div>
              <div className="kanban-col-body">
                {list.length === 0 && <div className="caption" style={{ textAlign: 'center', padding: 20 }}>Пусто</div>}
                {list.map(lead => (
                  <div key={lead.id} className="lead-card" onClick={() => navigate(`#/enrollments/${lead.id}`)}>
                    <div className="name">{lead.child_name}</div>
                    <div className="caption" style={{ marginTop: 4 }}>{fmtDate(lead.dob)} · {Math.floor((Date.now() - new Date(lead.dob).getTime()) / (1000*60*60*24*30.4))} мес</div>
                    <div className="caption mt-8">
                      <div><strong style={{ color: 'var(--text-2)' }}>{lead.contact_name}</strong></div>
                      <div className="mono" style={{ marginTop: 2 }}>{lead.phone}</div>
                    </div>
                    <div className="meta">
                      <Badge tone="neutral" withDot={false}>{lead.source}</Badge>
                      <div className="row gap-8">
                        {lead.assigned ? <Avatar name={lead.assigned} kind="admin" /> : <span className="caption">—</span>}
                        <span className="since">{lead.since}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============== ENROLLMENT — Detail ==============
function EnrollmentDetail({ id, navigate }) {
  const lead = DATA.leads.find(l => l.id === id) || DATA.leads[0];
  const [createOpen, setCreateOpen] = useState(false);
  const toast = useToast();

  return (
    <div className="page">
      <div className="row gap-8 caption mb-12">
        <a className="crumb-link" href="#/enrollments">Лиды</a>
        <Icon.ChevronRight style={{ width: 12, height: 12, color: 'var(--text-4)' }} />
        <span style={{ color: 'var(--text-1)' }}>{lead.child_name}</span>
      </div>
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">{lead.child_name}</h1>
          <div className="row gap-8 mt-8">
            {statusBadge('lead', lead.status)}
            <span className="caption">Источник: <strong style={{ color: 'var(--text-2)' }}>{lead.source}</strong></span>
            <span className="dot-sep" />
            <span className="caption">Ответственный: <strong style={{ color: 'var(--text-2)' }}>{lead.assigned || 'не назначен'}</strong></span>
          </div>
        </div>
        <div className="row gap-8">
          <Select value="" onChange={() => {}} options={[{value:'', label:'Сменить статус'},{value:'in_processing', label:'В обработку'},{value:'waitlist', label:'Лист ожидания'},{value:'cancelled', label:'Отменить'}]} />
          <Btn variant="primary" icon={Icon.CheckCircle} onClick={() => setCreateOpen(true)}>Создать карточку</Btn>
        </div>
      </div>

      <div className="two-col-right">
        <div className="section-stack">
          <Card pad={20}>
            <div className="h3 mb-12">Данные ребёнка</div>
            <div className="field-row">
              <Field label="ФИО ребёнка" required><Input value={lead.child_name} onChange={() => {}} /></Field>
              <Field label="Дата рождения" required><Input value={fmtDate(lead.dob)} /></Field>
            </div>
            <div className="field-row">
              <Field label="Желаемая группа"><Select value="g1" onChange={() => {}} options={DATA.groups.map(g => ({value:g.id, label:`${g.name} · ${g.kids}/${g.capacity}`}))} /></Field>
              <Field label="Желаемая дата начала"><Input type="date" /></Field>
            </div>
          </Card>

          <Card pad={20}>
            <div className="h3 mb-12">Основной законный представитель</div>
            <div className="field-row">
              <Field label="ФИО" required><Input value={lead.contact_name} onChange={() => {}} /></Field>
              <Field label="Связь с ребёнком" required><Select value="mother" onChange={() => {}} options={[{value:'mother', label:'Мать'},{value:'father', label:'Отец'},{value:'guardian', label:'Опекун'}]} /></Field>
            </div>
            <Field label="Телефон" required><Input value={lead.phone} onChange={() => {}} icon={Icon.Phone} /></Field>
            <Field label="Email"><Input placeholder="email@example.com" icon={Icon.Mail} /></Field>
          </Card>

          <Card pad={20}>
            <div className="h3 mb-12">Заметки</div>
            <Textarea rows={4} placeholder="Особенности, пожелания, контекст разговора..." />
          </Card>
        </div>

        <div className="section-stack">
          <Card pad={16}>
            <div className="h3 mb-12">Ответственный</div>
            <div className="row gap-8">
              <Avatar name={lead.assigned || 'НА'} kind="admin" />
              <div className="grow">
                <div style={{ fontSize: 13, fontWeight: 600 }}>{lead.assigned || 'Не назначен'}</div>
                <div className="caption">Администратор</div>
              </div>
              <IconBtn icon={Icon.Edit} />
            </div>
          </Card>
          <Card>
            <div className="card-header"><div className="h3">Лог статусов</div></div>
            <div style={{ padding: 16 }}>
              <div className="timeline">
                <div className="tl-item"><div className="tl-dot warning"><Icon.Funnel style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">{statusBadge('lead', 'new')} → {statusBadge('lead', 'in_processing')}</div><div className="tl-meta">Айгуль С. · 15.05.2026 11:24 · «Перезвонила, договорились на встречу»</div></div></div>
                <div className="tl-item"><div className="tl-dot info"><Icon.Plus style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">Лид создан</div><div className="tl-meta">Авто (форма с сайта) · 14.05.2026 19:08</div></div></div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Создать карточку ребёнка"
        footer={<><Btn onClick={() => setCreateOpen(false)}>Отменить</Btn><Btn variant="primary" onClick={() => { setCreateOpen(false); toast({ tone: 'success', title: 'Карточка создана', body: 'Создан ребёнок, основной опекун и первый счёт.' }); }}>Создать карточку и счёт</Btn></>}>
        <Banner tone="info">При создании карточки автоматически будет:
          <ul style={{ margin: '6px 0 0 18px', paddingLeft: 0 }}>
            <li>Создан профиль ребёнка</li>
            <li>Добавлен основной законный представитель</li>
            <li>Сгенерирован первый счёт по выбранному тарифу</li>
            <li>Лиду присвоен статус «Создана карточка»</li>
          </ul>
        </Banner>
        <Field label="Назначить тариф" required>
          <Select value="t1" onChange={() => {}} options={DATA.tariffs.filter(t => t.type === 'monthly_base').map(t => ({value:t.id, label:`${t.name} · ${fmtKzt(t.amount)}/мес`}))} />
        </Field>
        <Field label="Дата начала действия тарифа" required><Input type="date" /></Field>
      </Modal>
    </div>
  );
}

// ============== GROUPS ==============
function GroupsList({ navigate }) {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Группы</h1>
          <div className="page-sub">{DATA.groups.length} активных групп · {DATA.groups.reduce((s,g)=>s+g.kids,0)} детей</div>
        </div>
        <Btn variant="primary" icon={Icon.Plus}>Создать группу</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {DATA.groups.map(g => {
          const pct = (g.kids / g.capacity) * 100;
          const tone = g.kids > g.capacity ? 'danger' : pct > 85 ? 'warning' : '';
          return (
            <div key={g.id} className="group-card" onClick={() => navigate(`#/groups/${g.id}`)}>
              <div className="gc-top">
                <div>
                  <div className="gc-name">{g.name}</div>
                  <div className="gc-age">Возраст {g.age_min}–{g.age_max} мес.</div>
                </div>
                {g.kids > g.capacity && <Badge tone="danger">Переполнение</Badge>}
                {g.kids === g.capacity && <Badge tone="warning">Заполнена</Badge>}
              </div>
              <div className="gc-cap">
                <div className="gc-cap-label">
                  <span>{g.kids} / {g.capacity} детей</span>
                  <span>{Math.round(pct)}%</span>
                </div>
                <div className="cap-bar"><div className={cx('cap-fill', tone)} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
              </div>
              <div className="gc-mentor">
                <Avatar name={g.mentor} kind="staff" />
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{g.mentor}</div>
                  <div style={{ fontSize: 11 }}>Воспитатель · {g.location}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GroupDetail({ id, navigate }) {
  const g = groupById(id) || DATA.groups[0];
  const [tab, setTab] = useState('overview');
  const kids = DATA.children.filter(c => c.group === g.id && c.status === 'active');
  return (
    <div className="page">
      <div className="row gap-8 caption mb-12">
        <a className="crumb-link" href="#/groups">Группы</a>
        <Icon.ChevronRight style={{ width: 12, height: 12, color: 'var(--text-4)' }} />
        <span style={{ color: 'var(--text-1)' }}>{g.name}</span>
      </div>

      <Card className="mb-16">
        <div style={{ padding: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.Layers style={{ width: 32, height: 32, color: 'var(--primary-fg)' }} />
          </div>
          <div className="grow">
            <div className="row gap-8">
              <h1 className="h1" style={{ margin: 0 }}>{g.name}</h1>
              <Badge tone="success">Активна</Badge>
            </div>
            <div className="caption mt-8" style={{ display: 'flex', gap: 14 }}>
              <span>Возраст: <strong style={{ color: 'var(--text-2)' }}>{g.age_min}–{g.age_max} мес.</strong></span>
              <span className="dot-sep" />
              <span>Вместимость: <strong style={{ color: 'var(--text-2)' }}>{g.kids}/{g.capacity}</strong></span>
              <span className="dot-sep" />
              <span>Локация: <strong style={{ color: 'var(--text-2)' }}>{g.location}</strong></span>
            </div>
          </div>
          <div className="row gap-8">
            <Btn icon={Icon.Edit}>Редактировать</Btn>
            <Btn variant="danger-ghost">Деактивировать</Btn>
          </div>
        </div>
      </Card>

      <Tabs tabs={[
        { id: 'overview', label: 'Обзор' },
        { id: 'mentors', label: 'Воспитатели', count: 2 },
        { id: 'children', label: 'Дети', count: kids.length },
        { id: 'history', label: 'История воспитателей' },
      ]} value={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="two-col-right">
          <Card pad={20}>
            <div className="h3 mb-12">Параметры группы</div>
            <div className="field-row">
              <Field label="Название" required><Input value={g.name} /></Field>
              <Field label="Локация"><Select value="loc3" onChange={() => {}} options={DATA.locations.map(l => ({value:l.id, label:l.name}))} /></Field>
            </div>
            <div className="field-row">
              <Field label="Возраст min (мес.)"><Input value={g.age_min} /></Field>
              <Field label="Возраст max (мес.)"><Input value={g.age_max} /></Field>
            </div>
            <Field label="Вместимость" hint="Максимальное число детей в группе"><Input value={g.capacity} /></Field>
          </Card>
          <Card pad={16}>
            <div className="h3 mb-12">Заполненность</div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>{g.kids} <span style={{ fontSize: 18, color: 'var(--text-3)', fontWeight: 500 }}>/ {g.capacity}</span></div>
            <div className="cap-bar mt-8"><div className="cap-fill" style={{ width: `${(g.kids/g.capacity)*100}%` }} /></div>
            <div className="caption mt-8">{g.kids === g.capacity ? 'Группа полностью заполнена' : `${g.capacity - g.kids} свободных мест`}</div>
          </Card>
        </div>
      )}

      {tab === 'mentors' && (
        <Card>
          <div className="card-header">
            <div className="h3">Воспитатели группы</div>
            <Btn size="sm" icon={Icon.Plus}>Назначить воспитателя</Btn>
          </div>
          <table className="table">
            <thead><tr><th>ФИО</th><th>Роль</th><th>Назначен</th><th></th></tr></thead>
            <tbody>
              <tr>
                <td><div className="row gap-8"><Avatar name={g.mentor} kind="staff" /><strong>{g.mentor}</strong></div></td>
                <td><Badge tone="primary">Основной воспитатель</Badge></td>
                <td>{fmtDate('2023-09-04')}</td>
                <td className="actions"><IconBtn icon={Icon.More} /></td>
              </tr>
              <tr>
                <td><div className="row gap-8"><Avatar name="Зарина Кенжебекова" kind="staff" /><strong>Зарина Кенжебекова</strong></div></td>
                <td><Badge tone="neutral">Ассистент</Badge></td>
                <td>{fmtDate('2024-01-12')}</td>
                <td className="actions"><IconBtn icon={Icon.More} /></td>
              </tr>
            </tbody>
          </table>
          <Banner tone="neutral" title="Правила">У группы должен быть ровно один основной воспитатель. Один воспитатель может быть закреплён только за одной активной группой.</Banner>
        </Card>
      )}

      {tab === 'children' && (
        <Card>
          <div className="card-header">
            <div className="h3">Дети группы</div>
            <Input sm icon={Icon.Search} placeholder="Поиск" />
          </div>
          <table className="table">
            <thead><tr><th></th><th>ФИО</th><th>Возраст</th><th>Зачислен</th><th>Статус</th></tr></thead>
            <tbody>
              {kids.map(c => (
                <tr key={c.id} onClick={() => navigate(`#/children/${c.id}`)}>
                  <td><Avatar name={c.name} kind="child" /></td>
                  <td><strong>{c.name}</strong></td>
                  <td>{Math.floor((Date.now() - new Date(c.dob).getTime()) / (1000*60*60*24*365))} лет</td>
                  <td>{fmtDate(c.enrolled_at)}</td>
                  <td>{statusBadge('child', c.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'history' && (
        <Card pad={20}>
          <div className="h3 mb-16">История назначений</div>
          <div className="timeline">
            <div className="tl-item"><div className="tl-dot success"><Icon.Star style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">{g.mentor} → стала <strong>основным воспитателем</strong></div><div className="tl-meta">04.09.2023 · до настоящего времени</div></div></div>
            <div className="tl-item"><div className="tl-dot info"><Icon.Plus style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">Зарина Кенжебекова — назначена ассистентом</div><div className="tl-meta">12.01.2024 · до настоящего времени</div></div></div>
            <div className="tl-item"><div className="tl-dot danger"><Icon.X style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">Бекзат Талгатова — снята</div><div className="tl-meta">10.08.2023 · была основным воспитателем · причина: увольнение</div></div></div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============== STAFF ==============
function StaffList({ navigate }) {
  const [filter, setFilter] = useState({ role: 'all', active: 'all', spec: 'all' });
  const [createOpen, setCreateOpen] = useState(false);
  const list = DATA.staff.filter(s => {
    if (filter.role !== 'all' && s.role !== filter.role) return false;
    if (filter.active !== 'all' && s.status !== filter.active) return false;
    if (filter.spec !== 'all' && s.spec !== filter.spec) return false;
    return true;
  });
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Сотрудники</h1>
          <div className="page-sub">{DATA.staff.filter(s => s.status === 'active').length} активных · {DATA.staff.filter(s => s.role === 'mentor').length} воспитателей · {DATA.staff.filter(s => s.role === 'specialist').length} специалистов</div>
        </div>
        <Btn variant="primary" icon={Icon.Plus} onClick={() => setCreateOpen(true)}>Добавить сотрудника</Btn>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div style={{ width: 240 }}><Input sm icon={Icon.Search} placeholder="Поиск по ФИО или телефону" /></div>
          <Select sm value={filter.role} onChange={(v) => setFilter(f => ({...f, role:v}))} options={[{value:'all', label:'Все роли'},{value:'admin', label:'Администраторы'},{value:'mentor', label:'Воспитатели'},{value:'specialist', label:'Специалисты'},{value:'reception', label:'Ресепшн'}]} />
          <Select sm value={filter.active} onChange={(v) => setFilter(f => ({...f, active:v}))} options={[{value:'all', label:'Все статусы'},{value:'active', label:'Активные'},{value:'inactive', label:'Неактивные'}]} />
          <Select sm value={filter.spec} onChange={(v) => setFilter(f => ({...f, spec:v}))} options={[{value:'all', label:'Все специальности'},{value:'psychologist', label:'Психолог'},{value:'speech_therapist', label:'Логопед'},{value:'music_teacher', label:'Музыка'}]} />
          <div className="spacer" />
          <Btn size="sm" icon={Icon.Download}>Экспорт</Btn>
        </div>
        <table className="table">
          <thead><tr><th></th><th>ФИО</th><th>Телефон</th><th>Роль</th><th>Специальность</th><th>Группы</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id} onClick={() => navigate(`#/staff/${s.id}`)} className={s.status === 'inactive' ? 'archived' : ''}>
                <td><Avatar name={s.name} kind={s.role === 'admin' ? 'admin' : 'staff'} /></td>
                <td><strong>{s.name}</strong></td>
                <td className="mono" style={{ color: 'var(--text-3)' }}>{s.phone}</td>
                <td><Badge tone={s.role === 'admin' ? 'primary' : 'neutral'}>{roleLabel(s.role)}</Badge></td>
                <td>{s.spec ? specLabel(s.spec) : <span className="muted">—</span>}</td>
                <td>{s.groups.length ? s.groups.map(gid => <Badge key={gid} tone="info" size="sm">{groupById(gid)?.name}{s.primary?.includes(gid) && ' ★'}</Badge>) : <span className="muted">—</span>}</td>
                <td>{statusBadge('staff', s.status)}</td>
                <td className="actions"><IconBtn icon={Icon.More} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footer">
          <div>1–{list.length} из {DATA.staff.length}</div>
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Добавить сотрудника" size="lg"
        footer={<><Btn onClick={() => setCreateOpen(false)}>Отменить</Btn><Btn variant="primary">Добавить сотрудника</Btn></>}>
        <Banner tone="info">Сотрудник сможет войти в приложение Shyraq Staff по своему номеру через SMS-код. Отдельное приглашение или ссылка не нужны — отправим welcome-SMS автоматически.</Banner>
        <div className="field-row">
          <Field label="ФИО" required><Input placeholder="Бекова Сауле Маратовна" /></Field>
          <Field label="Телефон" required><Input placeholder="+7 ___ ___ __ __" icon={Icon.Phone} /></Field>
        </div>
        <div className="field-row">
          <Field label="Роль" required><Select value="mentor" onChange={() => {}} options={[{value:'admin', label:'Администратор'},{value:'mentor', label:'Воспитатель'},{value:'specialist', label:'Специалист'},{value:'reception', label:'Ресепшн'}]} /></Field>
          <Field label="Дата найма"><Input type="date" /></Field>
        </div>
        <Field label="Группа" hint="Для воспитателя — закрепляется за группой; первый назначенный — основной">
          <Select value="" onChange={() => {}} options={[{value:'', label:'Не назначать'}, ...DATA.groups.map(g => ({value:g.id, label:`${g.name} · ${g.kids}/${g.capacity}`}))]} />
        </Field>
      </Modal>
    </div>
  );
}

function StaffDetail({ id, navigate }) {
  const s = staffById(id) || DATA.staff[1];
  return (
    <div className="page">
      <div className="row gap-8 caption mb-12">
        <a className="crumb-link" href="#/staff">Сотрудники</a>
        <Icon.ChevronRight style={{ width: 12, height: 12, color: 'var(--text-4)' }} />
        <span style={{ color: 'var(--text-1)' }}>{s.name}</span>
      </div>
      <Card className="mb-16">
        <div style={{ padding: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
          <Avatar name={s.name} kind="staff" size="xl" />
          <div className="grow">
            <div className="row gap-8"><h1 className="h1" style={{ margin: 0 }}>{s.name}</h1>{statusBadge('staff', s.status)}<Badge tone="primary">{roleLabel(s.role)}</Badge></div>
            <div className="caption mt-8" style={{ display: 'flex', gap: 14 }}>
              <span className="mono" style={{ color: 'var(--text-2)' }}>{s.phone}</span>
              <span className="dot-sep" />
              <span>{s.spec ? specLabel(s.spec) : roleLabel(s.role)}</span>
              <span className="dot-sep" />
              <span>В саду с {fmtDate(s.hired_at)}</span>
            </div>
          </div>
          <div className="row gap-8">
            <Btn icon={Icon.Edit}>Редактировать</Btn>
            <Btn variant="danger-ghost" icon={Icon.QR}>Отозвать все QR</Btn>
            {s.status === 'active' ? <Btn variant="danger-ghost">Деактивировать</Btn> : <Btn variant="primary">Активировать</Btn>}
          </div>
        </div>
      </Card>

      <div className="two-col-right">
        <Card pad={20}>
          <div className="h3 mb-12">Профиль</div>
          <div className="field-row">
            <Field label="ФИО"><Input value={s.name} /></Field>
            <Field label="Телефон"><Input value={s.phone} /></Field>
          </div>
          <div className="field-row">
            <Field label="Роль"><Select value={s.role} onChange={() => {}} options={[{value:'admin', label:'Администратор'},{value:'mentor', label:'Воспитатель'},{value:'specialist', label:'Специалист'},{value:'reception', label:'Ресепшн'}]} /></Field>
            {s.role === 'specialist' && <Field label="Специальность"><Select value={s.spec} onChange={() => {}} options={[{value:'psychologist', label:'Психолог'},{value:'speech_therapist', label:'Логопед'},{value:'music_teacher', label:'Музыка'},{value:'physical_ed', label:'Физкультура'},{value:'nutritionist', label:'Диетолог'}]} /></Field>}
          </div>
          <div className="field-row">
            <Field label="Принят на работу"><Input type="date" value={s.hired_at} /></Field>
            <Field label="Уволен"><Input type="date" placeholder="—" /></Field>
          </div>
        </Card>

        <Card>
          <div className="card-header"><div className="h3">{s.role === 'mentor' ? 'Назначения групп' : 'Группы'}</div>{s.role === 'mentor' && <Btn size="sm" icon={Icon.Plus}>Назначить</Btn>}</div>
          {s.groups.length === 0 ? (
            <Empty icon={Icon.Layers} title="Не закреплён за группой" text={s.role === 'mentor' ? 'Назначьте сотрудника на группу — первый назначенный становится основным.' : 'Этой роли группы не нужны.'} />
          ) : (
            <table className="table">
              <thead><tr><th>Группа</th><th>Статус</th><th>С</th></tr></thead>
              <tbody>
                {s.groups.map(gid => (
                  <tr key={gid}><td><strong>{groupById(gid)?.name}</strong></td><td>{s.primary?.includes(gid) ? <Badge tone="primary">Основной ★</Badge> : <Badge tone="neutral">Ассистент</Badge>}</td><td>{fmtDate(s.hired_at)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, {
  Dashboard, ChildrenList, ChildCreate, ChildDetail,
  EnrollmentsKanban, EnrollmentDetail,
  GroupsList, GroupDetail,
  StaffList, StaffDetail,
});
