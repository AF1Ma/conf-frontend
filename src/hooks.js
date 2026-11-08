import { useEffect, useState } from 'react';
import { apiRequest, errorMessage } from './api';

export function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export function useLocalState(key, fallback) {
  const [value, setValue] = useState(() => readLocal(key, fallback));
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* Storage can be unavailable in a private session. */ }
  }, [key, value]);
  return [value, setValue];
}

export function useApiList(path, token) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const current = result?.path === path && result?.revision === revision && result?.token === token ? result : null;

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    apiRequest(path, { token, signal: controller.signal }).then((data) => {
      if (!Array.isArray(data)) throw new Error('Сервер вернул неверный формат списка.');
      if (!controller.signal.aborted) setResult({ path, token, revision, items: data });
    }).catch((err) => {
      if (!controller.signal.aborted) setResult({ path, token, revision, error: errorMessage(err), status: err.status });
    });
    return () => controller.abort();
  }, [path, token, revision]);

  return {
    items: current?.items ?? [],
    loading: Boolean(path && !current),
    error: current?.error,
    status: current?.status,
    reload: () => setRevision((value) => value + 1),
    updateItems: (update) => setResult((value) =>
      value?.items && value.path === path && value.token === token && value.revision === revision
        ? { ...value, items: update(value.items) }
        : value),
  };
}

const TOKEN_KEY = 'science-conferences.session';
const TOKEN_MODE_KEY = 'science-conferences.token-required';
const ROLES = new Set(['Listener', 'Organizer']);

function readProfile(data, fallback = {}) {
  const profile = data?.user ?? data;
  const id = profile?.userId ?? profile?.id ?? fallback.id;
  const role = profile?.role ?? fallback.role;
  if (id === null || id === undefined || !String(id).trim() || !ROLES.has(role)) return null;
  return {
    id: String(id),
    fullName: profile?.fullName || fallback.fullName || '',
    email: profile?.email || fallback.email || '',
    role,
  };
}

function readSession() {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY) || '';
    const required = localStorage.getItem(TOKEN_MODE_KEY) === '1';
    const cached = readProfile({
      userId: localStorage.getItem('userId'),
      role: localStorage.getItem('role'),
      fullName: localStorage.getItem('fullName'),
      email: localStorage.getItem('email'),
    });
    return { token, user: token || required ? null : cached, cached };
  } catch {
    return { token: '', user: null, cached: null };
  }
}

function persistSession(token, user) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
    if (user) {
      localStorage.setItem('userId', user.id);
      localStorage.setItem('role', user.role);
      localStorage.setItem('fullName', user.fullName);
      localStorage.setItem('email', user.email);
      localStorage.setItem(TOKEN_MODE_KEY, token ? '1' : '0');
    } else {
      for (const key of ['userId', 'role', 'fullName', 'email', TOKEN_MODE_KEY]) localStorage.removeItem(key);
    }
  } catch { /* Login still works in this tab when storage is unavailable. */ }
}

export function useAuth() {
  const [session, setSession] = useState(readSession);
  const [verificationError, setVerificationError] = useState('');
  const { token, user, cached } = session;

  useEffect(() => {
    if (!token || user) return;
    const controller = new AbortController();
    apiRequest('/auth/me', { token, signal: controller.signal }).then((response) => {
      if (controller.signal.aborted) return;
      const profile = readProfile(response, cached ?? {});
      if (!profile) throw new Error('Сервер не вернул профиль.');
      persistSession(token, profile);
      setSession({ token, user: profile, cached: null });
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if ([401, 403, 404].includes(error.status)) {
        persistSession('', null);
        setSession({ token: '', user: null, cached: null });
      } else {
        setVerificationError(errorMessage(error));
      }
    });
    return () => controller.abort();
  }, [token, user, cached]);

  return {
    token, user, verificationError,
    checking: Boolean(token && !user && !verificationError),
    signIn(result, email) {
      const profile = readProfile(result, { email });
      if (!profile) throw new Error('Сервер не вернул идентификатор или роль пользователя.');
      const nextToken = typeof result.access_token === 'string' ? result.access_token : '';
      persistSession(nextToken, profile);
      setVerificationError('');
      setSession({ token: nextToken, user: profile, cached: null });
    },
    async becomeOrganizer() {
      if (!user || user.role !== 'Listener') return;
      const result = await apiRequest('/auth/become-organizer/' + encodeURIComponent(user.id), { token, method: 'POST' });
      const profile = readProfile(result, { ...user, role: 'Organizer' });
      if (!profile || profile.id !== user.id || profile.role !== 'Organizer')
        throw new Error('Сервер не подтвердил смену роли.');
      const nextToken = typeof result?.access_token === 'string' ? result.access_token : token;
      persistSession(nextToken, profile);
      setSession({ token: nextToken, user: profile, cached: null });
    },
    signOut() {
      persistSession('', null);
      setVerificationError('');
      setSession({ token: '', user: null, cached: null });
    },
  };
}
