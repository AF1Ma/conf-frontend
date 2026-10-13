import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';
import './ModerationPanel.css';

const STATUS_LABELS = {
  Submitted: 'На рассмотрении',
  Approved: 'Одобрен',
  Rejected: 'Отклонён',
};

export default function ModerationPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState({});
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef(new Set());

  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/talk-submissions', { signal: controller.signal })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Сервер вернул неверный формат списка заявок.');
        if (!controller.signal.aborted) setItems(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err instanceof TypeError ? 'Не удалось связаться с сервером.' : err.message);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  async function moderate(id, status) {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    setPending((current) => ({ ...current, [id]: status }));
    setErrors((current) => ({ ...current, [id]: '' }));
    setNotice('');
    try {
      await apiRequest(`/talk-submissions/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      // Update only after the server confirms that the decision was saved.
      setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
      setNotice(status === 'Approved' ? 'Доклад одобрен. Решение сохранено.' : 'Доклад отклонён. Решение сохранено.');
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [id]: err instanceof TypeError
          ? 'Нет связи с сервером. Обнови список, чтобы проверить, сохранилось ли решение.'
          : err.message,
      }));
    } finally {
      inFlight.current.delete(id);
      setPending((current) => { const next = { ...current }; delete next[id]; return next; });
    }
  }

  function reload() {
    setLoading(true);
    setError('');
    setErrors({});
    setNotice('');
    setAttempt((value) => value + 1);
  }

  return (
    <section className="moderation" aria-labelledby="moderation-title">
      <div className="moderation-heading">
        <div>
          <p className="eyebrow">ПРОГРАММА КОНФЕРЕНЦИИ</p>
          <h2 id="moderation-title">Модерация докладов</h2>
        </div>
        <button type="button" className="secondary" onClick={reload}
          disabled={loading || Object.keys(pending).length > 0}>Обновить список</button>
      </div>
      <div role="status" aria-live="polite">{notice && <p className="notice success">{notice}</p>}</div>
      {loading && <p role="status">Загружаем заявки…</p>}
      {error && <p className="notice error" role="alert">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="moderation-empty">Поданных докладов пока нет.</p>}
      {!loading && !error && <div className="moderation-grid">
        {items.map((item) => (
          <article className="moderation-card" key={item.id} aria-busy={Boolean(pending[item.id])}>
            <span className={`moderation-status status-${Object.hasOwn(STATUS_LABELS, item.status) ? item.status : 'unknown'}`}>
              {STATUS_LABELS[item.status] || 'Статус'} · {item.status}
            </span>
            <h3>{item.title}</h3>
            <p className="moderation-abstract">{item.abstract || 'Тезисы не указаны.'}</p>
            {item.status === 'Submitted' && <div className="moderation-actions">
              <button type="button" className="approve" disabled={Boolean(pending[item.id])}
                onClick={() => moderate(item.id, 'Approved')}>
                {pending[item.id] === 'Approved' ? 'Сохраняем…' : 'Одобрить'}
              </button>
              <button type="button" className="reject" disabled={Boolean(pending[item.id])}
                onClick={() => moderate(item.id, 'Rejected')}>
                {pending[item.id] === 'Rejected' ? 'Сохраняем…' : 'Отклонить'}
              </button>
            </div>}
            {errors[item.id] && <p className="notice error" role="alert">{errors[item.id]}</p>}
          </article>
        ))}
      </div>}
    </section>
  );
}
