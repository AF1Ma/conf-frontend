import { useEffect, useState } from 'react';
import { apiRequest } from '../api';

export default function SubmissionsList() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/talk-submissions', { signal: controller.signal })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Сервер вернул неверный формат списка заявок.');
        setItems(data);
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return (
    <div className="submissions-panel">
      <h2>Поданные заявки</h2>
      {loading && <p role="status">Загружаем заявки…</p>}
      {error && <p role="alert" className="notice error">{error}</p>}
      {!loading && !error && items.length === 0 && <p>Пока нет поданных заявок.</p>}
      {!loading && !error && items.map((item) => (
        <article className="submission-item" key={item.id}>
          <span className="badge">{item.status}</span>
          <h3>{item.title}</h3>
          <p>{item.abstract}</p>
          <small>Спикер: {item.speakerId} · Секция: {item.trackId}</small>
        </article>
      ))}
    </div>
  );
}
