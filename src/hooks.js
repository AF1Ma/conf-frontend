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
function savedToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) || ''; }
  catch { return ''; }
}

function saveToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* The session still works in memory. */ }
}

export function useAuth() {
  const [session, setSession] = useState(() => ({ token: savedToken(), user: null }));
  const [verificationError, setVerificationError] = useState('');
  const { token, user } = session;

  useEffect(() => {
    if (!token || user) return;
    const controller = new AbortController();
    apiRequest('/auth/me', { token, signal: controller.signal }).then((profile) => {
      if (!controller.signal.aborted) setSession({ token, user: profile });
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (error.status === 401 || error.status === 403) {
        saveToken('');
        setSession({ token: '', user: null });
      } else {
        setVerificationError(errorMessage(error));
      }
    });
    return () => controller.abort();
  }, [token, user]);

  return {
    token, user, verificationError,
    checking: Boolean(token && !user && !verificationError),
    signIn(result) {
      if (typeof result.access_token !== 'string' || !result.access_token || !result.user?.id) {
        throw new Error('Сервер не вернул данные для входа.');
      }
      saveToken(result.access_token);
      setVerificationError('');
      setSession({ token: result.access_token, user: result.user });
    },
    signOut() {
      saveToken('');
      setVerificationError('');
      setSession({ token: '', user: null });
    },
  };
}
