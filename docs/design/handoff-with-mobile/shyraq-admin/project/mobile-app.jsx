// mobile-app.jsx — wraps mobile screens in iPhone frames on a DesignCanvas

function MFrame({ children, dark = false }) {
  return (
    <div style={{ padding: 24, background: 'transparent' }}>
      <IOSDevice width={402} height={874} dark={dark}>
        {children}
      </IOSDevice>
    </div>
  );
}

const W = 402 + 48;   // device + canvas padding
const H = 874 + 48;

function App() {
  return (
    <DesignCanvas>
      <DCSection id="auth" title="Авторизация" subtitle="Вход и подтверждение по SMS">
        <DCArtboard id="login"  label="1 · Вход"           width={W} height={H}><MFrame><ScreenLogin /></MFrame></DCArtboard>
        <DCArtboard id="otp"    label="2 · Код из SMS"     width={W} height={H}><MFrame><ScreenOtp /></MFrame></DCArtboard>
      </DCSection>

      <DCSection id="home" title="Главная" subtitle="Дашборд, уведомления, меню">
        <DCArtboard id="dashboard"     label="3 · Дашборд"         width={W} height={H}><MFrame><ScreenDashboard /></MFrame></DCArtboard>
        <DCArtboard id="notifications" label="4 · Уведомления"     width={W} height={H}><MFrame><ScreenNotifications /></MFrame></DCArtboard>
        <DCArtboard id="more"          label="5 · Меню «Ещё»"      width={W} height={H}><MFrame><ScreenMore /></MFrame></DCArtboard>
      </DCSection>

      <DCSection id="children" title="Воспитанники" subtitle="Список, карточка ребёнка, лиды">
        <DCArtboard id="children-list" label="6 · Дети"             width={W} height={H}><MFrame><ScreenChildren /></MFrame></DCArtboard>
        <DCArtboard id="child-detail"  label="7 · Карточка ребёнка" width={W} height={H}><MFrame><ScreenChildDetail /></MFrame></DCArtboard>
        <DCArtboard id="leads"         label="8 · Лиды"             width={W} height={H}><MFrame><ScreenLeads /></MFrame></DCArtboard>
      </DCSection>

      <DCSection id="groups-staff" title="Группы и сотрудники" subtitle="Структура персонала">
        <DCArtboard id="groups"        label="9 · Группы"           width={W} height={H}><MFrame><ScreenGroups /></MFrame></DCArtboard>
        <DCArtboard id="group-detail"  label="10 · Карточка группы" width={W} height={H}><MFrame><ScreenGroupDetail /></MFrame></DCArtboard>
        <DCArtboard id="staff"         label="11 · Сотрудники"      width={W} height={H}><MFrame><ScreenStaff /></MFrame></DCArtboard>
        <DCArtboard id="staff-detail"  label="12 · Карточка сотр."  width={W} height={H}><MFrame><ScreenStaffDetail /></MFrame></DCArtboard>
        <DCArtboard id="structure"     label="13 · Локации и камеры"width={W} height={H}><MFrame><ScreenStructure /></MFrame></DCArtboard>
      </DCSection>

      <DCSection id="day" title="Режим дня" subtitle="Расписание, меню, контент">
        <DCArtboard id="schedule"      label="14 · Расписание"      width={W} height={H}><MFrame><ScreenSchedule /></MFrame></DCArtboard>
        <DCArtboard id="meals"         label="15 · Меню"            width={W} height={H}><MFrame><ScreenMeals /></MFrame></DCArtboard>
        <DCArtboard id="content"       label="16 · Контент"         width={W} height={H}><MFrame><ScreenContent /></MFrame></DCArtboard>
      </DCSection>

      <DCSection id="ops" title="Операции" subtitle="Заявки и посещаемость">
        <DCArtboard id="requests"   label="17 · Заявки родителей"  width={W} height={H}><MFrame><ScreenRequests /></MFrame></DCArtboard>
        <DCArtboard id="attendance" label="18 · Посещаемость"      width={W} height={H}><MFrame><ScreenAttendance /></MFrame></DCArtboard>
      </DCSection>

      <DCSection id="billing" title="Биллинг" subtitle="Счета, оплаты, тарифы">
        <DCArtboard id="invoices"        label="19 · Счета"           width={W} height={H}><MFrame><ScreenInvoices /></MFrame></DCArtboard>
        <DCArtboard id="invoice-detail"  label="20 · Карточка счёта"  width={W} height={H}><MFrame><ScreenInvoiceDetail /></MFrame></DCArtboard>
        <DCArtboard id="payments"        label="21 · Оплаты"          width={W} height={H}><MFrame><ScreenPayments /></MFrame></DCArtboard>
        <DCArtboard id="payment-detail"  label="22 · Карточка оплаты" width={W} height={H}><MFrame><ScreenPaymentDetail /></MFrame></DCArtboard>
        <DCArtboard id="tariffs"         label="23 · Тарифы"          width={W} height={H}><MFrame><ScreenTariffs /></MFrame></DCArtboard>
        <DCArtboard id="refunds"         label="24 · Возвраты"        width={W} height={H}><MFrame><ScreenRefunds /></MFrame></DCArtboard>
        <DCArtboard id="discounts"       label="25 · Скидки"          width={W} height={H}><MFrame><ScreenDiscounts /></MFrame></DCArtboard>
        <DCArtboard id="discount-wizard" label="26 · Новая скидка"    width={W} height={H}><MFrame><ScreenDiscountWizard /></MFrame></DCArtboard>
        <DCArtboard id="holidays"        label="27 · Праздники"       width={W} height={H}><MFrame><ScreenHolidays /></MFrame></DCArtboard>
        <DCArtboard id="fiscal"          label="28 · Фискальные чеки" width={W} height={H}><MFrame><ScreenFiscal /></MFrame></DCArtboard>
      </DCSection>

      <DCSection id="system" title="Операции и система" subtitle="Диагностика, Face ID, сбои, настройки">
        <DCArtboard id="diagnostics" label="29 · Диагностика"      width={W} height={H}><MFrame><ScreenDiagnostics /></MFrame></DCArtboard>
        <DCArtboard id="face-id"     label="30 · Face ID"           width={W} height={H}><MFrame><ScreenFaceId /></MFrame></DCArtboard>
        <DCArtboard id="dlq"         label="31 · Сбойные задачи"    width={W} height={H}><MFrame><ScreenDlq /></MFrame></DCArtboard>
        <DCArtboard id="settings"    label="32 · Настройки садика"  width={W} height={H}><MFrame><ScreenSettings /></MFrame></DCArtboard>
        <DCArtboard id="error"       label="33 · 404"               width={W} height={H}><MFrame><ScreenError /></MFrame></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
