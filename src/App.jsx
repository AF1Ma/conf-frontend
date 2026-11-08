import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, Bell, Bookmark, CalendarDays, CalendarPlus, ChevronDown, Clock3, Compass,
  LayoutDashboard, LogOut, MapPin, Menu, Orbit, Settings, ShieldCheck, UserRound, X, CircleAlert,
} from 'lucide-react';
import Calendar from './components/Calendar';
import ConferenceDialog from './components/ConferenceDialog';
import AuthModal from './components/AuthModal';
import CreateConferenceModal from './components/CreateConferenceModal';
import { errorMessage } from './api';
import Modal from './components/Modal';
import ModerationPanel from './components/ModerationPanel';
import { dayKey, eventTone, monthName, shortDate, formatTime } from './dates';
import { useApiList, useAuth, useLocalState } from './hooks';
import './App.css';

const PAGES = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'schedule', label: 'My Schedule', icon: CalendarDays },
  { key: 'venues', label: 'Venues', icon: MapPin },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'organizer', label: 'Organizer', icon: ShieldCheck },
];
const ROLE_NAMES = { Listener: 'Участник', Organizer: 'Организатор' };
const PAGE_COPY = {
  dashboard: ['Календарь конференций', 'Открой программу конференций, сохрани интересные события и подай свой доклад.'],
  schedule: ['Моё расписание', 'Конференции, которые ты сохранил. Список хранится в этом браузере.'],
  venues: ['Площадки', 'Посмотри, где проходят конференции, и открой подробности события.'],
  settings: ['Настройки', 'Управляй профилем и настройками уведомлений.'],
  organizer: ['Панель организатора', 'Рассматривай заявки спикеров и отслеживай принятые решения.'],
};

function pageFromHash() {
  const key = window.location.hash.slice(1);
  return PAGES.some((page) => page.key === key) ? key : 'dashboard';
}

function ProfileAvatar({ user }) {
  return <span className="profile-avatar" aria-hidden="true">
    {user ? (user.fullName || user.email || 'П').trim().slice(0, 1).toUpperCase() : <UserRound size={19} />}
  </span>;
}

function EventRow({ event, onOpen }) {
  return (
    <button type="button" className="event-row" onClick={() => onOpen(event)}>
      <span className={'event-date tone-' + eventTone(event.id)}>{shortDate(event.startDate)}</span>
      <span className="event-row-copy">
        <strong>{event.title}</strong>
        <span>{event.location || 'Площадка уточняется'}</span>
      </span>
      <ArrowUpRight size={17} className="event-arrow" aria-hidden="true" />
    </button>
  );
}

function EmptyState({ icon: Icon, title, description, children }) {
  return <div className="empty-state"><Icon size={26} /><h2>{title}</h2><p>{description}</p>{children}</div>;
}

function Stats({ month, monthly, upcoming, savedCount }) {
  return (
    <div className="stats">
      <article className="stat">
        <span className="stat-icon tone-blue"><CalendarDays size={21} /></span>
        <div><p>События в месяце</p><strong>{monthly}</strong><small>{monthName(month)}</small></div>
      </article>
      <article className="stat">
        <span className="stat-icon tone-mint"><Clock3 size={21} /></span>
        <div><p>Ближайшее событие</p><strong>{upcoming ? shortDate(upcoming.startDate) : '—'}</strong>
          <small title={upcoming?.title}>{upcoming?.title ?? 'Анонсов пока нет'}</small></div>
      </article>
      <article className="stat">
        <span className="stat-icon tone-violet"><Bookmark size={21} /></span>
        <div><p>Моё расписание</p><strong>{savedCount}</strong><small>Сохранённые конференции</small></div>
      </article>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState(pageFromHash);
  const [mobileNav, setMobileNav] = useState(false);
  const today = dayKey(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const upgradeInFlight = useRef(false);
  const [savedIds, setSavedIds] = useLocalState('science-conferences.schedule', []);
  const [notifications, setNotifications] = useLocalState('science-conferences.notifications', true);
  const bell = useRef(null);
  const auth = useAuth();
  const conferences = useApiList('/conferences');
  const sorted = [...conferences.items].sort((left, right) => String(left.startDate).localeCompare(String(right.startDate)));
  const inMonth = sorted.filter((event) => dayKey(event.startDate).startsWith(month));
  const upcoming = sorted.filter((event) => dayKey(event.startDate) >= today);
  const saved = sorted.filter((event) => savedIds.includes(event.id));
  const agenda = inMonth.length ? inMonth : upcoming.length ? upcoming.slice(0, 4)
    : sorted.filter((event) => dayKey(event.startDate)).slice(-4).reverse();
  const venues = new Map();
  for (const event of sorted) {
    if (!event.location) continue;
    if (!venues.has(event.location)) venues.set(event.location, []);
    venues.get(event.location).push(event);
  }

  useEffect(() => {
    const onNavigate = () => {
      setPage(pageFromHash());
      setMobileNav(false);
      if (bell.current) bell.current.open = false;
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onNavigate);
    return () => window.removeEventListener('hashchange', onNavigate);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(timer);
  }, [toast]);

  function notify(message, kind = "success") { setToast({ message, kind }); }
  function openConference(conference) {
    if (bell.current) bell.current.open = false;
    setDialog({ type: 'conference', conference });
  }
  function openProfile() {
    if (upgradeInFlight.current) return;
    if (bell.current) bell.current.open = false;
    setDialog({ type: auth.user ? 'profile' : 'auth' });
  }
  function signOut() {
    if (upgradeInFlight.current) return;
    auth.signOut();
    setDialog(null);
    notify('Ты вышел из аккаунта.');
  }
  async function becomeOrganizer() {
    if (upgradeInFlight.current) return;
    upgradeInFlight.current = true;
    setUpgrading(true);
    try {
      await auth.becomeOrganizer();
      notify('Роль организатора активирована.');
    } catch (error) {
      notify(errorMessage(error), 'error');
    } finally {
      upgradeInFlight.current = false;
      setUpgrading(false);
    }
  }
  function conferenceCreated(conference, startDate) {
    const key = dayKey(startDate);
    if (key) setMonth(key.slice(0, 7));
    if (page !== 'dashboard') window.location.hash = 'dashboard';
    conferences.reload();
    setDialog(conference?.id && conference.title ? { type: 'conference', conference } : null);
    notify('Конференция создана.');
  }
  function toggleSave(id) {
    const wasSaved = savedIds.includes(id);
    setSavedIds((previous) => wasSaved ? previous.filter((item) => item !== id) : [...previous, id]);
    notify(wasSaved ? 'Событие убрано из расписания.' : 'Событие добавлено в расписание.');
  }

  const [title, description] = PAGE_COPY[page];
  const active = PAGES.find((item) => item.key === page);
  const selected = dialog?.conference;
  const profile = auth.user;
  const isOrganizer = profile?.role === 'Organizer';
  const isListener = profile?.role === 'Listener';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content').focus(); }}>К содержимому</a>
      {mobileNav && <button className="mobile-backdrop" type="button" onClick={() => setMobileNav(false)} aria-label="Закрыть навигацию" />}
      <aside id="sidebar" className={'sidebar' + (mobileNav ? ' sidebar-open' : '')}>
        <a className="brand" href="#dashboard" onClick={() => setMobileNav(false)}>
          <span className="brand-mark"><Orbit size={26} /></span>
          <span>Science<span className="brand-subtitle">Conferences</span></span>
        </a>
        <p className="nav-label">РАБОЧАЯ ОБЛАСТЬ</p>
        <nav aria-label="Основная навигация">
          {PAGES.map(({ key, label, icon: Icon }) => (
            <a key={key} className={'nav-link' + (page === key ? ' active' : '') + (key === 'organizer' ? ' organizer-link' : '')}
              href={'#' + key} onClick={() => setMobileNav(false)} aria-current={page === key ? 'page' : undefined}>
              <Icon size={19} aria-hidden="true" /> {label}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-footer-icon"><Compass size={20} /></span>
          <div><strong>Science Conferences</strong><small>Платформа мероприятий</small></div>
        </div>
      </aside>

      <div className="workspace">
        <header className={'topbar' + (isListener ? ' has-role-action' : '')}>
          <div className="breadcrumb">
            <button type="button" className="icon-button mobile-menu" aria-label={mobileNav ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={mobileNav} aria-controls="sidebar" onClick={() => setMobileNav(!mobileNav)}>
              {mobileNav ? <X size={21} /> : <Menu size={21} />}
            </button>
            <span className="breadcrumb-root">Рабочая область</span><span className="breadcrumb-divider">/</span>
            <span className="breadcrumb-active">{active.label}</span>
          </div>
          <div className="header-actions">
            {isListener && <button type="button" className="button secondary promote-button" onClick={becomeOrganizer} disabled={upgrading}>
              <ShieldCheck size={17} /> {upgrading ? 'Меняем роль…' : 'Стать организатором'}
            </button>}
            <details ref={bell} className="notifications" onKeyDown={(event) => {
              if (event.key === 'Escape' && bell.current.open) { bell.current.open = false; bell.current.querySelector('summary').focus(); }
            }}>
              <summary className="icon-button notification-toggle" aria-label="Уведомления" title="Уведомления">
                <Bell size={21} /> {notifications && upcoming.length > 0 && <span className="notification-dot" />}
              </summary>
              <div className="notification-panel">
                <h2>Уведомления</h2>
                {!notifications ? <p className="muted">Уведомления отключены в настройках.</p>
                  : upcoming.length ? upcoming.slice(0, 3).map((event) => <EventRow key={event.id} event={event} onOpen={openConference} />)
                  : <p className="muted">Ближайших событий пока нет.</p>}
              </div>
            </details>
            <button type="button" className="profile-button" onClick={openProfile} disabled={auth.checking || upgrading} aria-label={profile ? 'Личный профиль' : 'Личный профиль / Войти'}>
              <ProfileAvatar user={profile} />
              <span><strong>{profile?.fullName || 'Личный профиль'}</strong>
                <small>{auth.checking ? 'Проверяем вход…' : profile ? ROLE_NAMES[profile.role] : 'Войти'}</small>
              </span>
              <ChevronDown size={16} className="profile-chevron" />
            </button>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="workspace-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow"><span /> SCIENCE CONFERENCES</p>
              <h1>{title}</h1>
              <p className="page-description">{description}</p>
            </div>
            {isOrganizer && ['dashboard', 'organizer'].includes(page) && <button type="button" className="button primary create-event-button"
              onClick={() => setDialog({ type: 'create-conference' })}><CalendarPlus size={18} /> Создать конференцию</button>}
          </div>

          {page === 'dashboard' && <>
            <Stats month={month} monthly={inMonth.length} upcoming={upcoming[0]} savedCount={saved.length} />
            <div className="dashboard-grid">
              <Calendar month={month} onMonth={setMonth} today={today} conferences={sorted}
                onConference={openConference} loading={conferences.loading} error={conferences.error} onRetry={conferences.reload} />
              <aside className="agenda">
                <section className="panel agenda-panel" aria-labelledby="agenda-title">
                  <div className="agenda-heading">
                    <span className="stat-icon tone-mint"><Compass size={20} /></span>
                    <h2 id="agenda-title">{inMonth.length ? 'События месяца' : upcoming.length ? 'Ближайшие события' : 'Афиша'}</h2>
                  </div>
                  {agenda.length > 0 ? <div className="agenda-events">
                    {agenda.map((event) => <EventRow key={event.id} event={event} onOpen={openConference} />)}
                  </div> : <p className="muted agenda-empty">{conferences.loading ? 'Загружаем афишу…' : conferences.error ? 'Афиша недоступна.' : 'Конференций пока нет.'}</p>}
                  {!inMonth.length && agenda[0] && <button type="button" className="text-button agenda-jump"
                    onClick={() => setMonth(dayKey(agenda[0].startDate).slice(0, 7))}>К месяцу событий <ArrowRight size={16} /></button>}
                </section>
                <div className="agenda-note"><MapPin size={18} /><p>Даты и время на платформе указаны по Москве.</p></div>
              </aside>
            </div>
          </>}

          {(page === 'schedule' || page === 'venues') && conferences.loading && <p role="status">Загружаем конференции…</p>}
          {(page === 'schedule' || page === 'venues') && conferences.error && <p className="form-alert" role="alert">
            {conferences.error} <button type="button" className="text-button" onClick={conferences.reload}>Повторить</button>
          </p>}
          {page === 'schedule' && !conferences.loading && !conferences.error && (
            <section className="panel list-panel">
              {saved.length ? saved.map((event) => <div className="schedule-row" key={event.id}>
                <EventRow event={event} onOpen={openConference} />
                <span className="muted schedule-time">{formatTime(event.startDate)} МСК</span>
                <button type="button" className="icon-button remove-bookmark" onClick={() => toggleSave(event.id)}
                  title="Убрать из расписания" aria-label={'Убрать из расписания: ' + event.title}><Bookmark size={19} fill="currentColor" /></button>
              </div>) : <EmptyState icon={Bookmark} title="Расписание пока пустое"
                description="Открой конференцию в календаре и нажми «В расписание».">
                <a href="#dashboard" className="button primary">Открыть календарь <ArrowRight size={17} /></a>
              </EmptyState>}
            </section>
          )}
          {page === 'venues' && !conferences.loading && !conferences.error && (
            venues.size ? <div className="venue-grid">{Array.from(venues, ([location, events]) => (
              <section className="panel venue-panel" key={location}>
                <div className="venue-heading"><span className="stat-icon tone-blue"><MapPin size={20} /></span><h2>{location}</h2></div>
                {events.map((event) => <EventRow key={event.id} event={event} onOpen={openConference} />)}
              </section>
            ))}</div> : <section className="panel"><EmptyState icon={MapPin} title="Площадки пока не добавлены"
              description="Они появятся здесь, когда организаторы укажут места проведения." /></section>
          )}
          {page === 'settings' && <section className="panel settings-panel">
            <div className="settings-row"><ProfileAvatar user={profile} /><div><h2>Личный профиль</h2>
              <p>{profile ? profile.email : 'Войди или создай аккаунт на платформе.'}</p></div>
              <button type="button" className="button secondary" onClick={openProfile} disabled={auth.checking || upgrading}>{profile ? 'Открыть профиль' : 'Войти'}</button>
            </div>
            <div className="settings-row"><span className="stat-icon tone-mint"><Bell size={19} /></span>
              <div><h2>Уведомления о событиях</h2><p>Показывать ближайшие конференции в меню уведомлений.</p></div>
              <label className="switch"><input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)}
                aria-label="Уведомления о событиях" /><span /></label>
            </div>
          </section>}
          {page === 'organizer' && (
            auth.checking ? <p role="status">Проверяем доступ…</p> :
            isOrganizer ? <ModerationPanel key={profile.id} token={auth.token} notify={notify} /> :
            <section className="panel">
              <EmptyState icon={ShieldCheck} title="Доступ для организаторов"
                description={profile ? 'Активируй роль организатора, чтобы создавать конференции и рассматривать заявки.' :
                  auth.verificationError || 'Войди в аккаунт организатора, чтобы рассматривать заявки.'}>
                {profile ? <button type="button" className="button primary" disabled={upgrading} onClick={becomeOrganizer}>
                  <ShieldCheck size={17} /> {upgrading ? 'Меняем роль…' : 'Стать организатором'}
                </button> :
                  <button type="button" className="button primary" onClick={openProfile}>Войти <ArrowRight size={17} /></button>}
              </EmptyState>
            </section>
          )}
          <footer className="workspace-footer">Science Conferences <span>·</span> Платформа научных мероприятий</footer>
        </main>
      </div>

      {dialog?.type === 'auth' && <AuthModal onClose={() => setDialog(null)} onSuccess={(result, message, email) => {
        auth.signIn(result, email); setDialog(null); notify(message);
      }} />}
      {dialog?.type === 'profile' && profile && <Modal id="profile-title" narrow onDismiss={() => setDialog(null)}>
        <ProfileAvatar user={profile} />
        <p className="eyebrow profile-eyebrow">ЛИЧНЫЙ ПРОФИЛЬ</p>
        <h2 id="profile-title">{profile.fullName || profile.email}</h2>
        <p className="muted">{[profile.email, ROLE_NAMES[profile.role]].filter(Boolean).join(' · ')}</p>
        <div className="modal-actions"><button type="button" className="button secondary" onClick={signOut}><LogOut size={17} /> Выйти</button></div>
      </Modal>}
      {dialog?.type === 'create-conference' && isOrganizer && <CreateConferenceModal organizerId={profile.id}
        token={auth.token} onClose={() => setDialog(null)} onCreated={conferenceCreated} />}
      {dialog?.type === 'conference' && <ConferenceDialog key={selected.id} conference={selected} token={auth.token} user={profile}
        onTrackCreated={() => notify('Секция добавлена.')}
        saved={savedIds.includes(selected.id)} onSave={() => toggleSave(selected.id)} onClose={() => setDialog(null)}
        onSubmitted={() => { setDialog(null); notify('Заявка успешно отправлена на модерацию'); }} />}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && <div className={'toast' + (toast.kind === 'error' ? ' toast-error' : '')}>
          {toast.kind === 'error' ? <CircleAlert size={22} /> : <ShieldCheck size={22} />}<span>{toast.message}</span>
          <button type="button" className="icon-button" onClick={() => setToast(null)} aria-label="Закрыть уведомление"><X size={17} /></button>
        </div>}
      </div>
    </div>
  );
}
