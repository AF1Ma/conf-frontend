import { useState } from 'react';
import { Bookmark, CalendarDays, Layers3, MapPin, Mic2 } from 'lucide-react';
import { formatDate } from '../dates';
import { useApiList } from '../hooks';
import Modal from './Modal';
import TalkSubmission from './TalkSubmission';

export default function ConferenceDialog({ conference, saved, onSave, onClose, token, onSubmitted }) {
  const [stage, setStage] = useState('details');
  const [busy, setBusy] = useState(false);
  const { items: tracks, loading, error, reload } = useApiList('/tracks?' +
    new URLSearchParams({ conferenceId: conference.id }));
  const submitting = stage === 'submission';

  return (
    <Modal id="conference-title" busy={busy} onDismiss={onClose}>
      <div className="modal-emblem">{submitting ? <Mic2 size={24} /> : <CalendarDays size={24} />}</div>
      <p className="eyebrow">{submitting ? 'ПОДАЧА ДОКЛАДА' : 'КОНФЕРЕНЦИЯ'}</p>
      <h2 id="conference-title">{submitting ? 'Подать доклад' : conference.title}</h2>
      {submitting ? (
        <>
          <p className="muted modal-intro">{conference.title}</p>
          <TalkSubmission tracks={tracks} token={token} busy={busy} setBusy={setBusy}
            onBack={() => setStage('details')} onSuccess={onSubmitted} />
        </>
      ) : (
        <>
          <div className="conference-facts">
            <div><CalendarDays size={18} /><span><small>Даты проведения · МСК</small>
              <strong>{formatDate(conference.startDate)}</strong>
              {conference.endDate && <span className="muted">до {formatDate(conference.endDate)}</span>}
            </span></div>
            <div><MapPin size={18} /><span><small>Место проведения</small><strong>{conference.location || 'Уточняется'}</strong></span></div>
          </div>
          <h3 className="modal-section-title">О конференции</h3>
          <p className="conference-description">{conference.description || 'Описание пока не добавлено.'}</p>
          <h3 className="modal-section-title"><Layers3 size={17} /> Секции</h3>
          {loading && <p className="muted" role="status">Загружаем секции…</p>}
          {error && <p className="form-alert" role="alert">{error} <button type="button" className="text-button" onClick={reload}>Повторить</button></p>}
          {!loading && !error && tracks.length === 0 && <p className="muted">Секции пока не добавлены. Подать доклад можно, когда появится секция.</p>}
          {tracks.length > 0 && <ul className="track-list">{tracks.map((track) => <li key={track.id}>{track.name}</li>)}</ul>}
          <div className="modal-actions">
            <button type="button" className="button secondary" aria-pressed={saved} onClick={onSave}>
              <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'В расписании' : 'В расписание'}
            </button>
            <button type="button" className="button primary" disabled={loading || Boolean(error) || tracks.length === 0}
              onClick={() => setStage('submission')}><Mic2 size={18} /> Подать доклад спикером</button>
          </div>
        </>
      )}
    </Modal>
  );
}
