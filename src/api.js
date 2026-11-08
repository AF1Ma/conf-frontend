const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest(path, { token, json, headers, ...options } = {}, expectedStatus) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');
  if (token) requestHeaders.set('Authorization', 'Bearer ' + token);
  if (json !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
    options.body = JSON.stringify(json);
  }

  const response = await fetch(API_BASE + '/api' + path, { ...options, headers: requestHeaders });
  if (response.status === 204 && expectedStatus === undefined) return null;

  const body = await response.json().catch(() => null);
  if (expectedStatus === undefined ? !response.ok : response.status !== expectedStatus) {
    const validation = body?.errors ? Object.values(body.errors).flat().join(' ') : '';
    const fallback = {
      401: 'Войди в аккаунт, чтобы продолжить.',
      403: 'У аккаунта нет доступа к этому действию.',
      429: 'Слишком много попыток. Попробуй через минуту.',
    }[response.status];
    throw new ApiError(validation || body?.message || body?.detail || body?.title || fallback ||
      'Ошибка сервера: HTTP ' + response.status, response.status);
  }
  if (body === null) throw new ApiError('Сервер вернул ответ без данных JSON.', response.status);
  return body;
}

export function errorMessage(error) {
  return error instanceof TypeError ? 'Не удалось связаться с сервером. Проверь, запущен ли бэкенд.' : error.message;
}
