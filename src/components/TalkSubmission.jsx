import { useRef, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { apiRequest, errorMessage } from '../api';

export default function TalkSubmission({ tracks, token, busy, setBusy, onSuccess, onBack }) {
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    const payload = {
      title: data.get('title').trim(),
      abstract: data.get('abstract').trim(),
      trackId: data.get('trackId'),
      speakerId: data.get('speakerId').trim(),
    };
    if (!payload.title || !payload.speakerId || !tracks.some((track) => String(track.id) === payload.trackId)) {
      setError('Укажи тему, ID спикера и выбери секцию этой конференции.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/talk-submissions', { token, method: 'POST', json: payload }, 201);
      onSuccess();
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
        <label>Тема выступления <span className="required">*</span>
          <input name="title" required maxLength={240} placeholder="Например, тестирование распределённых систем" />
        </label>
        <label>Краткие тезисы <textarea name="abstract" rows={4} maxLength={6000} placeholder="Расскажи, о чём будет доклад" /></label>
        <div className="form-columns">
          <label>Секция <span className="required">*</span>
            <select name="trackId" required defaultValue="">
              <option value="" disabled>Выбери секцию</option>
              {tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}
            </select>
          </label>
          <label>ID спикера <input name="speakerId" required defaultValue="speaker-1" maxLength={120} /></label>
        </div>
      </fieldset>
      {error && <p className="form-alert" role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={onBack} disabled={busy}><ArrowLeft size={16} /> Назад</button>
        <button type="submit" className="button primary" disabled={busy}><Send size={16} /> {busy ? 'Отправляем…' : 'Отправить на модерацию'}</button>
      </div>
    </form>
  );
}
