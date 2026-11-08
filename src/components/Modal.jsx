import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ id, children, busy = false, onDismiss, narrow = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    const previous = document.activeElement;
    if (!element.open) element.showModal();
    return () => {
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  return (
    <dialog ref={ref} className={'modal' + (narrow ? ' modal--narrow' : '')} aria-labelledby={id}
      onCancel={(event) => { event.preventDefault(); if (!busy) onDismiss(); }}
      onClick={(event) => { if (event.target === event.currentTarget && !busy) onDismiss(); }}>
      <div className="modal-inner">
        <button type="button" className="icon-button modal-close" onClick={onDismiss} disabled={busy} aria-label="Закрыть">
          <X size={20} />
        </button>
        {children}
      </div>
    </dialog>
  );
}
