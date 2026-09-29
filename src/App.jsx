import { useEffect, useState } from 'react';
import './App.css';

// Если у твоего бэкенда другой порт, поменяй его здесь.
const API_URL = 'https://localhost:7239/api/conferences';

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Дата уточняется';
  }

  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  });
}

export default function App() {
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadConferences() {
      try {
        const response = await fetch(API_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Сервер вернул ошибку HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error('Неверный формат ответа: ожидался массив конференций');
        }

        setConferences(data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : 'Неизвестная ошибка',
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadConferences();

    return () => controller.abort();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="/">Science Conferences</a>
        <span className="header-label">Наука · Технологии · Люди</span>
      </header>

      <main className="main">
        <p className="eyebrow">АФИША МЕРОПРИЯТИЙ</p>
        <h1>Научные конференции</h1>
        <p className="intro">
          Находите интересные события и знакомьтесь с новыми идеями.
        </p>

        {loading && (
          <p className="notice" role="status">
            Загружаем конференции…
          </p>
        )}

        {error && (
          <div className="notice error" role="alert">
            <strong>Не удалось загрузить конференции.</strong>
            <p>{error}</p>
            <p>
              Проверь, запущен ли бэкенд и правильно ли указан адрес API.
            </p>
            <button onClick={() => window.location.reload()}>
              Попробовать снова
            </button>
          </div>
        )}

        {!loading && !error && conferences.length === 0 && (
          <p className="notice">Пока нет запланированных конференций.</p>
        )}

        {!loading && !error && conferences.length > 0 && (
          <>
            <p className="count">
              Найдено мероприятий: {conferences.length}
            </p>

            <div className="conference-grid">
              {conferences.map((conference) => (
                <article className="conference-card" key={conference.id}>
                  <span className="badge">Конференция</span>
                  <h2>{conference.title}</h2>
                  <p className="description">{conference.description}</p>

                  <dl className="details">
                    <div>
                      <dt>Начало · московское время</dt>
                      <dd>{formatDate(conference.startDate)}</dd>
                    </div>
                    <div>
                      <dt>Место проведения</dt>
                      <dd>{conference.location}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}