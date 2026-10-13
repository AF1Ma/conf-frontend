const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export async function apiRequest(path, options = {}, expectedStatus = 200) {
  const response = await fetch(`${API_BASE}/api${path}`, options);
  if (response.status !== expectedStatus) {
    const body = await response.json().catch(() => null);
    const validation = body?.errors ? Object.values(body.errors).flat().join(' ') : '';
    throw new Error(validation || body?.message || body?.detail || body?.title || `Ошибка сервера: HTTP ${response.status}`);
  }
  return response.json();
}
