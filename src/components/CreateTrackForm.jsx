import { useRef, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { apiRequest, errorMessage } from '../api';

export default function CreateTrackForm({ conferenceId, token, busy, setBusy, onBack, onCreated }) {
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const name = new FormData(event.currentTarget).get('name').trim();
    if (!name) {
      setError('Введи название секции.');
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/tracks', { token, method: 'POST', json: { conferenceId, name } });
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form className="stack-form" onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy}>
        <label>Название секции <input name="name" required maxLength={120} placeholder="Например, Анализ данных" /></label>
      </fieldset>
      {error && <p className="form-alert" role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={onBack} disabled={busy}><ArrowLeft size={16} /> Назад</button>
        <button type="submit" className="button primary" disabled={busy}><Plus size={17} /> {busy ? 'Добавляем…' : 'Добавить секцию'}</button>
      </div>
    </form>
  );
}
