import { useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { apiRequest, errorMessage } from '../api';
import Modal from './Modal';

export default function AuthModal({ onSuccess, onClose }) {
  const [mode, setMode] = useState('login');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const register = mode === 'register';

  function switchMode(next) {
    setMode(next);
    setError('');
    setVisible(false);
  }

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    const json = { email: data.get('email').trim(), password: data.get('password') };
    if (register) json.fullName = data.get('fullName').trim();
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest('/auth/' + mode, { method: 'POST', json }, register ? 201 : 200);
      onSuccess(result, register ? 'Аккаунт создан. Ты вошёл в систему.' : 'Вход выполнен.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal id="auth-title" busy={busy} onDismiss={onClose} narrow>
      <div className="modal-emblem"><LockKeyhole size={23} /></div>
      <p className="eyebrow">SCIENCE CONFERENCES</p>
      <h2 id="auth-title">{register ? 'Создать аккаунт' : 'Личный профиль'}</h2>
      <p className="muted modal-intro">{register ? 'Зарегистрируйся для доступа к платформе.' : 'Войди, чтобы открыть свой профиль.'}</p>
      <div className="segmented" aria-label="Вход или регистрация">
        <button type="button" aria-pressed={!register} disabled={busy} onClick={() => switchMode('login')}>Вход</button>
        <button type="button" aria-pressed={register} disabled={busy} onClick={() => switchMode('register')}>Регистрация</button>
      </div>
      <form className="stack-form" onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy}>
          {register && <label>Имя <input name="fullName" type="text" autoComplete="name" placeholder="Как к тебе обращаться" maxLength={120} /></label>}
          <label>Email <input name="email" type="email" autoComplete="email" placeholder="name@example.com" required maxLength={254} /></label>
          <div className="password-field"><label htmlFor="auth-password">Пароль</label>
            <span className="password-input">
              <input key={mode} id="auth-password" name="password" type={visible ? 'text' : 'password'} required
                minLength={register ? 8 : undefined} maxLength={128} placeholder={register ? 'Минимум 8 символов' : 'Введи пароль'}
                autoComplete={register ? 'new-password' : 'current-password'} />
              <button type="button" className="icon-button" aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
                onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </span>
          </div>
        </fieldset>
        {error && <p className="form-alert" role="alert">{error}</p>}
        <button type="submit" className="button primary wide" disabled={busy}>
          {busy ? 'Отправляем…' : register ? 'Зарегистрироваться' : 'Войти'} <ArrowRight size={17} />
        </button>
      </form>
    </Modal>
  );
}
