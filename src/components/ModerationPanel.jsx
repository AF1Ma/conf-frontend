import { useRef, useState } from 'react';
import { Check, ClipboardList, RefreshCw, X } from 'lucide-react';
import { apiRequest, errorMessage } from '../api';
import { formatDate } from '../dates';
import { useApiList } from '../hooks';

const LABELS = { Submitted: 'На модерации', Approved: 'Одобрен', Rejected: 'Отклонён' };
const PATH = '/talk-submissions?status=Submitted';

export default function ModerationPanel({ token, notify }) {
  const { items, loading, error, reload, updateItems } = useApiList(PATH, token);
  const [pending, setPending] = useState({});
  const [errors, setErrors] = useState({});
  const inFlight = useRef(new Set());
  const submitted = items.filter((item) => item.status === 'Submitted').length;

  async function decide(id, status) {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    setPending((current) => ({ ...current, [id]: status }));
    setErrors((current) => ({ ...current, [id]: '' }));
    try {
      const result = await apiRequest('/talk-submissions/' + encodeURIComponent(id) + '/status', {
        token, method: 'PATCH', json: { status },
      });
      updateItems((current) => current.map((item) => item.id === id
        ? { ...item, status: result?.submission?.status ?? status }
        : item));
      notify(status === 'Approved' ? 'Доклад одобрен' : 'Доклад отклонён');
    } catch (err) {
      setErrors((current) => ({ ...current, [id]: errorMessage(err) }));
    } finally {
      inFlight.current.delete(id);
      setPending((current) => { const next = { ...current }; delete next[id]; return next; });
    }
  }

  return (
    <section className="panel list-panel" aria-labelledby="moderation-title">
      <div className="section-toolbar">
        <div className="section-title"><h2 id="moderation-title">Заявки спикеров</h2><span className="count-badge">{submitted} на модерации</span></div>
        <button type="button" className="button secondary compact" disabled={loading || Object.keys(pending).length > 0}
          onClick={() => { setErrors({}); reload(); }}><RefreshCw size={16} /> Обновить</button>
      </div>
      {loading && <p className="section-body muted" role="status">Загружаем заявки…</p>}
      {error && <p className="form-alert section-body" role="alert">{error}</p>}
      {!loading && !error && items.length === 0 && <div className="empty-state"><ClipboardList size={26} /><h3>Очередь пуста</h3><p>Новые заявки появятся здесь после подачи доклада.</p></div>}
      <div className="moderation-list">
        {items.map((item) => (
          <article className="review-card" key={item.id} aria-busy={Boolean(pending[item.id])}>
            <div className="review-meta">
              <span className={'status-badge ' + (item.status === 'Approved' ? 'approved' : item.status === 'Rejected' ? 'rejected' : 'submitted')}>
                <span /> {LABELS[item.status] ?? item.status}
              </span>
              <span className="muted">{formatDate(item.submittedAt)}</span>
            </div>
            <h3>{item.title}</h3>
            <p className="abstract">{item.abstract || 'Краткие тезисы не указаны.'}</p>
            <div className="review-ids"><span>Спикер · {item.speakerId}</span><span>Секция · {item.trackId}</span></div>
            {item.status === 'Submitted' && <div className="review-actions">
              <button type="button" className="button approve" disabled={Boolean(pending[item.id])} onClick={() => decide(item.id, 'Approved')}>
                <Check size={17} /> {pending[item.id] === 'Approved' ? 'Сохраняем…' : 'Одобрить'}
              </button>
              <button type="button" className="button reject" disabled={Boolean(pending[item.id])} onClick={() => decide(item.id, 'Rejected')}>
                <X size={17} /> {pending[item.id] === 'Rejected' ? 'Сохраняем…' : 'Отклонить'}
              </button>
            </div>}
            {errors[item.id] && <p className="form-alert" role="alert">{errors[item.id]}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
