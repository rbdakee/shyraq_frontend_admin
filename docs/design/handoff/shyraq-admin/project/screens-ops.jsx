// screens-ops.jsx — Requests, Attendance, Content, Schedule, Meals, Structure, Diagnostics, Face, DLQ, Settings, Profile

// ============== PARENT REQUESTS list ==============
function RequestsList({ navigate }) {
  const [filter, setFilter] = useState({ status: 'all', type: 'all' });
  const list = DATA.requests.filter(r => {
    if (filter.status !== 'all' && r.status !== filter.status) return false;
    if (filter.type !== 'all' && r.type !== filter.type) return false;
    return true;
  });
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Заявки родителей</h1>
          <div className="page-sub">{DATA.requests.filter(r => r.status === 'pending').length} требуют решения</div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div style={{ width: 240 }}><Input sm icon={Icon.Search} placeholder="Поиск по ребёнку или родителю" /></div>
          <Select sm value={filter.status} onChange={(v) => setFilter(f => ({...f, status:v}))} options={[{value:'all', label:'Все статусы'},{value:'pending', label:'Ожидают'},{value:'accepted', label:'Приняты'},{value:'rejected', label:'Отклонены'},{value:'cancelled', label:'Отменены'}]} />
          <Select sm value={filter.type} onChange={(v) => setFilter(f => ({...f, type:v}))} options={[{value:'all', label:'Все типы'},{value:'late_pickup', label:'Поздний забор'},{value:'vacation', label:'Отпуск'},{value:'day_off', label:'Выходной в саду'},{value:'trusted_person', label:'Доверенное лицо'},{value:'open_request', label:'Открытое обращение'}]} />
          <div className="spacer" />
        </div>
        <table className="table">
          <thead><tr><th>Тип</th><th>Ребёнок</th><th>От родителя</th><th>Детали</th><th>Статус</th><th>Дата</th><th></th></tr></thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id} onClick={() => navigate(`#/requests/${r.id}`)}>
                <td><Badge tone={reqTypeTone(r.type)}>{reqTypeLabel(r.type)}</Badge></td>
                <td><div className="row gap-8"><Avatar name={childById(r.child)?.name || '?'} kind="child" /><strong>{childById(r.child)?.name}</strong></div></td>
                <td>{r.parent}</td>
                <td className="caption" style={{ maxWidth: 320 }}>{r.details}</td>
                <td>{statusBadge('request', r.status)}</td>
                <td>{fmtDate(r.date)}</td>
                <td className="actions"><IconBtn icon={Icon.More} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footer">
          <div>Показано: {list.length}</div>
          <Btn size="sm">Загрузить ещё</Btn>
        </div>
      </div>
    </div>
  );
}

// ============== PARENT REQUEST detail ==============
function RequestDetail({ id, navigate }) {
  const r = DATA.requests.find(x => x.id === id) || DATA.requests[0];
  const child = childById(r.child);
  const toast = useToast();
  const [reply, setReply] = useState('');

  return (
    <div className="page">
      <div className="row gap-8 caption mb-12">
        <a className="crumb-link" href="#/requests">Заявки родителей</a>
        <Icon.ChevronRight style={{ width: 12, height: 12, color: 'var(--text-4)' }} />
        <span style={{ color: 'var(--text-1)' }}>{reqTypeLabel(r.type)}</span>
      </div>

      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">{reqTypeLabel(r.type)}</h1>
          <div className="row gap-8 mt-8">
            {statusBadge('request', r.status)}
            <span className="caption">От: <strong style={{ color: 'var(--text-2)' }}>{r.parent}</strong></span>
            <span className="dot-sep" />
            <span className="caption">{fmtDate(r.date)}</span>
          </div>
        </div>
        {r.status === 'pending' && (
          <div className="row gap-8">
            <Btn variant="danger-ghost" onClick={() => toast({ tone: 'success', title: 'Заявка отклонена' })}>Отклонить</Btn>
            <Btn variant="primary" icon={Icon.CheckCircle} onClick={() => toast({ tone: 'success', title: 'Заявка принята', body: r.type === 'late_pickup' ? 'Создан счёт за поздний забор' : null })}>Принять</Btn>
          </div>
        )}
      </div>

      <div className="two-col-right">
        <div className="section-stack">
          <Card pad={20}>
            <div className="h3 mb-12">Детали заявки</div>
            <div style={{ padding: 14, background: 'var(--bg-sunken)', borderRadius: 10 }}>
              <div className="caption" style={{ marginBottom: 6 }}>Описание родителя:</div>
              <div style={{ fontSize: 14, lineHeight: 1.5 }}>{r.details}</div>
            </div>

            {r.type === 'late_pickup' && (
              <Banner tone="warning" className="mt-12" title="Будет создан счёт">При принятии заявки автоматически создастся счёт «Поздний забор» на 5 000 ₸ согласно настройкам садика.</Banner>
            )}
            {r.type === 'vacation' && (
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px 16px', marginTop: 14, fontSize: 13.5 }}>
                <div className="muted">Период</div><div><strong>20.05.2026 — 02.06.2026</strong> (14 дней)</div>
                <div className="muted">Тип</div><div>Vacation — ребёнок не ходит в сад</div>
                <div className="muted">Влияние на тариф</div><div>Перерасчёт по pro-rata</div>
              </div>
            )}
            {r.type === 'trusted_person' && (
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px 16px', marginTop: 14, fontSize: 13.5 }}>
                <div className="muted">ФИО</div><div><strong>Сабина Болатовна</strong></div>
                <div className="muted">Телефон</div><div className="mono">+7 707 123 45 67</div>
                <div className="muted">Связь</div><div>Тётя</div>
                <div className="muted">Действует</div><div>Только пятница, 22.05.2026</div>
                <div className="muted">Документ</div><div><Btn size="sm" icon={Icon.Eye}>Открыть скан</Btn></div>
              </div>
            )}
          </Card>

          <Card>
            <div className="card-header"><div className="h3">Переписка</div></div>
            <div className="thread">
              <div className="msg parent">
                <div className="msg-meta">{r.parent} · 17.05 09:14</div>
                {r.details}
              </div>
              <div className="msg admin">
                <div className="msg-meta">Айгуль С. · 17.05 09:32</div>
                Добрый день! Зафиксировали ваш запрос, проверяю и отвечу в течение часа.
              </div>
              <div className="msg parent">
                <div className="msg-meta">{r.parent} · 17.05 09:35</div>
                Спасибо! Если нужно, могу позвонить.
              </div>
            </div>
            <div className="composer">
              <Input value={reply} onChange={setReply} placeholder="Написать сообщение..." />
              <IconBtn icon={Icon.Upload} title="Прикрепить файл" />
              <Btn variant="primary" disabled={!reply}>Отправить</Btn>
            </div>
          </Card>
        </div>

        <div className="section-stack">
          <Card pad={16}>
            <div className="h3 mb-8">Ребёнок</div>
            <div className="row gap-12" onClick={() => navigate(`#/children/${r.child}`)} style={{ cursor: 'pointer' }}>
              <Avatar name={child?.name || '?'} kind="child" size="lg" />
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{child?.name}</div>
                <div className="caption">{groupById(child?.group)?.name}</div>
              </div>
              <Icon.ChevronRight style={{ width: 14, height: 14, color: 'var(--text-4)' }} />
            </div>
          </Card>
          <Card pad={16}>
            <div className="h3 mb-8">Получатель заявки</div>
            <div style={{ fontSize: 13 }}>Воспитатель: <strong>{groupById(child?.group)?.mentor}</strong></div>
            <div className="caption mt-8">Заявку также видит администрация садика.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============== ATTENDANCE ==============
function AttendanceJournal({ navigate, query }) {
  const tab = query?.tab || 'journal';
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Посещаемость</h1>
          <div className="page-sub">Журнал check-in/out · сегодня, 18 мая 2026</div>
        </div>
      </div>

      <Tabs tabs={[
        { id: 'journal', label: 'Журнал' },
        { id: 'daily', label: 'Дневной статус', count: 76 },
      ]} value={tab} onChange={(t) => navigate(`#/attendance?tab=${t}`)} />

      {tab === 'journal' && (
        <div className="table-wrap">
          <div className="table-toolbar">
            <div style={{ width: 240 }}><Input sm icon={Icon.Search} placeholder="Поиск по ребёнку" /></div>
            <Select sm value="all" onChange={() => {}} options={[{value:'all', label:'Все методы'},{value:'face_id', label:'Face ID'},{value:'manual', label:'Вручную'},{value:'otp_pickup', label:'OTP-забор'}]} />
            <Select sm value="today" onChange={() => {}} options={[{value:'today', label:'Сегодня'},{value:'yesterday', label:'Вчера'},{value:'week', label:'Эта неделя'}]} />
            <div className="spacer" />
            <Btn size="sm" icon={Icon.Download}>Экспорт</Btn>
          </div>
          <table className="table">
            <thead><tr><th>Время</th><th>Ребёнок</th><th>Событие</th><th>Метод</th><th>Кто</th><th>Заметка</th><th></th></tr></thead>
            <tbody>
              {DATA.attendance.map(a => (
                <tr key={a.id}>
                  <td className="mono">{a.date.slice(11, 16)}</td>
                  <td><div className="row gap-8"><Avatar name={childById(a.child)?.name || '?'} kind="child" /><strong>{childById(a.child)?.name}</strong></div></td>
                  <td>{a.type === 'check_in' ? <Badge tone="success">Приход</Badge> : <Badge tone="info">Уход</Badge>}</td>
                  <td>{methodLabel(a.method)}</td>
                  <td className="caption">{a.by}</td>
                  <td className="muted">—</td>
                  <td className="actions"><IconBtn icon={Icon.Edit} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'daily' && (
        <>
          <div className="row gap-8 mb-16">
            <Input type="date" sm />
            <Select sm value="all" onChange={() => {}} options={[{value:'all', label:'Все группы'}, ...DATA.groups.map(g => ({value:g.id, label:g.name}))]} />
            <div className="grow" />
            <Btn size="sm" icon={Icon.Download}>Экспорт</Btn>
          </div>

          <Card className="mb-16">
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {[
                { l: 'В саду', v: 58, tone: 'success' },
                { l: 'Опоздали', v: 4, tone: 'warning' },
                { l: 'Болеют', v: 6, tone: 'info' },
                { l: 'В отпуске', v: 4, tone: 'neutral' },
                { l: 'Отсутствуют', v: 4, tone: 'neutral' },
              ].map(s => (
                <div key={s.l} style={{ padding: 12, background: 'var(--bg-sunken)', borderRadius: 10 }}>
                  <Badge tone={s.tone}>{s.l}</Badge>
                  <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8 }}>{s.v}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="card-header"><div className="h3">Дети сегодня</div></div>
            <div style={{ padding: 16 }}>
              <div className="ds-grid">
                {DATA.children.slice(0, 12).map((c, i) => {
                  const sts = ['present','present','late','present','present','sick','on_vacation','present','present','early_pickup','absent','present'][i];
                  return (
                    <div key={c.id} className="ds-cell">
                      <Avatar name={c.name} kind="child" />
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="ds-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                        <div className="ds-grp">{groupById(c.group)?.name}</div>
                      </div>
                      {statusBadge('day', sts)}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// ============== CONTENT ==============
function ContentFeed({ navigate, query }) {
  const tab = query?.tab || 'feed';
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Контент</h1>
          <div className="page-sub">Новости, Қундылық, поздравления, расписания и меню</div>
        </div>
        <div className="row gap-8">
          <Btn>Создать черновик</Btn>
          <Btn variant="primary" icon={Icon.Plus}>Создать пост</Btn>
        </div>
      </div>

      <Tabs tabs={[
        { id: 'feed', label: 'Лента контента', count: DATA.content.length },
        { id: 'qundylyq', label: 'Қундылық — тема месяца' },
      ]} value={tab} onChange={(t) => navigate(`#/content?tab=${t}`)} />

      {tab === 'feed' && (
        <div className="two-col-right">
          <div className="table-wrap">
            <div className="table-toolbar">
              <div style={{ width: 240 }}><Input sm icon={Icon.Search} placeholder="Поиск по заголовку" /></div>
              <Select sm value="all" onChange={() => {}} options={[{value:'all', label:'Все типы'},{value:'news', label:'Новости'},{value:'qundylyq', label:'Қундылық'},{value:'birthday', label:'Дни рождения'},{value:'menu', label:'Меню'},{value:'schedule_pub', label:'Расписание'}]} />
              <Select sm value="all" onChange={() => {}} options={[{value:'all', label:'Все статусы'},{value:'draft', label:'Черновик'},{value:'scheduled', label:'Запланирован'},{value:'published', label:'Опубликован'}]} />
              <div className="spacer" />
            </div>
            <table className="table">
              <thead><tr><th>Тип</th><th>Заголовок</th><th>Таргет</th><th>Статус</th><th>Дата</th><th></th></tr></thead>
              <tbody>
                {DATA.content.map(p => (
                  <tr key={p.id}>
                    <td><Badge tone={contentTypeTone(p.type)}>{contentTypeLabel(p.type)}</Badge></td>
                    <td><strong>{p.title}</strong></td>
                    <td className="caption">{p.target}</td>
                    <td>{statusBadge('content', p.status)}</td>
                    <td>{p.date ? fmtDate(p.date) : <span className="muted">—</span>}</td>
                    <td className="actions"><IconBtn icon={Icon.More} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <div>Показано: {DATA.content.length}</div>
              <Btn size="sm">Загрузить ещё</Btn>
            </div>
          </div>

          <Card pad={20}>
            <div className="h3 mb-12">Быстрый редактор</div>
            <Field label="Тип поста"><Select value="news" onChange={() => {}} options={[{value:'news', label:'Новость'},{value:'qundylyq', label:'Қундылық'},{value:'birthday', label:'День рождения'},{value:'menu', label:'Меню'},{value:'schedule_pub', label:'Расписание'}]} /></Field>
            <Field label="Таргет">
              <Select value="all" onChange={() => {}} options={[{value:'all', label:'Все родители садика'},{value:'group', label:'Конкретная группа'},{value:'child', label:'Конкретный ребёнок'}]} />
            </Field>
            <Field label="Заголовок"><BilingualField valueRu="" valueKk="" onChangeRu={() => {}} onChangeKk={() => {}} placeholder="Утренник посвящённый Наурызу" /></Field>
            <Field label="Текст"><BilingualField valueRu="" valueKk="" onChangeRu={() => {}} onChangeKk={() => {}} placeholder="Расскажите, что произошло..." multiline /></Field>
            <Field label="Медиа">
              <div className="dropzone"><Icon.Upload style={{ width: 18, height: 18, marginBottom: 4 }} /><div><strong>Перетащите фото или видео</strong></div><div className="caption" style={{ marginTop: 2 }}>JPG/PNG/MP4 до 50 МБ</div></div>
            </Field>
            <div className="divider" />
            <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
              <Btn size="sm">Черновик</Btn>
              <Btn size="sm" icon={Icon.Clock}>Запланировать</Btn>
              <Btn size="sm" variant="primary" icon={Icon.CheckCircle}>Опубликовать</Btn>
            </div>
          </Card>
        </div>
      )}

      {tab === 'qundylyq' && (
        <div className="two-col-right">
          <Card>
            <div className="card-header">
              <div className="h3">Текущий Қундылық</div>
              <Badge tone="success">Активен</Badge>
            </div>
            <div style={{ padding: 24, background: 'linear-gradient(135deg, var(--primary-soft) 0%, var(--warning-soft) 100%)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="row gap-8">
                <Icon.Sparkles style={{ width: 20, height: 20, color: 'var(--primary)' }} />
                <Badge tone="primary">Май 2026</Badge>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em' }}>Құрмет</div>
              <div style={{ fontSize: 18, color: 'var(--text-2)' }}>Уважение к старшим и сверстникам</div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 540, lineHeight: 1.5 }}>В этом месяце мы учим детей уважать старших, слушать друг друга, и проявлять заботу о младших. Активности и игры подобраны вокруг этой темы.</div>
            </div>
            <div style={{ padding: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn icon={Icon.Edit}>Редактировать</Btn>
              <Btn variant="primary" icon={Icon.Plus}>Новый Қундылық</Btn>
            </div>
          </Card>
          <Card pad={16}>
            <div className="h3 mb-12">История</div>
            <div className="col gap-8">
              {[
                { month: 'Апрель', name: 'Еңбек', sub: 'Труд' },
                { month: 'Март', name: 'Достық', sub: 'Дружба' },
                { month: 'Февраль', name: 'Шынайылық', sub: 'Искренность' },
                { month: 'Январь', name: 'Үлкенді сыйлау', sub: 'Уважение к старшим' },
              ].map(q => (
                <div key={q.month} style={{ padding: 10, background: 'var(--bg-sunken)', borderRadius: 8 }}>
                  <div className="caption" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{q.month}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{q.name}</div>
                  <div className="caption">{q.sub}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============== SCHEDULE ==============
function Schedule({ navigate, query }) {
  const tab = query?.tab || 'templates';
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Расписание</h1>
          <div className="page-sub">Шаблоны и события для групп</div>
        </div>
        <Btn variant="primary" icon={Icon.Plus}>{tab === 'templates' ? 'Создать шаблон' : 'Скопировать на след. неделю'}</Btn>
      </div>

      <Tabs tabs={[
        { id: 'templates', label: 'Шаблоны', count: 5 },
        { id: 'weeks', label: 'Недели и события' },
      ]} value={tab} onChange={(t) => navigate(`#/schedule?tab=${t}`)} />

      {tab === 'templates' && (
        <div className="two-col-right">
          <div>
            <Card className="mb-16">
              <div className="card-header">
                <div>
                  <div className="h3">Кішкентайлар · Стандартная неделя (v3)</div>
                  <div className="caption">Действует с 01.09.2025 · 19 слотов в неделю</div>
                </div>
                <div className="row gap-8">
                  <Btn size="sm" icon={Icon.Plus}>Добавить слот</Btn>
                  <Btn size="sm" icon={Icon.Edit}>Редактировать</Btn>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <div className="week-grid">
                  <div className="wg-h">Время</div>
                  {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => <div key={d} className="wg-h">{d}</div>)}
                  {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(time => (
                    <div style={{display:'contents'}} key={time}>
                      <div className="wg-time">{time}</div>
                      {['mon','tue','wed','thu','fri','sat','sun'].map(day => {
                        const slot = DATA.schedule_slots.find(s => s.day === day && s.start === time);
                        return (
                          <div key={day+time} className="wg-cell">
                            {slot && (
                              <div className={cx('slot', slot.tone)}>
                                <div className="slot-time">{slot.start}–{slot.end}</div>
                                <div>{slot.name}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="section-stack">
            <Card>
              <div className="card-header"><div className="h3">Шаблоны</div></div>
              <div>
                {DATA.groups.map((g, i) => (
                  <div key={g.id} style={{ padding: 12, borderBottom: '1px solid var(--line)', cursor: 'pointer', background: i === 2 ? 'var(--primary-soft)' : 'transparent' }}>
                    <div className="row gap-8">
                      <div className="grow">
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{g.name}</div>
                        <div className="caption">v{[3,2,3,1,2][i]} · {[18,15,19,12,16][i]} слотов</div>
                      </div>
                      <Badge tone="success" withDot={false}>Активен</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card pad={16}>
              <div className="h3 mb-12">Условные обозначения</div>
              <div className="col gap-8" style={{ fontSize: 12 }}>
                <div className="row gap-8"><span className="slot" style={{ padding: '2px 6px', margin: 0 }}>Урок</span><span className="muted">обычное занятие</span></div>
                <div className="row gap-8"><span className="slot warning" style={{ padding: '2px 6px', margin: 0 }}>Еда</span><span className="muted">приём пищи</span></div>
                <div className="row gap-8"><span className="slot info" style={{ padding: '2px 6px', margin: 0 }}>Прогулка</span><span className="muted">прогулка / приём</span></div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'weeks' && (
        <Card>
          <div className="card-header">
            <div className="h3">Активные недели</div>
            <div className="row gap-8">
              <Select sm value="all" onChange={() => {}} options={[{value:'all', label:'Все группы'}, ...DATA.groups.map(g => ({value:g.id, label:g.name}))]} />
              <Btn size="sm" icon={Icon.Refresh}>Скопировать на след.</Btn>
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Группа</th><th>Неделя</th><th>Источник</th><th className="num">События</th><th></th></tr></thead>
            <tbody>
              {DATA.groups.flatMap(g => [
                { id: g.id+'w1', g: g.name, week: '19.05 — 23.05', src: 'manual', events: 19 },
                { id: g.id+'w2', g: g.name, week: '12.05 — 16.05', src: 'auto_copied', events: 19 },
              ]).slice(0, 8).map(w => (
                <tr key={w.id}>
                  <td><strong>{w.g}</strong></td>
                  <td>{w.week}</td>
                  <td><Badge tone={w.src === 'manual' ? 'info' : 'neutral'} withDot={false}>{w.src === 'manual' ? 'Вручную' : 'Авто-копия'}</Badge></td>
                  <td className="num">{w.events}</td>
                  <td className="actions"><IconBtn icon={Icon.More} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ============== MEALS ==============
function Meals() {
  const mealNames = {
    breakfast: 'Завтрак',
    snack_am: '2-й завтрак',
    lunch: 'Обед',
    snack_pm: 'Полдник',
    dinner: 'Ужин',
  };
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Меню</h1>
          <div className="page-sub">Неделя 19.05 — 23.05 · Весь садик</div>
        </div>
        <div className="row gap-8">
          <Btn icon={Icon.Refresh}>Скопировать на след. неделю</Btn>
          <Btn variant="primary" icon={Icon.Plus}>Добавить блюдо</Btn>
        </div>
      </div>

      <div className="row gap-8 mb-16">
        <Select sm value="all" onChange={() => {}} options={[{value:'all', label:'Весь садик'}, ...DATA.groups.map(g => ({value:g.id, label:g.name}))]} />
        <div className="lang-toggle"><button className="on">Неделя</button><button>Месяц</button></div>
        <div className="row gap-8" style={{ marginLeft: 'auto' }}>
          <Btn size="sm" icon={Icon.ChevronLeft}>Пред.</Btn>
          <Btn size="sm" iconRight={Icon.ChevronRight}>След.</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {DATA.meals_week.map((d, di) => (
          <Card key={d.day} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', background: di === 0 ? 'var(--primary-soft)' : 'var(--bg-subtle)' }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{d.day}</div>
              <div className="caption">{d.date}.2026 · {di === 0 ? <Badge tone="primary" size="sm">Сегодня</Badge> : ''}</div>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(d.items).map(([type, dishes]) => (
                <div key={type}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{mealNames[type]}</div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {dishes.map((dish, i) => (
                      <li key={i} style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>• {dish}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div style={{ padding: 8, borderTop: '1px solid var(--line)', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge tone={di < 2 ? 'success' : 'neutral'} size="sm">{di < 2 ? 'Опубликовано' : 'Черновик'}</Badge>
              <IconBtn icon={Icon.Edit} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-16" pad={16}>
        <div className="h3 mb-12">Аллергены и калории</div>
        <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
          <span className="chip">🥛 Молочные · 4 блюда</span>
          <span className="chip">🌾 Глютен · 8 блюд</span>
          <span className="chip">🥚 Яйца · 3 блюда</span>
          <span className="chip">🐟 Рыба · 2 блюда</span>
          <span className="chip">🍯 Мёд · 0</span>
          <span className="chip">🥜 Орехи · 0</span>
        </div>
      </Card>
    </div>
  );
}

// ============== STRUCTURE — Locations & Cameras ==============
function Structure({ query, navigate }) {
  const tab = query?.tab || 'locations';
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Структура садика</h1>
          <div className="page-sub">Локации и камеры</div>
        </div>
        <Btn variant="primary" icon={Icon.Plus}>{tab === 'locations' ? 'Добавить локацию' : 'Добавить камеру'}</Btn>
      </div>

      <Tabs tabs={[
        { id: 'locations', label: 'Локации', count: DATA.locations.length },
        { id: 'cameras', label: 'Камеры', count: DATA.cameras.length },
      ]} value={tab} onChange={(t) => navigate(`#/structure?tab=${t}`)} />

      {tab === 'locations' && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Название</th><th>Описание</th><th className="num">Группы</th><th className="num">Камеры</th><th></th></tr></thead>
            <tbody>
              {DATA.locations.map(l => (
                <tr key={l.id}>
                  <td><strong>{l.name}</strong></td>
                  <td className="caption">{l.description}</td>
                  <td className="num">{DATA.groups.filter(g => g.location === l.name).length}</td>
                  <td className="num">{DATA.cameras.filter(c => c.loc === l.id).length}</td>
                  <td className="actions"><IconBtn icon={Icon.Edit} /><IconBtn icon={Icon.Trash} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'cameras' && (
        <div className="col gap-16">
          {DATA.locations.filter(l => DATA.cameras.find(c => c.loc === l.id)).map(l => (
            <Card key={l.id}>
              <div className="card-header"><div className="h3">{l.name}</div><div className="caption">{l.description}</div></div>
              <table className="table">
                <thead><tr><th>Название</th><th>Stream URL</th><th>Статус</th><th></th></tr></thead>
                <tbody>
                  {DATA.cameras.filter(c => c.loc === l.id).map(c => (
                    <tr key={c.id}>
                      <td><div className="row gap-8"><Icon.Camera style={{ width: 16, height: 16, color: 'var(--text-3)' }} /><strong>{c.name}</strong></div></td>
                      <td className="mono" style={{ color: 'var(--text-3)' }}>{c.stream}</td>
                      <td>{c.status === 'active' ? <Badge tone="success">Активна</Badge> : <Badge tone="neutral">Неактивна</Badge>}</td>
                      <td className="actions">
                        <Btn size="sm" disabled title="Доступно в Phase C">Тест камеры</Btn>
                        <IconBtn icon={Icon.Edit} />
                        <IconBtn icon={Icon.Trash} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
          <Banner tone="info">Кнопка «Тест камеры» (просмотр потока в браузере) станет доступной в Phase C, когда заработает edge-сервис CCTV.</Banner>
        </div>
      )}
    </div>
  );
}

// ============== DIAGNOSTICS ==============
function Diagnostics() {
  const [editor, setEditor] = useState(false);
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Шаблоны диагностики</h1>
          <div className="page-sub">{DATA.diagnostic_templates.filter(t => t.active).length} активных шаблонов · конструктор форм для специалистов</div>
        </div>
        <Btn variant="primary" icon={Icon.Plus} onClick={() => setEditor(true)}>Создать шаблон</Btn>
      </div>

      {!editor && (
        <>
          <div className="table-wrap mb-16">
            <div className="table-toolbar">
              <Select sm value="all" onChange={() => {}} options={[{value:'all', label:'Все специальности'},{value:'psychologist', label:'Психолог'},{value:'speech_therapist', label:'Логопед'},{value:'music_teacher', label:'Музыка'}]} />
              <Select sm value="active" onChange={() => {}} options={[{value:'all', label:'Все'},{value:'active', label:'Активные'},{value:'inactive', label:'Неактивные'}]} />
              <div className="spacer" />
            </div>
            <table className="table">
              <thead><tr><th>Специальность</th><th>Название</th><th>Версия</th><th className="num">Записей</th><th>Статус</th><th></th></tr></thead>
              <tbody>
                {DATA.diagnostic_templates.map(t => (
                  <tr key={t.id} onClick={() => setEditor(true)}>
                    <td><Badge tone="info">{specLabel(t.specialist)}</Badge></td>
                    <td><strong>{t.name}</strong></td>
                    <td className="mono">v{t.version}</td>
                    <td className="num">{t.used}</td>
                    <td>{t.active ? <Badge tone="success">Активен</Badge> : <Badge tone="neutral">Деактивирован</Badge>}</td>
                    <td className="actions"><IconBtn icon={Icon.More} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editor && (
        <>
          <div className="row gap-8 caption mb-12">
            <a className="crumb-link" href="#" onClick={(e) => { e.preventDefault(); setEditor(false); }}>Шаблоны</a>
            <Icon.ChevronRight style={{ width: 12, height: 12, color: 'var(--text-4)' }} />
            <span style={{ color: 'var(--text-1)' }}>Адаптация к саду — 1–3 года (v4)</span>
          </div>

          <Banner tone="warning" title="Шаблон используется">По этому шаблону уже заполнено 18 записей. Менять структуру формы нельзя — только название, описание или деактивировать. Чтобы изменить схему, создайте новую версию.</Banner>

          <div className="two-col-right">
            <div>
              <Card pad={20} className="mb-16">
                <div className="field-row">
                  <Field label="Название" required><Input value="Адаптация к саду — 1–3 года" /></Field>
                  <Field label="Специальность" required><Select value="psychologist" onChange={() => {}} options={[{value:'psychologist', label:'Психолог'},{value:'speech_therapist', label:'Логопед'}]} /></Field>
                </div>
                <Field label="Описание"><Textarea rows={2} value="Базовая диагностика адаптационного периода. Используется в течение первых 30 дней пребывания." /></Field>
              </Card>

              <Card pad={20}>
                <div className="row mb-12" style={{ justifyContent: 'space-between' }}>
                  <div className="h3">Структура формы</div>
                  <Btn size="sm" icon={Icon.Plus} disabled title="Структура заморожена">Добавить секцию</Btn>
                </div>

                <div className="fb-section">
                  <div className="fb-section-h">
                    <Icon.GripDots style={{ width: 14, height: 14, color: 'var(--text-4)' }} />
                    <strong style={{ flex: 1 }}>Эмоциональное состояние</strong>
                    <Badge tone="neutral" withDot={false}>4 поля</Badge>
                  </div>
                  <div className="fb-field"><Icon.GripDots className="handle" style={{ width: 14, height: 14 }} /><span><strong>Настроение ребёнка при разлуке</strong><div className="caption">field: mood_at_separation</div></span><span className="caption">Шкала 1–5</span><Badge tone="danger" size="sm" withDot={false}>Обязат.</Badge><IconBtn icon={Icon.More} /></div>
                  <div className="fb-field"><Icon.GripDots className="handle" style={{ width: 14, height: 14 }} /><span><strong>Плач при приёме</strong><div className="caption">field: cries_on_drop_off</div></span><span className="caption">Да / Нет</span><Badge tone="danger" size="sm" withDot={false}>Обязат.</Badge><IconBtn icon={Icon.More} /></div>
                  <div className="fb-field"><Icon.GripDots className="handle" style={{ width: 14, height: 14 }} /><span><strong>Длительность плача</strong><div className="caption">field: crying_duration_min</div></span><span className="caption">Число (мин)</span><span></span><IconBtn icon={Icon.More} /></div>
                  <div className="fb-field"><Icon.GripDots className="handle" style={{ width: 14, height: 14 }} /><span><strong>Общее настроение</strong><div className="caption">field: general_mood</div></span><span className="caption">Выбор: радостный / спокойный / тревожный</span><Badge tone="danger" size="sm" withDot={false}>Обязат.</Badge><IconBtn icon={Icon.More} /></div>
                </div>

                <div className="fb-section">
                  <div className="fb-section-h">
                    <Icon.GripDots style={{ width: 14, height: 14, color: 'var(--text-4)' }} />
                    <strong style={{ flex: 1 }}>Социальное взаимодействие</strong>
                    <Badge tone="neutral" withDot={false}>3 поля</Badge>
                  </div>
                  <div className="fb-field"><Icon.GripDots className="handle" style={{ width: 14, height: 14 }} /><span><strong>Контакт с воспитателем</strong></span><span className="caption">Шкала 1–5</span><Badge tone="danger" size="sm" withDot={false}>Обязат.</Badge><IconBtn icon={Icon.More} /></div>
                  <div className="fb-field"><Icon.GripDots className="handle" style={{ width: 14, height: 14 }} /><span><strong>Контакт с детьми</strong></span><span className="caption">Шкала 1–5</span><Badge tone="danger" size="sm" withDot={false}>Обязат.</Badge><IconBtn icon={Icon.More} /></div>
                  <div className="fb-field"><Icon.GripDots className="handle" style={{ width: 14, height: 14 }} /><span><strong>Заметка</strong></span><span className="caption">Текст</span><span></span><IconBtn icon={Icon.More} /></div>
                </div>
              </Card>
            </div>

            <div className="section-stack">
              <Card pad={16}>
                <div className="h3 mb-12">Версии</div>
                <div className="timeline">
                  <div className="tl-item"><div className="tl-dot success"><Icon.Check style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">v4 <Badge tone="primary" size="sm">Текущая</Badge></div><div className="tl-meta">15.03.2026 · 18 записей</div></div></div>
                  <div className="tl-item"><div className="tl-dot info"><Icon.Edit style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">v3</div><div className="tl-meta">08.11.2025 · 24 записи</div></div></div>
                  <div className="tl-item"><div className="tl-dot info"><Icon.Edit style={{ width: 12, height: 12 }} /></div><div className="tl-content"><div className="tl-title">v2</div><div className="tl-meta">02.09.2024 · 14 записей</div></div></div>
                </div>
              </Card>
              <Card pad={16}>
                <div className="h3 mb-12">Типы полей</div>
                <div className="col gap-8" style={{ fontSize: 12.5 }}>
                  <div className="row gap-8"><Badge tone="neutral" size="sm">Текст</Badge><span className="muted">короткий ответ</span></div>
                  <div className="row gap-8"><Badge tone="neutral" size="sm">Число</Badge><span className="muted">min/max</span></div>
                  <div className="row gap-8"><Badge tone="neutral" size="sm">Да/Нет</Badge><span className="muted">бинарный</span></div>
                  <div className="row gap-8"><Badge tone="neutral" size="sm">Выбор</Badge><span className="muted">варианты</span></div>
                  <div className="row gap-8"><Badge tone="neutral" size="sm">Шкала</Badge><span className="muted">1–5 / 1–10</span></div>
                  <div className="row gap-8"><Badge tone="neutral" size="sm">Дата</Badge><span className="muted">datepicker</span></div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============== FACE ID ==============
function FaceId({ query, navigate }) {
  const tab = query?.tab || 'consents';
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Face ID</h1>
          <div className="page-sub">Биометрические профили и согласия</div>
        </div>
        <Btn variant="primary" icon={Icon.Plus}>{tab === 'consents' ? 'Зафиксировать согласие' : 'Создать enrollment'}</Btn>
      </div>

      <Banner tone="warning" title="Phase C — раздел в разработке">Согласия и заявки на enrollment можно создавать уже сейчас. Фактическое распознавание заработает после развёртывания edge-сервиса. Данные биометрии в РК подлежат особому правовому режиму — согласие должно быть в письменной форме.</Banner>

      <Tabs tabs={[
        { id: 'consents', label: 'Согласия' },
        { id: 'profiles', label: 'Профили' },
        { id: 'events', label: 'Журнал распознаваний' },
      ]} value={tab} onChange={(t) => navigate(`#/face?tab=${t}`)} />

      {tab === 'consents' && (
        <div className="table-wrap">
          <div className="table-toolbar">
            <Select sm value="all" onChange={() => {}} options={[{value:'all', label:'Все типы subject'},{value:'child', label:'Дети'},{value:'guardian', label:'Опекуны'},{value:'staff', label:'Сотрудники'}]} />
            <Select sm value="active" onChange={() => {}} options={[{value:'all', label:'Все согласия'},{value:'active', label:'Действующие'},{value:'revoked', label:'Отозванные'}]} />
            <div className="spacer" />
          </div>
          <table className="table">
            <thead><tr><th>№</th><th>Subject</th><th>Тип</th><th>Скан подписан</th><th>Зафиксировано</th><th>Статус</th><th></th></tr></thead>
            <tbody>
              {DATA.children.slice(0, 6).map((c, i) => (
                <tr key={c.id}>
                  <td className="mono caption">F-09{20+i}</td>
                  <td><div className="row gap-8"><Avatar name={c.name} kind="child" /><strong>{c.name}</strong></div></td>
                  <td><Badge tone="neutral">Ребёнок</Badge></td>
                  <td>{i < 5 ? <Btn size="sm" icon={Icon.Eye}>Открыть PDF</Btn> : <Badge tone="warning">Не загружен</Badge>}</td>
                  <td>{fmtDate('2024-09-14')}</td>
                  <td>{i === 4 ? <Badge tone="neutral">Отозвано</Badge> : <Badge tone="success">Действует</Badge>}</td>
                  <td className="actions"><IconBtn icon={Icon.More} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'profiles' && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Subject</th><th>Тип</th><th>Согласие</th><th>Видео</th><th>Зарегистрирован</th><th>Статус</th><th></th></tr></thead>
            <tbody>
              {DATA.children.slice(0, 5).map((c, i) => (
                <tr key={c.id}>
                  <td><div className="row gap-8"><Avatar name={c.name} kind="child" /><strong>{c.name}</strong></div></td>
                  <td><Badge tone="neutral">Ребёнок</Badge></td>
                  <td className="mono caption">F-09{20+i}</td>
                  <td><Icon.Camera style={{ width: 14, height: 14, color: 'var(--text-3)' }} /> <span className="caption">10 сек</span></td>
                  <td>{fmtDate('2024-09-14')}</td>
                  <td><Badge tone="success">Активен</Badge></td>
                  <td className="actions"><IconBtn icon={Icon.More} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'events' && (
        <Card>
          <Empty icon={Icon.Scan} title="Журнал распознаваний пуст" text="Распознавание заработает после развёртывания edge-сервиса Face ID (Phase C). Здесь будут отображаться события matched / rejected_spoof по всем камерам." />
        </Card>
      )}
    </div>
  );
}

// ============== DLQ ==============
function DLQ() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Сбойные фоновые задачи</h1>
          <div className="page-sub">Очередь lifecycle — задачи, которые не удалось выполнить автоматически</div>
        </div>
      </div>

      {DATA.dlq.length === 0 ? (
        <Card>
          <Empty icon={Icon.CheckCircle} title="Сбойных задач нет 🎉" text="Это хорошо — все фоновые задачи отрабатывают штатно. Если что-то пойдёт не так, они появятся здесь." />
        </Card>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Job ID</th><th>Задача</th><th>Объект</th><th>Причина</th><th className="num">Попыток</th><th>Время</th><th></th></tr></thead>
            <tbody>
              {DATA.dlq.map(j => (
                <tr key={j.id}>
                  <td className="mono">{j.id}</td>
                  <td><strong>{j.name}</strong></td>
                  <td>{childById(j.child)?.name}</td>
                  <td><Badge tone="danger">{j.reason}</Badge></td>
                  <td className="num">{j.attempts}</td>
                  <td>{fmtDateTime(j.ts)}</td>
                  <td className="actions"><Btn size="sm" icon={Icon.Refresh} variant="primary">Повторить</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Card className="mt-16" pad={16}>
        <div className="row gap-12">
          <Icon.Info style={{ width: 16, height: 16, color: 'var(--text-3)' }} />
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            Если задача не отрабатывает после повторов — обратитесь в поддержку. Сейчас в очереди обрабатываются только задачи перерасчёта/возврата при архивации ребёнка.
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============== SETTINGS ==============
function Settings({ query, navigate }) {
  const tab = query?.tab || 'general';
  const theme = useTheme();

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Настройки садика</h1>
          <div className="page-sub">{DATA.kg.name} · администратор</div>
        </div>
        {tab !== 'design' && <Btn variant="primary">Сохранить изменения</Btn>}
      </div>

      <Tabs tabs={[
        { id: 'general', label: 'Основное' },
        { id: 'operations', label: 'Операционные параметры' },
        { id: 'design', label: 'Дизайн', count: theme ? Object.keys(THEMES).length : null },
        { id: 'fiscal', label: 'Фискальные настройки' },
        { id: 'subscription', label: 'Подписка' },
      ]} value={tab} onChange={(t) => navigate(`#/settings?tab=${t}`)} />

      {tab === 'general' && (
        <div className="two-col-right">
          <Card pad={20}>
            <div className="h3 mb-12">Контакты и адрес</div>
            <Field label="Название садика" required><Input value={DATA.kg.name} /></Field>
            <Field label="Адрес"><Input value={DATA.kg.address} /></Field>
            <div className="field-row">
              <Field label="Телефон"><Input value={DATA.kg.phone} icon={Icon.Phone} /></Field>
              <Field label="Slug" hint="Для URL"><Input value={DATA.kg.slug} disabled /></Field>
            </div>
          </Card>
          <Card pad={16}>
            <div className="h3 mb-8">Логотип</div>
            <div className="img-ph" style={{ width: '100%', aspectRatio: '1/1', marginBottom: 12 }}>LOGO 1:1</div>
            <Btn block icon={Icon.Upload}>Загрузить логотип</Btn>
          </Card>
        </div>
      )}

      {tab === 'operations' && (
        <div className="two-col-right">
          <div className="section-stack">
            <Card pad={20}>
              <div className="h3 mb-12">Время и валюта</div>
              <div className="field-row">
                <Field label="Часовой пояс"><Select value="Asia/Almaty" onChange={() => {}} options={[{value:'Asia/Almaty', label:'Asia/Almaty (UTC+5)'},{value:'Asia/Aqtobe', label:'Asia/Aqtobe (UTC+5)'}]} /></Field>
                <Field label="Валюта"><Select value="KZT" onChange={() => {}} options={[{value:'KZT', label:'KZT — Казахский тенге'}]} /></Field>
              </div>
              <div className="field-row">
                <Field label="Сумма за поздний забор"><Input value="5000" /></Field>
                <Field label="Льготный период оплаты (дней)"><Input value="5" /></Field>
              </div>
              <Field label="Срок действия OTP (секунд)" hint="Сколько секунд действителен SMS-код"><Input value="300" /></Field>
            </Card>

            <Card pad={20}>
              <div className="h3 mb-12">Скидки за предоплату</div>
              <div className="caption mb-12">Базовые правила, применяемые ко всем тарифам. Можно переопределить на уровне тарифа.</div>
              <div className="field-row">
                <Field label="3 месяца"><Input value="5%" /></Field>
                <Field label="6 месяцев"><Input value="8%" /></Field>
              </div>
              <div className="field-row">
                <Field label="12 месяцев"><Input value="15%" /></Field>
                <Field label="24 месяца"><Input value="20%" /></Field>
              </div>
            </Card>
          </div>
          <Card pad={16}>
            <div className="h3 mb-12">Подсказка</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
              Эти параметры влияют на работу системы для всех родителей и сотрудников. Изменения вступают в силу сразу после сохранения.
            </div>
          </Card>
        </div>
      )}

      {tab === 'design' && theme && <DesignSettings theme={theme} />}

      {tab === 'fiscal' && (
        <Card pad={20}>
          <Banner tone="neutral" title="Управляется платформой">Фискальные настройки изменяются только через SuperAdmin. Если вам нужно сменить провайдера или ключи — свяжитесь с поддержкой Shyraq.</Banner>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px 16px', fontSize: 13.5, marginTop: 14 }}>
            <div className="muted">Провайдер ОФД</div><div>Касса 24</div>
            <div className="muted">БИН</div><div className="mono">920414550021</div>
            <div className="muted">Кассовый аппарат</div><div className="mono">KKM-3920</div>
            <div className="muted">Статус подключения</div><div><Badge tone="success">Подключён</Badge></div>
            <div className="muted">Последний чек</div><div>{fmtDateTime('2026-05-15T16:40:00')}</div>
          </div>
        </Card>
      )}

      {tab === 'subscription' && (
        <div className="two-col-right">
          <Card pad={20}>
            <div className="h3 mb-12">Текущий план</div>
            <div style={{ padding: 20, background: 'linear-gradient(135deg, var(--primary-soft) 0%, var(--success-soft) 100%)', borderRadius: 12 }}>
              <div className="row gap-8" style={{ justifyContent: 'space-between' }}>
                <div>
                  <Badge tone="primary">Pro</Badge>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, letterSpacing: '-0.01em' }}>До 150 детей</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>Все модули · поддержка 24/7</div>
                </div>
                <Icon.Sparkles style={{ width: 28, height: 28, color: 'var(--primary)' }} />
              </div>
              <div className="divider" />
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Действует до <strong>31.12.2026</strong> · автопродление включено</div>
            </div>
          </Card>
          <Card pad={16}>
            <div className="h3 mb-8">Опасная зона</div>
            <Btn variant="danger-ghost" block icon={Icon.Trash}>Закрыть садик</Btn>
            <div className="caption mt-8">Только через SuperAdmin. Свяжитесь с поддержкой.</div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Design Settings sub-screen ────────────────────────────────────────────
function DesignSettings({ theme }) {
  const { t, setTweak } = theme;
  const themeGroups = [
    { label: 'Бренд', sub: 'Из основной палитры Shyraq', keys: ['green', 'orange', 'blue', 'mono'] },
    { label: 'Расширенные', sub: 'Бренд + дополнительные оттенки', keys: ['warmCream', 'forestMint', 'oceanBlue'] },
    { label: 'Тёмная', sub: 'Для работы в условиях слабого освещения', keys: ['dark'] },
  ];
  const tokensList = [
    { group: 'Основной акцент', items: ['--primary', '--primary-hover', '--primary-soft', '--primary-fg'] },
    { group: 'Поверхности', items: ['--bg', '--bg-elev', '--bg-sunken', '--bg-subtle', '--bg-sidebar'] },
    { group: 'Текст', items: ['--text-1', '--text-2', '--text-3', '--text-4'] },
    { group: 'Семантика', items: ['--success', '--warning', '--danger', '--info'] },
    { group: 'Границы', items: ['--border', '--border-strong', '--line'] },
  ];
  const [tokenVals, setTokenVals] = useState({});
  useEffect(() => {
    const tick = () => {
      const cs = getComputedStyle(document.documentElement);
      const out = {};
      tokensList.forEach(g => g.items.forEach(k => out[k] = cs.getPropertyValue(k).trim()));
      setTokenVals(out);
    };
    tick();
    const id = setInterval(tick, 300);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="two-col-right">
      <div className="section-stack">
        {themeGroups.map(g => (
          <Card key={g.label}>
            <div className="card-header">
              <div>
                <div className="h3">{g.label}</div>
                <div className="caption">{g.sub}</div>
              </div>
            </div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: g.keys.length >= 3 ? 'repeat(2, 1fr)' : '1fr', gap: 12 }}>
              {g.keys.map(k => {
                const th = THEMES[k];
                const active = t.theme === k;
                return (
                  <button key={k} onClick={() => setTweak('theme', k)}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 0,
                      padding: 0, cursor: 'pointer',
                      border: active ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                      borderRadius: 'var(--r-lg)',
                      background: 'var(--bg-elev)',
                      textAlign: 'left',
                      overflow: 'hidden',
                      transition: 'transform 80ms, box-shadow 80ms',
                      boxShadow: active ? 'var(--shadow-2)' : 'none',
                    }}>
                    <div style={{ height: 88, position: 'relative', background: th.tokens['--bg'] || '#fff', borderBottom: '1px solid var(--line)' }}>
                      {/* mini-mockup of an app screen */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                        <div style={{ width: 22, background: th.tokens['--bg-sidebar'] || th.tokens['--bg'], borderRight: '1px solid', borderColor: th.tokens['--line'] || '#eee' }}>
                          <div style={{ marginTop: 8, marginLeft: 5, width: 12, height: 4, borderRadius: 2, background: th.tokens['--primary'] }} />
                          <div style={{ marginTop: 6, marginLeft: 5, width: 10, height: 3, borderRadius: 2, background: th.tokens['--text-3'] || '#999', opacity: 0.4 }} />
                          <div style={{ marginTop: 4, marginLeft: 5, width: 12, height: 3, borderRadius: 2, background: th.tokens['--text-3'] || '#999', opacity: 0.4 }} />
                          <div style={{ marginTop: 4, marginLeft: 5, width: 8, height: 3, borderRadius: 2, background: th.tokens['--text-3'] || '#999', opacity: 0.4 }} />
                        </div>
                        <div style={{ flex: 1, padding: 6 }}>
                          <div style={{ width: 32, height: 5, borderRadius: 2, background: th.tokens['--text-1'] || '#000' }} />
                          <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                            <div style={{ flex: 1, height: 22, borderRadius: 3, background: th.tokens['--bg-elev'] || '#fff', border: `1px solid ${th.tokens['--line'] || '#eee'}` }} />
                            <div style={{ flex: 1, height: 22, borderRadius: 3, background: th.tokens['--primary-soft'] || '#eee' }} />
                          </div>
                          <div style={{ marginTop: 4, height: 18, borderRadius: 3, background: th.tokens['--primary'] }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div className="row gap-8" style={{ alignItems: 'center' }}>
                        <span style={{ display: 'flex', gap: 0, borderRadius: 'var(--r-xs)', overflow: 'hidden', boxShadow: '0 0 0 1px var(--border)' }}>
                          {th.swatches.map((c, i) => <span key={i} style={{ width: 10, height: 14, background: c }} />)}
                        </span>
                        <div className="grow">
                          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{th.label}</div>
                          <div className="caption">{th.sub}</div>
                        </div>
                        {active && <Badge tone="primary">Текущая</Badge>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        ))}

        <Card pad={20}>
          <div className="h3 mb-12">Скругления элементов</div>
          <div className="caption mb-12">Влияет на все карточки, кнопки и поля ввода — масштабирует токены <span className="mono">--r-xs..xl</span>.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { id: 'sharp', label: 'Sharp', sub: 'Угловатые формы, строгий вид', radius: 3 },
              { id: 'soft',  label: 'Soft',  sub: 'Дефолтные мягкие скругления', radius: 8 },
              { id: 'round', label: 'Round', sub: 'Округлые формы, дружелюбно',  radius: 14 },
            ].map(r => {
              const active = t.radius === r.id;
              return (
                <button key={r.id} onClick={() => setTweak('radius', r.id)}
                  style={{
                    padding: 14, cursor: 'pointer',
                    border: active ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                    borderRadius: 'var(--r-lg)',
                    background: 'var(--bg-elev)', textAlign: 'left',
                  }}>
                  <div style={{ width: 32, height: 24, background: 'var(--primary)', borderRadius: r.radius, marginBottom: 10 }} />
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.label}</div>
                  <div className="caption" style={{ marginTop: 2 }}>{r.sub}</div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="section-stack">
        <Card pad={16}>
          <div className="h3 mb-12">Текущая тема</div>
          <div style={{ padding: 12, background: 'var(--bg-sunken)', borderRadius: 'var(--r-md)' }}>
            <div className="row gap-8" style={{ alignItems: 'center' }}>
              <span style={{ display: 'flex', gap: 0, borderRadius: 'var(--r-xs)', overflow: 'hidden', boxShadow: '0 0 0 1px var(--border)' }}>
                {THEMES[t.theme].swatches.map((c, i) => <span key={i} style={{ width: 14, height: 18, background: c }} />)}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{THEMES[t.theme].label}</div>
                <div className="caption">{THEMES[t.theme].sub}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-header">
            <div className="h3">Значения токенов</div>
            <span className="caption">из CSS-переменных</span>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 480, overflowY: 'auto' }}>
            {tokensList.map(g => (
              <div key={g.group}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{g.group}</div>
                <div className="col gap-8" style={{ gap: 4 }}>
                  {g.items.map(k => (
                    <div key={k} className="row" style={{ gap: 8, fontSize: 11.5, fontFamily: 'JetBrains Mono, monospace' }}>
                      <span style={{ width: 18, height: 18, borderRadius: 4, background: tokenVals[k] || 'transparent', boxShadow: '0 0 0 1px var(--border)', flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text-2)' }}>{k}</span>
                      <span style={{ color: 'var(--text-3)' }}>{tokenVals[k]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card pad={16}>
          <div className="h3 mb-8">Подсказка</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
            Выбранная тема применяется немедленно для всех страниц вашего садика. Сохраняется в настройках браузера и переключается без перезагрузки.
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============== PROFILE ==============
function Profile({ query }) {
  const tab = query?.tab || 'profile';
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Профиль</h1>
          <div className="page-sub">{DATA.me.name} · администратор</div>
        </div>
      </div>

      <Tabs tabs={[
        { id: 'profile', label: 'Профиль' },
        { id: 'qr', label: 'Мой QR' },
        { id: 'notifications', label: 'Уведомления' },
      ]} value={tab} onChange={() => {}} />

      {tab === 'profile' && (
        <div className="two-col-right">
          <Card pad={20}>
            <div className="h3 mb-12">Основное</div>
            <div className="row gap-16 mb-16">
              <Avatar name={DATA.me.name} kind="admin" size="xl" />
              <div className="col gap-8">
                <Btn icon={Icon.Upload}>Загрузить фото</Btn>
                <div className="caption">JPG/PNG до 2 МБ</div>
              </div>
            </div>
            <Field label="ФИО"><Input value={DATA.me.name} /></Field>
            <div className="field-row">
              <Field label="Телефон"><Input value={DATA.me.phone} disabled icon={Icon.Phone} /></Field>
              <Field label="ИИН"><Input value="800210400123" /></Field>
            </div>
            <div className="field-row">
              <Field label="Дата рождения"><Input type="date" value="1980-02-10" /></Field>
              <Field label="Язык интерфейса"><Select value="ru" onChange={() => {}} options={[{value:'ru', label:'Русский'},{value:'kk', label:'Қазақша'}]} /></Field>
            </div>
          </Card>
          <Card pad={16}>
            <div className="h3 mb-12">Безопасность</div>
            <div className="col gap-12">
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Активные сессии</div>
                <div className="caption">Web · Chrome, Алматы · сейчас</div>
              </div>
              <Btn block icon={Icon.Logout} variant="danger-ghost">Завершить другие сессии</Btn>
            </div>
          </Card>
        </div>
      )}

      {tab === 'qr' && (
        <div className="two-col-right">
          <Card pad={20}>
            <div className="h3 mb-16">Мой Identity QR</div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div className="qr-box"><QrSvg seed="aigul-2026-05-18" /></div>
              <div className="grow">
                <div style={{ fontSize: 18, fontWeight: 700 }}>{DATA.me.name}</div>
                <div className="caption mt-8">Администратор · {DATA.kg.name}</div>
                <div className="divider" />
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>QR обновляется автоматически и используется при проверках на территории садика. Не передавайте его третьим лицам.</div>
                <div className="row gap-8 mt-16">
                  <Btn icon={Icon.Refresh}>Обновить</Btn>
                  <Btn icon={Icon.Download}>Скачать</Btn>
                </div>
              </div>
            </div>
          </Card>
          <Card pad={16}>
            <div className="h3 mb-8">Безопасность QR</div>
            <div className="caption" style={{ marginBottom: 12 }}>Если вы потеряли доступ или подозреваете утечку — отзовите все ваши QR.</div>
            <Btn variant="danger-ghost" block icon={Icon.QR}>Отозвать все мои QR</Btn>
          </Card>
        </div>
      )}

      {tab === 'notifications' && (
        <Card>
          <div className="card-header"><div className="h3">Настройки уведомлений</div></div>
          <div style={{ padding: 0 }}>
            {[
              { name: 'Новый лид', desc: 'Заявка с сайта, формы или Instagram' },
              { name: 'Новая заявка родителя', desc: 'Поздний забор, отпуск, доверенное лицо и т.д.' },
              { name: 'Оплата получена', desc: 'Успешная оплата по счёту' },
              { name: 'Счёт просрочен', desc: 'Истёк срок оплаты' },
              { name: 'Возврат требует решения', desc: 'Создан pending refund' },
              { name: 'Сбойная задача', desc: 'Фоновая задача упала после ретраев' },
              { name: 'Скидка активирована', desc: 'Запланированная скидка стала активной' },
            ].map((n, i) => (
              <div key={n.name} style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="grow">
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{n.name}</div>
                  <div className="caption">{n.desc}</div>
                </div>
                <Toggle on={i < 5} label="Push" />
                <Toggle on={true} label="В кабинете" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============== System states ==============
function SystemState({ kind }) {
  const map = {
    '403': { code: '403', title: 'У вас нет доступа к этому разделу', text: 'Этот раздел доступен только администраторам с определёнными правами. Если вы считаете, что это ошибка — обратитесь к старшему администратору садика.', icon: Icon.Lock },
    '404': { code: '404', title: 'Страница не найдена', text: 'Возможно, ссылка устарела или объект был удалён.', icon: Icon.Search },
    'offline': { code: '', title: 'Нет связи с сервером', text: 'Похоже, у вас пропало соединение. Мы попробуем переподключиться автоматически.', icon: Icon.Globe },
    'session': { code: '', title: 'Сессия истекла', text: 'Пожалуйста, войдите снова — мы сохранили вашу последнюю работу.', icon: Icon.Clock },
  };
  const m = map[kind] || map['404'];
  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 96, height: 96, borderRadius: 24, background: 'var(--bg-sunken)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          <m.icon style={{ width: 40, height: 40, color: 'var(--text-3)' }} />
        </div>
        {m.code && <div style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Ошибка {m.code}</div>}
        <h1 className="h1" style={{ marginBottom: 8 }}>{m.title}</h1>
        <div className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
        <div className="row gap-8" style={{ justifyContent: 'center', marginTop: 20 }}>
          <Btn icon={Icon.Refresh}>Повторить</Btn>
          <Btn variant="primary" onClick={() => window.location.hash = '#/'}>На дашборд</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  RequestsList, RequestDetail, AttendanceJournal, ContentFeed, Schedule, Meals,
  Structure, Diagnostics, FaceId, DLQ, Settings, Profile, SystemState,
});
