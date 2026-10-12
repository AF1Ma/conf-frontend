import { useRef, useState } from 'react';
import { apiRequest } from '../api';
import SubmissionsList from './SubmissionsList';

const EMPTY_FORM = { title: '', abstract: '', speakerId: 'speaker-1', trackId: 'track-backend' };

export default function TalkSubmission() {
  const dialog = useRef(null);
  const submitting = useRef(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [revision, setRevision] = useState(0);

  function open() {
    setError('');
    setSuccess('');
    dialog.current.showModal();
  }

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    const payload = { ...form, title: form.title.trim(), abstract: form.abstract.trim(), speakerId: form.speakerId.trim() };
    if (!payload.title || !payload.speakerId) {
      setError('Укажи тему выступления и ID спикера. Одних пробелов недостаточно.');
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/talk-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, 201);
      dialog.current.close();
      setForm(EMPTY_FORM);
      setRevision((value) => value + 1);
      setSuccess('Заявка успешно отправлена на модерацию со статусом Submitted');
    } catch (err) {
      setError(err instanceof TypeError
        ? 'Нет связи с сервером. Проверь подключение. Перед повторной отправкой проверь список заявок: сервер мог сохранить запрос.'
        : err.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="cfp" aria-label="Подача доклада">
      <div className="cfp-actions">
        <button type="button" onClick={open}>Подать доклад спикером</button>
        <button type="button" className="secondary" aria-expanded={showSubmissions} onClick={() => setShowSubmissions(!showSubmissions)}>
          {showSubmissions ? 'Скрыть заявки' : 'Посмотреть поданные заявки'}
        </button>
        {showSubmissions && <button type="button" className="secondary" onClick={() => setRevision((value) => value + 1)}>Обновить заявки</button>}
      </div>
      {success && <div className="notice success" role="status">{success}</div>}
      {showSubmissions && <SubmissionsList key={revision} />}
      <dialog ref={dialog} className="cfp-dialog" aria-labelledby="cfp-title"
        onCancel={(event) => { if (submitting.current) event.preventDefault(); }}>
        <div className="dialog-heading">
          <div><p className="eyebrow">CALL FOR PAPERS</p><h2 id="cfp-title">Предложите свой доклад</h2></div>
          <button type="button" className="secondary" aria-label="Закрыть форму" disabled={busy}
            onClick={() => dialog.current.close()}>×</button>
        </div>
        <p className="description">Расскажите о своей идее — организаторы рассмотрят заявку.</p>
        <form onSubmit={submit} aria-busy={busy}>
          <fieldset disabled={busy}>
            <label htmlFor="talk-title">Тема выступления <span aria-hidden="true">*</span></label>
            <input id="talk-title" name="title" value={form.title} onChange={change} required />
            <label htmlFor="talk-abstract">Краткие тезисы</label>
            <textarea id="talk-abstract" name="abstract" value={form.abstract} onChange={change} rows={5} />
            <label htmlFor="talk-speaker">Имя спикера / ID <span aria-hidden="true">*</span></label>
            <input id="talk-speaker" name="speakerId" value={form.speakerId} onChange={change} required aria-describedby="speaker-hint" />
            <small id="speaker-hint">В API отправляется ID спикера. Для демонстрации: speaker-1.</small>
            <label htmlFor="talk-track">Секция</label>
            <select id="talk-track" name="trackId" value={form.trackId} onChange={change}>
              <option value="track-backend">Backend</option>
              <option value="track-frontend">Frontend</option>
              <option value="track-devops">DevOps</option>
            </select>
          </fieldset>
          {error && <p className="notice error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="secondary" type="button" disabled={busy} onClick={() => dialog.current.close()}>Отмена</button>
            <button type="submit" disabled={busy}>{busy ? 'Отправляем…' : 'Отправить на модерацию'}</button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
