export const TIME_ZONE = 'Europe/Moscow';

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});
const fullDateFormat = new Intl.DateTimeFormat('ru-RU', {
  timeZone: TIME_ZONE, dateStyle: 'long', timeStyle: 'short',
});
const shortDateFormat = new Intl.DateTimeFormat('ru-RU', {
  timeZone: TIME_ZONE, day: 'numeric', month: 'short',
});
const timeFormat = new Intl.DateTimeFormat('ru-RU', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
const monthFormat = new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', month: 'long', year: 'numeric' });

function parse(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dayKey(value) {
  const date = parse(value);
  if (!date) return '';
  const parts = Object.fromEntries(dayKeyFormat.formatToParts(date).map(({ type, value }) => [type, value]));
  return [parts.year, parts.month, parts.day].join('-');
}

function monthDate(month, offset = 0) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1));
}

export function shiftMonth(month, offset) {
  return monthDate(month, offset).toISOString().slice(0, 7);
}

export function monthName(month) {
  const text = monthFormat.format(monthDate(month));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function calendarDays(month) {
  const first = monthDate(month);
  const daysInMonth = new Date(monthDate(month, 1) - 1).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const length = Math.max(35, Math.ceil((offset + daysInMonth) / 7) * 7);
  return Array.from({ length }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(1 + index - offset);
    const key = date.toISOString().slice(0, 10);
    return { key, number: date.getUTCDate(), inMonth: key.startsWith(month) };
  });
}

export function formatDate(value) {
  const date = parse(value);
  return date ? fullDateFormat.format(date) : 'Уточняется';
}

export function shortDate(value) {
  const date = parse(value);
  return date ? shortDateFormat.format(date) : 'Дата уточняется';
}

export function formatTime(value) {
  const date = parse(value);
  return date ? timeFormat.format(date) : '';
}

export function eventTone(id) {
  const value = Array.from(String(id)).reduce((hash, char) => (hash * 31 + char.codePointAt(0)) >>> 0, 0);
  return ['blue', 'mint', 'violet'][value % 3];
}
