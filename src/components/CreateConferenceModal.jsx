import { useRef, useState } from 'react';
import { CalendarPlus, Plus } from 'lucide-react';
import { apiRequest, errorMessage } from '../api';
import Modal from './Modal';

function moscowDateToIso(value) {
  if (!value) return '';
  // The form labels both datetime-local inputs as Moscow time (UTC+3).
  const date = new Date(value + '+03:00');
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export default function CreateConferenceModal({ organizerId, token, onClose, onCreated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      title: form.get('title').trim(),
      description: form.get('description').trim(),
      startDate: moscowDateToIso(form.get('startDate')),
      endDate: moscowDateToIso(form.get('endDate')),
      location: form.get('location').trim(),
      organizerId,
    };
    if (!payload.title || !payload.location || !payload.startDate || !payload.endDate) {
      setError('Заполни название, место проведения и обе даты.');
      return;
    }
    if (payload.endDate <= payload.startDate) {
      setError('Окончание должно быть позже начала.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest('/conferences', { token, method: 'POST', json: payload });
      onCreated(result?.conference ?? result, payload.startDate);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal id="create-conference-title" busy={busy} onDismiss={onClose}>
      <div className="modal-emblem"><CalendarPlus size={24} /></div>
      <p className="eyebrow">ОРГАНИЗАТОР</p>
      <h2 id="create-conference-title">Создать конференцию</h2>
      <p className="muted modal-intro">Конференция появится в календаре. Секции можно добавить в её карточке.</p>
      <form className="stack-form" onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy}>
          <label>Название <input name="title" required maxLength={160} placeholder="Например, Школа молодых исследователей" /></label>
          <label>Описание <textarea name="description" rows={4} maxLength={6000} placeholder="О чём конференция и для кого она" /></label>
          <div className="form-columns conference-dates">
            <label>Начало · МСК <input type="datetime-local" name="startDate" required /></label>
            <label>Окончание · МСК <input type="datetime-local" name="endDate" required /></label>
          </div>
          <label>Место проведения <input name="location" required maxLength={180} placeholder="Аудитория, адрес или онлайн" /></label>
        </fieldset>
        {error && <p className="form-alert" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose} disabled={busy}>Отмена</button>
          <button type="submit" className="button primary" disabled={busy}><Plus size={17} /> {busy ? 'Создаём…' : 'Создать конференцию'}</button>
        </div>
      </form>
    </Modal>
  );
}
