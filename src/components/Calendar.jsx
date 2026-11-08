import { CalendarDays, ChevronLeft, ChevronRight, CircleHelp } from 'lucide-react';
import { calendarDays, dayKey, eventTone, monthName, shiftMonth } from '../dates';

const WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEK_LONG = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export default function Calendar({ month, onMonth, today, conferences, onConference, loading, error, onRetry }) {
  const byDay = new Map();
  conferences.forEach((conference) => {
    const key = dayKey(conference.startDate);
    if (key) byDay.set(key, [...(byDay.get(key) ?? []), conference]);
  });
  const days = calendarDays(month);
  const inMonth = conferences.some((conference) => dayKey(conference.startDate).startsWith(month));

  return (
    <section className="panel calendar-panel" aria-labelledby="calendar-title">
      <div className="calendar-toolbar">
        <div className="calendar-title">
          <CalendarDays size={20} aria-hidden="true" />
          <h2 id="calendar-title" aria-live="polite">{monthName(month)}</h2>
        </div>
        <div className="calendar-controls">
          <button type="button" className="button secondary compact" onClick={() => onMonth(today.slice(0, 7))}>Сегодня</button>
          <div className="month-arrows">
            <button type="button" className="icon-button" onClick={() => onMonth(shiftMonth(month, -1))} aria-label="Предыдущий месяц"><ChevronLeft size={19} /></button>
            <button type="button" className="icon-button" onClick={() => onMonth(shiftMonth(month, 1))} aria-label="Следующий месяц"><ChevronRight size={19} /></button>
          </div>
        </div>
      </div>
      {loading && <p className="calendar-message" role="status">Загружаем конференции…</p>}
      {error && <div className="calendar-message error-message" role="alert">
        <span>{error}</span><button type="button" className="text-button" onClick={onRetry}>Повторить</button>
      </div>}
      <div className="calendar-weekdays">
        {WEEK.map((label, index) => <span key={label} title={WEEK_LONG[index]}>{label}</span>)}
      </div>
      <div className="calendar-grid">
        {days.map((day) => (
          <div key={day.key} className={'calendar-day' + (!day.inMonth ? ' outside' : '') + (day.key === today ? ' today' : '')}>
            <time dateTime={day.key} className="day-number" aria-current={day.key === today ? 'date' : undefined}>{day.number}</time>
            {(byDay.get(day.key) ?? []).map((conference) => (
              <button key={conference.id} type="button" className={'event-chip tone-' + eventTone(conference.id)}
                title={conference.title} aria-label={conference.title + ', ' + day.key} onClick={() => onConference(conference)}>
                <span className="event-dot" /><span className="event-title">{conference.title}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="calendar-foot">
        <span><CircleHelp size={15} /> {loading || error || inMonth ? 'Нажми на событие, чтобы открыть подробности' : 'В этом месяце нет конференций'}</span>
        <span>Время · МСК</span>
      </div>
    </section>
  );
}
