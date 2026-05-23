// screens-billing.jsx — Invoices, Payments, Tariffs, Refunds, Discounts, Holidays, Fiscal

// ============== INVOICES list ==============
function InvoicesList({ navigate, query }) {
  const [filter, setFilter] = useState({ status: query?.status || 'all', type: 'all', child: query?.child || 'all' });
  const list = DATA.invoices.filter(i => {
    if (filter.status !== 'all' && i.status !== filter.status) return false;
    if (filter.type !== 'all' && i.type !== filter.type) return false;
    if (filter.child !== 'all' && i.child !== filter.child) return false;
    return true;
  });
  const totals = {
    overdue: DATA.invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.discounted, 0),
    pending: DATA.invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.discounted, 0),
    paid: DATA.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.discounted, 0),
  };
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Счета</h1>
          <div className="page-sub">{DATA.invoices.length} счетов · период: май 2026</div>
        </div>
        <div className="row gap-8">
          <Btn icon={Icon.Download}>Экспорт CSV</Btn>
          <Btn variant="primary" icon={Icon.Plus}>Создать начисление</Btn>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Card className="kpi" style={{ background: 'var(--danger-soft)' }}>
          <div className="kpi-label" style={{ color: 'var(--danger-fg)' }}>Просрочено</div>
          <div className="kpi-value" style={{ color: 'var(--danger-fg)' }}>{fmtKzt(totals.overdue)}</div>
          <div className="kpi-sub down">2 счёта</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-label">Ожидают оплаты</div>
          <div className="kpi-value">{fmtKzt(totals.pending)}</div>
          <div className="kpi-sub muted">3 счёта</div>
        </Card>
        <Card className="kpi">
          <div className="kpi-label">Оплачено в этом месяце</div>
          <div className="kpi-value">{fmtKzt(totals.paid)}</div>
          <div className="kpi-sub up"><Icon.ArrowUp style={{ width: 12, height: 12 }} />+12% к апрелю</div>
        </Card>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div style={{ width: 240 }}><Input sm icon={Icon.Search} placeholder="Поиск по ребёнку или ID" /></div>
          <Select sm value={filter.status} onChange={(v) => setFilter(f => ({...f, status:v}))} options={[{value:'all', label:'Все статусы'},{value:'pending', label:'Ожидает'},{value:'partial', label:'Частично'},{value:'paid', label:'Оплачен'},{value:'overdue', label:'Просрочен'},{value:'refunded', label:'Возвращён'},{value:'cancelled', label:'Отменён'}]} />
          <Select sm value={filter.type} onChange={(v) => setFilter(f => ({...f, type:v}))} options={[{value:'all', label:'Все типы'},{value:'monthly', label:'Месячный'},{value:'late_pickup_fee', label:'Поздний забор'},{value:'additional_service', label:'Доп. услуги'}]} />
          <div className="spacer" />
          <Btn size="sm" icon={Icon.Filter}>Период</Btn>
        </div>
        <table className="table">
          <thead><tr><th>ID</th><th>Ребёнок</th><th>Тип</th><th>Период</th><th className="num">К оплате</th><th className="num">Со скидкой</th><th>Статус</th><th>Срок</th><th></th></tr></thead>
          <tbody>
            {list.map(inv => (
              <tr key={inv.id} onClick={() => navigate(`#/billing/invoices/${inv.id}`)}>
                <td className="mono" style={{ color: 'var(--text-3)' }}>{inv.id}</td>
                <td><div className="row gap-8"><Avatar name={childById(inv.child)?.name || '?'} kind="child" /><strong>{childById(inv.child)?.name || 'Архивный'}</strong></div></td>
                <td>{invoiceTypeLabel(inv.type)}</td>
                <td>{inv.period}</td>
                <td className="num">{fmtKzt(inv.amount)}</td>
                <td className="num"><strong>{fmtKzt(inv.discounted)}</strong>{inv.amount !== inv.discounted && <div className="caption" style={{ color: 'var(--success-fg)' }}>−{fmtKzt(inv.amount - inv.discounted)}</div>}</td>
                <td>{statusBadge('invoice', inv.status)}</td>
                <td>{fmtDate(inv.due)}</td>
                <td className="actions"><IconBtn icon={Icon.More} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footer">
          <div>1–{list.length} из {list.length}</div>
        </div>
      </div>
    </div>
  );
}

// ============== INVOICE detail ==============
function InvoiceDetail({ id, navigate }) {
  const inv = DATA.invoices.find(i => i.id === id) || DATA.invoices[0];
  const child = childById(inv.child);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const toast = useToast();
  return (
    <div className="page">
      <div className="row gap-8 caption mb-12">
        <a className="crumb-link" href="#/billing/invoices">Счета</a>
        <Icon.ChevronRight style={{ width: 12, height: 12, color: 'var(--text-4)' }} />
        <span style={{ color: 'var(--text-1)' }}>{inv.id}</span>
      </div>

      <Card className="mb-16">
        <div style={{ padding: 20, display: 'flex', gap: 20 }}>
          <div className="grow">
            <div className="row gap-8"><h1 className="h1" style={{ margin: 0 }}>Счёт {inv.id}</h1>{statusBadge('invoice', inv.status)}</div>
            <div className="caption mt-8" style={{ display: 'flex', gap: 14 }}>
              <span>{invoiceTypeLabel(inv.type)}</span>
              <span className="dot-sep" />
              <span>Период: <strong style={{ color: 'var(--text-2)' }}>{inv.period}</strong></span>
              <span className="dot-sep" />
              <span>Срок: <strong style={{ color: inv.status === 'overdue' ? 'var(--danger-fg)' : 'var(--text-2)' }}>{fmtDate(inv.due)}</strong></span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="caption">К оплате</div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>{fmtKzt(inv.discounted)}</div>
            {inv.amount !== inv.discounted && <div className="caption" style={{ color: 'var(--success-fg)' }}>скидка −{fmtKzt(inv.amount - inv.discounted)} с {fmtKzt(inv.amount)}</div>}
          </div>
        </div>
        {(inv.status === 'pending' || inv.status === 'partial' || inv.status === 'overdue') && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="danger-ghost" onClick={() => setCancelOpen(true)}>Отменить счёт</Btn>
            <Btn icon={Icon.Mail}>Напомнить родителю</Btn>
            <Btn variant="primary" icon={Icon.CheckCircle} onClick={() => setMarkPaidOpen(true)}>Отметить оплату наличными</Btn>
          </div>
        )}
      </Card>

      <div className="two-col-right">
        <div className="section-stack">
          <Card>
            <div className="card-header"><div className="h3">Позиции</div></div>
            <table className="table">
              <thead><tr><th>Описание</th><th className="num">Кол-во</th><th className="num">Цена</th><th className="num">Итого</th></tr></thead>
              <tbody>
                <tr><td><strong>Базовый месяц 36–54 мес</strong><div className="caption">Тариф t2 · 19 рабочих дней</div></td><td className="num">1</td><td className="num">{fmtKzt(180000)}</td><td className="num"><strong>{fmtKzt(180000)}</strong></td></tr>
                {inv.amount !== inv.discounted && <tr><td>Скидка: Семейная (2-й ребёнок)</td><td className="num">—</td><td className="num" style={{ color: 'var(--success-fg)' }}>−10%</td><td className="num" style={{ color: 'var(--success-fg)' }}>−{fmtKzt(inv.amount - inv.discounted)}</td></tr>}
              </tbody>
              <tfoot>
                <tr><td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, padding: '12px 14px' }}>Итого к оплате</td><td className="num" style={{ fontWeight: 700, fontSize: 16, padding: '12px 14px' }}>{fmtKzt(inv.discounted)}</td></tr>
              </tfoot>
            </table>
          </Card>

          <Card>
            <div className="card-header"><div className="h3">Связанные оплаты</div></div>
            {DATA.payments.filter(p => p.invoice === inv.id).length === 0 ? <Empty icon={Icon.CreditCard} title="Оплат ещё не было" text="Когда родитель оплатит счёт — оплата появится здесь." /> :
              <table className="table"><thead><tr><th>ID</th><th>Провайдер</th><th className="num">Сумма</th><th>Статус</th><th>Дата</th></tr></thead>
                <tbody>{DATA.payments.filter(p => p.invoice === inv.id).map(p => (
                  <tr key={p.id}><td className="mono">{p.id}</td><td>{providerLabel(p.provider)}</td><td className="num">{fmtKzt(p.amount)}</td><td>{statusBadge('payment', p.status)}</td><td>{fmtDateTime(p.date)}</td></tr>
                ))}</tbody>
              </table>
            }
          </Card>

          {inv.amount !== inv.discounted && (
            <Card>
              <div className="card-header"><div className="h3">Применённые скидки</div></div>
              <div style={{ padding: 16 }}>
                <div className="row gap-12" style={{ padding: 12, background: 'var(--success-soft)', borderRadius: 8 }}>
                  <Icon.Gift style={{ width: 20, height: 20, color: 'var(--success-fg)' }} />
                  <div className="grow"><strong>Семейная: 2-й ребёнок</strong><div className="caption">−10% · приоритет 10 · stackable</div></div>
                  <strong style={{ color: 'var(--success-fg)' }}>−{fmtKzt(inv.amount - inv.discounted)}</strong>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="section-stack">
          <Card pad={16}>
            <div className="h3 mb-8">Ребёнок</div>
            <div className="row gap-12" onClick={() => navigate(`#/children/${inv.child}`)} style={{ cursor: 'pointer' }}>
              <Avatar name={child?.name || '?'} kind="child" size="lg" />
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{child?.name}</div>
                <div className="caption">{groupById(child?.group)?.name}</div>
              </div>
              <Icon.ChevronRight style={{ width: 14, height: 14, color: 'var(--text-4)' }} />
            </div>
          </Card>

          <Card pad={16}>
            <div className="h3 mb-12">Фискальный чек</div>
            {DATA.fiscal.find(f => f.payment === DATA.payments.find(p => p.invoice === inv.id)?.id) ? (
              <div>
                {statusBadge('fiscal', DATA.fiscal.find(f => f.payment === DATA.payments.find(p => p.invoice === inv.id)?.id)?.status)}
                <div className="mono caption mt-8">kz-3920-aw81-9821</div>
              </div>
            ) : (
              <div className="caption">—</div>
            )}
          </Card>
        </div>
      </div>

      <Modal open={markPaidOpen} onClose={() => setMarkPaidOpen(false)} title="Отметить оплату наличными"
        footer={<><Btn onClick={() => setMarkPaidOpen(false)}>Отменить</Btn><Btn variant="primary" onClick={() => { setMarkPaidOpen(false); toast({ tone: 'success', title: 'Оплата зарегистрирована', body: 'Будет создан фискальный чек.' }); }}>Подтвердить</Btn></>}>
        <Field label="Сумма"><Input value={fmtKzt(inv.discounted)} disabled /></Field>
        <Field label="Дата получения"><Input type="datetime-local" /></Field>
        <Field label="Заметка"><Textarea rows={2} placeholder="Кому передал, чек..." /></Field>
        <Banner tone="info">Будет создан платёж со статусом «Проведён» и поставлена в очередь задача на фискальный чек.</Banner>
      </Modal>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Отменить счёт"
        footer={<><Btn onClick={() => setCancelOpen(false)}>Не отменять</Btn><Btn variant="danger" onClick={() => { setCancelOpen(false); toast({ tone: 'success', title: 'Счёт отменён' }); }}>Отменить счёт</Btn></>}>
        <Banner tone="warning">Отменить счёт можно только в статусе «Ожидает» или «Частично оплачен». Если по счёту уже есть проведённые оплаты — сначала оформите возврат.</Banner>
        <Field label="Причина отмены" required><Textarea rows={3} /></Field>
      </Modal>
    </div>
  );
}

// ============== PAYMENTS ==============
function PaymentsList({ navigate }) {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Оплаты</h1>
          <div className="page-sub">{DATA.payments.length} транзакций за период</div>
        </div>
        <Btn icon={Icon.Download}>Экспорт</Btn>
      </div>
      <div className="table-wrap">
        <div className="table-toolbar">
          <div style={{ width: 240 }}><Input sm icon={Icon.Search} placeholder="Поиск по ID или ребёнку" /></div>
          <Select sm value="all" onChange={() => {}} options={[{value:'all', label:'Все провайдеры'},{value:'halyk_epay', label:'Halyk ePay'},{value:'kaspi_pay', label:'Kaspi Pay'},{value:'cash', label:'Наличные'}]} />
          <Select sm value="all" onChange={() => {}} options={[{value:'all', label:'Все статусы'},{value:'completed', label:'Проведены'},{value:'failed', label:'Ошибка'},{value:'refunded', label:'Возвращены'}]} />
          <Btn size="sm">Период: Май 2026</Btn>
        </div>
        <table className="table">
          <thead><tr><th>ID</th><th>Счёт</th><th>Ребёнок</th><th className="num">Сумма</th><th>Провайдер</th><th>Статус</th><th>Дата</th></tr></thead>
          <tbody>
            {DATA.payments.map(p => (
              <tr key={p.id} onClick={() => navigate(`#/billing/payments/${p.id}`)}>
                <td className="mono" style={{ color: 'var(--text-3)' }}>{p.id}</td>
                <td className="mono" style={{ color: 'var(--text-3)' }}>{p.invoice}</td>
                <td><div className="row gap-8"><Avatar name={childById(p.child)?.name || '?'} kind="child" /><strong>{childById(p.child)?.name}</strong></div></td>
                <td className="num"><strong>{fmtKzt(p.amount)}</strong></td>
                <td>{providerLabel(p.provider)}</td>
                <td>{statusBadge('payment', p.status)}</td>
                <td>{fmtDateTime(p.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentDetail({ id }) {
  const p = DATA.payments.find(x => x.id === id) || DATA.payments[0];
  return (
    <div className="page">
      <div className="row gap-8 caption mb-12"><a className="crumb-link" href="#/billing/payments">Оплаты</a><Icon.ChevronRight style={{ width: 12, height: 12, color: 'var(--text-4)' }} /><span style={{ color: 'var(--text-1)' }}>{p.id}</span></div>
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1 mono" style={{ fontFamily: 'inherit' }}>Платёж {p.id}</h1>
          <div className="row gap-8 mt-8">{statusBadge('payment', p.status)}<span className="caption">Создан {fmtDateTime(p.date)}</span></div>
        </div>
      </div>
      <div className="two-col-right">
        <div className="section-stack">
          <Card pad={20}>
            <div className="h3 mb-12">Детали платежа</div>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px 16px', fontSize: 13.5 }}>
              <div className="muted">Сумма</div><div><strong style={{ fontSize: 18 }}>{fmtKzt(p.amount)}</strong></div>
              <div className="muted">Провайдер</div><div>{providerLabel(p.provider)}</div>
              <div className="muted">Счёт</div><div className="mono">{p.invoice}</div>
              <div className="muted">Ребёнок</div><div>{childById(p.child)?.name}</div>
              <div className="muted">Создан</div><div>{fmtDateTime(p.date)}</div>
              <div className="muted">Provider txn</div><div className="mono">{p.id.toUpperCase()}-TXN-{Math.floor(Math.random()*900000+100000)}</div>
            </div>
          </Card>
          <Card pad={16}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="h3">Provider payload</div>
              <Btn size="sm" icon={Icon.Download}>Скачать JSON</Btn>
            </div>
            <div className="json mt-12">
              <div>{'{'}</div>
              <div>  <span className="k">"transaction_id"</span>: <span className="s">"{p.id.toUpperCase()}-TXN-882134"</span>,</div>
              <div>  <span className="k">"provider"</span>: <span className="s">"{p.provider}"</span>,</div>
              <div>  <span className="k">"amount"</span>: <span className="n">{p.amount}</span>,</div>
              <div>  <span className="k">"currency"</span>: <span className="s">"KZT"</span>,</div>
              <div>  <span className="k">"status"</span>: <span className="s">"{p.status}"</span>,</div>
              <div>  <span className="k">"timestamp"</span>: <span className="s">"{p.date}.000Z"</span>,</div>
              <div>  <span className="k">"card_mask"</span>: <span className="s">"****1234"</span>,</div>
              <div>  <span className="k">"merchant_id"</span>: <span className="s">"shyraq-balapan-kz"</span></div>
              <div>{'}'}</div>
            </div>
          </Card>
        </div>
        <Card pad={16}>
          <div className="h3 mb-12">Связанные сущности</div>
          <div className="col gap-8">
            <a href={`#/billing/invoices/${p.invoice}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--bg-sunken)', borderRadius: 8, textDecoration: 'none', color: 'inherit' }}>
              <Icon.Receipt style={{ width: 16, height: 16, color: 'var(--text-3)' }} />
              <div className="grow"><div style={{ fontSize: 13, fontWeight: 600 }}>Счёт</div><div className="mono caption">{p.invoice}</div></div>
              <Icon.ChevronRight style={{ width: 14, height: 14, color: 'var(--text-4)' }} />
            </a>
            <a href={`#/children/${p.child}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--bg-sunken)', borderRadius: 8, textDecoration: 'none', color: 'inherit' }}>
              <Icon.Users style={{ width: 16, height: 16, color: 'var(--text-3)' }} />
              <div className="grow"><div style={{ fontSize: 13, fontWeight: 600 }}>Ребёнок</div><div className="caption">{childById(p.child)?.name}</div></div>
              <Icon.ChevronRight style={{ width: 14, height: 14, color: 'var(--text-4)' }} />
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============== TARIFFS ==============
function TariffsList() {
  const [tab, setTab] = useState('plans');
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Тарифы и назначения</h1>
          <div className="page-sub">Управление платными услугами и тарифными планами</div>
        </div>
        <Btn variant="primary" icon={Icon.Plus}>{tab === 'plans' ? 'Создать тариф' : 'Назначить тариф ребёнку'}</Btn>
      </div>

      <Tabs tabs={[{id: 'plans', label: 'Тарифные планы', count: DATA.tariffs.length}, {id: 'assign', label: 'Назначения', count: 64}]} value={tab} onChange={setTab} />

      {tab === 'plans' && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Название</th><th>Тип</th><th>Применяется к</th><th className="num">Сумма</th><th>Период</th><th>Статус</th><th></th></tr></thead>
            <tbody>
              {DATA.tariffs.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.name}</strong></td>
                  <td><Badge tone={t.type === 'monthly_base' ? 'primary' : t.type === 'late_pickup' ? 'warning' : 'neutral'}>{({monthly_base:'Месячный',additional_service:'Доп. услуга',late_pickup:'Поздний забор',meal_upgrade:'Питание'})[t.type]}</Badge></td>
                  <td className="caption">{t.applies}</td>
                  <td className="num"><strong>{fmtKzt(t.amount)}</strong></td>
                  <td>{fmtDate(t.from)} → ∞</td>
                  <td>{t.active ? <Badge tone="success">Активен</Badge> : <Badge tone="neutral">Деактивирован</Badge>}</td>
                  <td className="actions"><IconBtn icon={Icon.More} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'assign' && (
        <>
          <Banner tone="info">После реактивации архивных детей назначьте им новый тариф здесь.</Banner>
          <div className="table-wrap">
            <div className="table-toolbar">
              <div style={{ width: 240 }}><Input sm icon={Icon.Search} placeholder="Поиск по ребёнку" /></div>
              <Select sm value="active" onChange={() => {}} options={[{value:'active', label:'Активные сегодня'},{value:'all', label:'Все назначения'}]} />
              <div className="spacer" />
            </div>
            <table className="table">
              <thead><tr><th>Ребёнок</th><th>Тарифный план</th><th className="num">Сумма по плану</th><th className="num">Льготная сумма</th><th>Период</th><th></th></tr></thead>
              <tbody>
                {DATA.children.slice(0, 6).map((c, i) => (
                  <tr key={c.id}>
                    <td><div className="row gap-8"><Avatar name={c.name} kind="child" /><strong>{c.name}</strong></div></td>
                    <td>{DATA.tariffs[1].name}</td>
                    <td className="num">{fmtKzt(180000)}</td>
                    <td className="num">{i === 2 ? <><strong style={{ color: 'var(--success-fg)' }}>{fmtKzt(120000)}</strong><div className="caption">льгота: многодетная семья</div></> : '—'}</td>
                    <td>{fmtDate(c.enrolled_at)} → ∞</td>
                    <td className="actions"><IconBtn icon={Icon.Edit} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ============== REFUNDS ==============
function RefundsList() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Возвраты</h1>
          <div className="page-sub">{DATA.refunds.filter(r => r.status === 'pending').length} требуют решения</div>
        </div>
        <Btn variant="primary" icon={Icon.Plus}>Создать возврат</Btn>
      </div>

      <Banner tone="warning" title="Внимание: 1 возврат ждёт решения">При архивации ребёнка автоматически создаётся возврат за неиспользованные дни — его нужно одобрить и провести вручную.</Banner>

      <div className="table-wrap">
        <div className="table-toolbar">
          <Select sm value="all" onChange={() => {}} options={[{value:'all', label:'Все статусы'},{value:'pending', label:'Ожидают'},{value:'approved', label:'Одобрены'},{value:'processed', label:'Проведены'},{value:'rejected', label:'Отклонены'}]} />
          <div className="spacer" />
        </div>
        <table className="table">
          <thead><tr><th>Ребёнок</th><th>Платёж</th><th className="num">Сумма</th><th>Причина</th><th>Статус</th><th>Дата</th><th>Действия</th></tr></thead>
          <tbody>
            {DATA.refunds.map(r => (
              <tr key={r.id}>
                <td><div className="row gap-8"><Avatar name={childById(r.child)?.name || '?'} kind="child" /><strong>{childById(r.child)?.name}</strong></div></td>
                <td className="mono caption">{r.payment}</td>
                <td className="num"><strong>{fmtKzt(r.amount)}</strong></td>
                <td>{r.reason}{r.reason === 'pro_rata_archive' && <div className="caption">Авто — архивация ребёнка</div>}</td>
                <td>{statusBadge('refund', r.status)}</td>
                <td>{fmtDate(r.date)}</td>
                <td className="actions">
                  {r.status === 'pending' && (<div className="row gap-8"><Btn size="sm">Отклонить</Btn><Btn size="sm" variant="primary">Одобрить</Btn></div>)}
                  {r.status === 'approved' && <Btn size="sm" variant="primary">Провести</Btn>}
                  {(r.status === 'processed' || r.status === 'rejected') && <IconBtn icon={Icon.More} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============== DISCOUNTS list ==============
function DiscountsList({ navigate }) {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Кастомные скидки</h1>
          <div className="page-sub">{DATA.discounts.filter(d => d.status === 'active').length} активных · {DATA.discounts.filter(d => d.status === 'draft').length} в черновиках</div>
        </div>
        <Btn variant="primary" icon={Icon.Plus} onClick={() => navigate('#/billing/discounts/new')}>Создать скидку</Btn>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div style={{ width: 240 }}><Input sm icon={Icon.Search} placeholder="Поиск по названию" /></div>
          <Select sm value="all" onChange={() => {}} options={[{value:'all', label:'Все статусы'},{value:'draft', label:'Черновики'},{value:'active', label:'Активные'},{value:'paused', label:'На паузе'},{value:'expired', label:'Истекшие'},{value:'cancelled', label:'Отменённые'}]} />
          <div className="spacer" />
        </div>
        <table className="table">
          <thead><tr><th>Название</th><th>Тип</th><th className="num">Размер</th><th>Период</th><th className="num">Применено</th><th>Приоритет</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {DATA.discounts.map(d => (
              <tr key={d.id} onClick={() => navigate(`#/billing/discounts/${d.id}`)}>
                <td><div><strong>{d.name}</strong><div className="caption">{d.id}</div></div></td>
                <td><Badge tone={d.type === 'percentage' ? 'info' : 'neutral'}>{d.type === 'percentage' ? 'Процент' : 'Фикс. сумма'}</Badge></td>
                <td className="num"><strong>{d.type === 'percentage' ? `−${d.amount}%` : `−${fmtKzt(d.amount)}`}</strong></td>
                <td className="caption">{d.period}</td>
                <td className="num">{d.used} раз</td>
                <td><Badge tone="neutral" withDot={false}>P{d.priority}</Badge></td>
                <td>{statusBadge('discount', d.status)}</td>
                <td className="actions"><IconBtn icon={Icon.More} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============== DISCOUNT wizard ==============
function DiscountWizard({ navigate, isNew }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    name_ru: '', name_kk: '', type: 'percentage', amount: 10,
    conditions_op: 'all_of',
    conditions: [{ id: 1, type: 'siblings_count', value: 2 }],
    target_type: 'all',
    valid_from: '', valid_until: '',
    max_per_child: '', total_max: '',
    priority: 10, stackable: true,
    notify: true, push_ru: '', push_kk: ''
  });

  const addCond = (type) => setData(d => ({...d, conditions: [...d.conditions, { id: Date.now(), type, value: '' }]}));
  const rmCond = (id) => setData(d => ({...d, conditions: d.conditions.filter(c => c.id !== id)}));

  return (
    <div className="page">
      <div className="row gap-8 caption mb-12">
        <a className="crumb-link" href="#/billing/discounts">Скидки</a>
        <Icon.ChevronRight style={{ width: 12, height: 12, color: 'var(--text-4)' }} />
        <span style={{ color: 'var(--text-1)' }}>{isNew ? 'Новая скидка' : 'Конструктор'}</span>
      </div>

      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Конструктор скидки</h1>
          <div className="page-sub">{isNew ? 'Создание новой скидки' : 'Редактирование'} · после активации правила и условия изменить нельзя</div>
        </div>
        <div className="row gap-8">
          <Btn>Сохранить черновик</Btn>
          <Btn variant="primary" icon={Icon.Play}>Активировать</Btn>
        </div>
      </div>

      <div className="stepper">
        {[
          { n: 1, label: 'Основное' },
          { n: 2, label: 'Условия' },
          { n: 3, label: 'Таргетинг' },
          { n: 4, label: 'Период и лимиты' },
          { n: 5, label: 'Приоритет и уведомление' },
        ].map((s, i) => (
          <div style={{display:'contents'}} key={s.n}>
            {i > 0 && <Icon.ChevronRight className="step-arrow" style={{ width: 14, height: 14 }} />}
            <div className={cx('step', step === s.n ? 'now' : step > s.n ? 'done' : '')} onClick={() => setStep(s.n)} style={{ cursor: 'pointer' }}>
              <span className="step-num">{step > s.n ? <Icon.Check style={{ width: 12, height: 12 }} /> : s.n}</span>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="two-col-right">
        <div>
          {step === 1 && (
            <Card pad={20}>
              <div className="h3 mb-16">Основные параметры скидки</div>
              <Field label="Название (RU)" required>
                <Input value={data.name_ru} onChange={(v) => setData(d => ({...d, name_ru: v}))} placeholder="Семейная: 2-й ребёнок" />
              </Field>
              <Field label="Название (KK)" required>
                <Input value={data.name_kk} onChange={(v) => setData(d => ({...d, name_kk: v}))} placeholder="Отбасылық: 2-ші бала" />
              </Field>
              <Field label="Описание"><BilingualField valueRu="" valueKk="" onChangeRu={() => {}} onChangeKk={() => {}} placeholder="Что это за скидка и кому полагается" multiline /></Field>
              <div className="field-row">
                <Field label="Тип скидки" required>
                  <Select value={data.type} onChange={(v) => setData(d => ({...d, type: v}))} options={[{value:'percentage', label:'Процент от суммы'},{value:'fixed_amount', label:'Фиксированная сумма'}]} />
                </Field>
                <Field label="Размер" required hint={data.type === 'percentage' ? 'В процентах' : 'В тенге'}>
                  <Input value={data.amount} onChange={(v) => setData(d => ({...d, amount: v}))} />
                </Field>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card pad={20}>
              <div className="row mb-12" style={{ justifyContent: 'space-between' }}>
                <div className="h3">Условия применения</div>
                <div className="cond-op-switch">
                  <button className={cx(data.conditions_op === 'all_of' && 'on')} onClick={() => setData(d => ({...d, conditions_op: 'all_of'}))}>Все (И)</button>
                  <button className={cx(data.conditions_op === 'any_of' && 'on')} onClick={() => setData(d => ({...d, conditions_op: 'any_of'}))}>Любое (ИЛИ)</button>
                </div>
              </div>
              <div className="caption mb-16">Скидка применяется, если выполнено {data.conditions_op === 'all_of' ? 'каждое' : 'хотя бы одно'} из условий.</div>

              <div className="cond-group">
                {data.conditions.map((c, i) => (
                  <div style={{display:'contents'}} key={c.id}>
                    {i > 0 && <div className="cond-and">{data.conditions_op === 'all_of' ? 'И' : 'ИЛИ'}</div>}
                    <div className="cond-row">
                      <Select sm value={c.type} onChange={() => {}} options={[
                        {value:'siblings_count', label:'Кол-во детей в семье'},
                        {value:'prepayment_months', label:'Предоплата N месяцев'},
                        {value:'age_range', label:'Возраст ребёнка'},
                        {value:'benefit_category', label:'Льготная категория'},
                        {value:'payment_method', label:'Способ оплаты'},
                        {value:'early_payment', label:'Раннее оплата (до N числа)'},
                        {value:'birthday_month', label:'Месяц дня рождения'},
                        {value:'date_range', label:'Период дат'},
                        {value:'first_invoice', label:'Первый платёж'},
                      ]} />
                      <Icon.ArrowRight style={{ width: 14, height: 14, color: 'var(--text-4)' }} />
                      <Input sm value={c.value} onChange={() => {}} placeholder="≥ 2" />
                      <IconBtn icon={Icon.X} onClick={() => rmCond(c.id)} />
                    </div>
                  </div>
                ))}
                <Btn size="sm" icon={Icon.Plus} variant="ghost" onClick={() => addCond('siblings_count')}>Добавить условие</Btn>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card pad={20}>
              <div className="h3 mb-16">Кому применять</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { id: 'all', label: 'Всем активным детям', icon: Icon.Users },
                  { id: 'groups', label: 'Конкретные группы', icon: Icon.Layers },
                  { id: 'children', label: 'Конкретные дети', icon: Icon.IdCard },
                  { id: 'tariff_types', label: 'Конкретные тарифы', icon: Icon.Tag },
                  { id: 'age_range', label: 'Возрастной диапазон', icon: Icon.Clock },
                ].map(o => (
                  <label key={o.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 12, border: `1.5px solid ${data.target_type === o.id ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: data.target_type === o.id ? 'var(--primary-soft)' : 'transparent' }} onClick={() => setData(d => ({...d, target_type: o.id}))}>
                    <o.icon style={{ width: 16, height: 16, color: data.target_type === o.id ? 'var(--primary)' : 'var(--text-3)' }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{o.label}</span>
                  </label>
                ))}
              </div>
              {data.target_type === 'groups' && (
                <Field label="Выберите группы">
                  <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                    {DATA.groups.map((g, i) => <span key={g.id} className={cx('chip', i < 2 && 'solid')}>{g.name}{i < 2 && <span className="x"><Icon.X style={{width: 10, height: 10}}/></span>}</span>)}
                  </div>
                </Field>
              )}
              {data.target_type === 'age_range' && (
                <div className="field-row">
                  <Field label="От (мес.)" required><Input value="36" /></Field>
                  <Field label="До (мес.)" required><Input value="60" /></Field>
                </div>
              )}
            </Card>
          )}

          {step === 4 && (
            <>
              <Card pad={20} className="mb-16">
                <div className="h3 mb-12">Период действия</div>
                <div className="field-row">
                  <Field label="Действует с" required><Input type="date" /></Field>
                  <Field label="Действует до" hint="Не указано — бессрочно"><Input type="date" /></Field>
                </div>
              </Card>
              <Card pad={20}>
                <div className="h3 mb-12">Лимиты использования</div>
                <div className="field-row">
                  <Field label="Макс. применений на ребёнка" hint="Пусто — без лимита"><Input placeholder="∞" /></Field>
                  <Field label="Общий лимит применений" hint="Пусто — без лимита"><Input placeholder="∞" /></Field>
                </div>
              </Card>
            </>
          )}

          {step === 5 && (
            <>
              <Card pad={20} className="mb-16">
                <div className="h3 mb-12">Приоритет и стек</div>
                <div className="field-row">
                  <Field label="Приоритет" required hint="Чем больше — тем раньше применяется"><Input value={data.priority} /></Field>
                  <Field label="Stackable" hint="Можно ли стэкать с другими скидками"><div className="mt-8"><Toggle on={data.stackable} onChange={(v) => setData(d => ({...d, stackable: v}))} label="Применять вместе с другими" /></div></Field>
                </div>
              </Card>
              <Card pad={20}>
                <div className="row mb-12" style={{ justifyContent: 'space-between' }}>
                  <div className="h3">Уведомление при активации</div>
                  <Toggle on={data.notify} onChange={(v) => setData(d => ({...d, notify: v}))} />
                </div>
                {data.notify && (
                  <>
                    <Field label="Текст push (RU + KK)"><BilingualField valueRu={data.push_ru} valueKk={data.push_kk} onChangeRu={(v) => setData(d => ({...d, push_ru: v}))} onChangeKk={(v) => setData(d => ({...d, push_kk: v}))} placeholder="Например: «Вам начислена скидка 10% — действует с 1 июня»" multiline /></Field>
                    <Banner tone="warning">Уведомление отправится всем родителям, попавшим в таргет. Убедитесь в формулировке — отозвать push нельзя.</Banner>
                  </>
                )}
              </Card>
            </>
          )}

          <div className="row mt-20 gap-8" style={{ justifyContent: 'space-between' }}>
            <Btn variant="ghost" icon={Icon.ChevronLeft} disabled={step === 1} onClick={() => setStep(step - 1)}>Назад</Btn>
            <div className="row gap-8">
              <Btn>Сохранить черновик</Btn>
              {step < 5 ? <Btn variant="primary" iconRight={Icon.ChevronRight} onClick={() => setStep(step + 1)}>Далее</Btn> : <Btn variant="primary">Завершить</Btn>}
            </div>
          </div>
        </div>

        <div className="section-stack">
          <Card pad={16}>
            <div className="h3 mb-12">Предпросмотр</div>
            <div style={{ padding: 14, background: 'linear-gradient(135deg, var(--primary-soft) 0%, var(--success-soft) 100%)', borderRadius: 10 }}>
              <div className="row gap-8" style={{ marginBottom: 8 }}>
                <Icon.Gift style={{ width: 18, height: 18, color: 'var(--primary-fg)' }} />
                <Badge tone="success">Активна</Badge>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{data.name_ru || 'Название скидки'}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: 'var(--primary-fg)' }}>
                {data.type === 'percentage' ? `−${data.amount}%` : `−${fmtKzt(data.amount || 0)}`}
              </div>
              <div className="caption mt-8">Приоритет {data.priority} · {data.stackable ? 'stackable' : 'не stackable'}</div>
            </div>
          </Card>
          <Card pad={16}>
            <div className="h3 mb-8">Кто попадёт</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>~ 14 детей</div>
            <div className="caption">Оценка по текущему составу садика</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============== HOLIDAYS ==============
function HolidaysList() {
  const [month, setMonth] = useState(5);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const monthName = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'][month-1];
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Праздники</h1>
          <div className="page-sub">{DATA.holidays.length} дней в 2026 году · влияют на тарификацию</div>
        </div>
        <Btn variant="primary" icon={Icon.Plus}>Добавить праздник</Btn>
      </div>

      <div className="row gap-8 mb-16">
        <Btn size="sm" icon={Icon.ChevronLeft} onClick={() => setMonth(Math.max(1, month-1))}></Btn>
        <div style={{ minWidth: 180, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{monthName} 2026</div>
        <Btn size="sm" iconRight={Icon.ChevronRight} onClick={() => setMonth(Math.min(12, month+1))}></Btn>
      </div>

      <div className="two-col-right">
        <Card pad={20}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => <div key={d} className="caption text-center" style={{ fontWeight: 700 }}>{d}</div>)}
            {Array.from({ length: 3 }, (_, i) => <div key={`pad-${i}`} />)}
            {days.map(d => {
              const h = DATA.holidays.find(x => x.date === `2026-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
              return (
                <div key={d} style={{ aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: h ? 'var(--danger-soft)' : 'var(--bg-elev)', border: '1px solid var(--line)', cursor: 'pointer', fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: h ? 'var(--danger-fg)' : 'var(--text-1)' }}>{d}</div>
                  {h && <div style={{ fontSize: 9, color: 'var(--danger-fg)', textAlign: 'center', padding: '0 4px', lineHeight: 1.1, marginTop: 2 }}>не тарифицируется</div>}
                </div>
              );
            })}
          </div>
        </Card>
        <div className="section-stack">
          <Card>
            <div className="card-header"><div className="h3">Праздники в {monthName.toLowerCase()}е</div></div>
            <div>
              {DATA.holidays.filter(h => h.date.startsWith(`2026-${String(month).padStart(2,'0')}`)).map(h => (
                <div key={h.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 40, textAlign: 'center', fontWeight: 700, fontSize: 18 }}>{Number(h.date.slice(8))}</div>
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>{h.name_ru}</div>
                    <div className="caption">{h.name_kk}</div>
                  </div>
                  {!h.billable && <Badge tone="neutral">Не тариф.</Badge>}
                  <IconBtn icon={Icon.More} />
                </div>
              ))}
              {DATA.holidays.filter(h => h.date.startsWith(`2026-${String(month).padStart(2,'0')}`)).length === 0 && <Empty title="В этом месяце праздников нет" text="Добавьте дату, чтобы она не тарифицировалась" />}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============== FISCAL RECEIPTS ==============
function FiscalList() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">Фискальные чеки</h1>
          <div className="page-sub">ОФД Республики Казахстан · {DATA.fiscal.length} чеков</div>
        </div>
      </div>

      <Banner tone="info" title="Phase A: read-only">Сейчас доступен только просмотр чеков. Ручной повтор, очередь сбоев и месячные отчёты появятся в Phase B.</Banner>

      <div className="table-wrap mb-16">
        <div className="table-toolbar">
          <Select sm value="all" onChange={() => {}} options={[{value:'all', label:'Все статусы'},{value:'queued', label:'В очереди'},{value:'sent', label:'Отправлен'},{value:'success', label:'Подтверждён'},{value:'failed', label:'Ошибка'}]} />
          <div className="spacer" />
          <Btn size="sm" disabled icon={Icon.Refresh} title="Доступно в Phase B">Повторить выбранные</Btn>
        </div>
        <table className="table">
          <thead><tr><th>ID</th><th>Платёж</th><th>Провайдер</th><th>Фискальный признак</th><th>Статус</th><th>Дата</th></tr></thead>
          <tbody>
            {DATA.fiscal.map(f => (
              <tr key={f.id}>
                <td className="mono caption">{f.id}</td>
                <td className="mono caption">{f.payment}</td>
                <td>{providerLabel(f.provider)}</td>
                <td className="mono" style={{ color: 'var(--text-2)' }}>{f.sign}</td>
                <td>{statusBadge('fiscal', f.status)}</td>
                <td>{fmtDateTime(f.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Card style={{ padding: 18, opacity: 0.5 }}>
          <div className="row gap-8" style={{ justifyContent: 'space-between' }}>
            <div className="kpi-label">Очередь сбоев</div>
            <Badge tone="neutral" withDot={false}>Phase B</Badge>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>Управление ретраями и разбор причин ошибок ОФД.</div>
        </Card>
        <Card style={{ padding: 18, opacity: 0.5 }}>
          <div className="row gap-8" style={{ justifyContent: 'space-between' }}>
            <div className="kpi-label">Месячный отчёт</div>
            <Badge tone="neutral" withDot={false}>Phase B</Badge>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>Экспорт в формат, принятый ОФД РК.</div>
        </Card>
        <Card style={{ padding: 18, opacity: 0.5 }}>
          <div className="row gap-8" style={{ justifyContent: 'space-between' }}>
            <div className="kpi-label">Аудит чеков</div>
            <Badge tone="neutral" withDot={false}>Phase B</Badge>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>История попыток отправки и payload-ов от ОФД.</div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, {
  InvoicesList, InvoiceDetail, PaymentsList, PaymentDetail,
  TariffsList, RefundsList, DiscountsList, DiscountWizard,
  HolidaysList, FiscalList,
});
