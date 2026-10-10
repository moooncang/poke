import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { EFFECT_LABELS } from '../sim/labels.js';
import { WORLD_KEYS } from '../sim/world.js';

export function PokeBall({ className = '' }) {
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M3 12h18" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="3" fill="var(--ball-fill, #f6f5ed)" stroke="currentColor" strokeWidth="1.6"/></svg>;
}

export function Modal({ title, onClose, children, className = '', labelledBy }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    const selector = 'button:not([disabled]), input, select, textarea, a[href], [tabindex="0"]';
    const focusables = () => [...dialog.querySelectorAll(selector)].filter(el => el.getClientRects().length);
    (focusables()[0] || dialog).focus();
    const listener = event => {
      if (event.key === 'Escape') closeRef.current?.();
      if (event.key === 'Tab') {
        const els = focusables();
        if (!els.length) { event.preventDefault(); return; }
        const first = els[0], last = els[els.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', listener);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', listener); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <div className={`modal-backdrop ${className}`} onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
    <section ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={labelledBy ? undefined : title} aria-labelledby={labelledBy} tabIndex={-1}>
      {onClose && <button className="modal-close icon-button" onClick={onClose} aria-label="닫기"><X size={21}/></button>}{children}
    </section>
  </div>;
}

export function EffectChips({ effects, world }) {
  const chips = [
    ...Object.entries(effects || {}).filter(([, v]) => v).map(([k, v]) => [k, `${EFFECT_LABELS[k]} ${v > 0 ? '+' : ''}${v}${k === 'money' ? 'P' : ''}`, v < 0]),
    ...Object.entries(world || {}).filter(([, v]) => v).map(([k, v]) => [`world-${k}`, `지방 ${WORLD_KEYS[k]} ${v > 0 ? '+' : ''}${v}`, v < 0]),
  ];
  if (!chips.length) return null;
  return <div className="effect-chips">{chips.map(([key, label, negative]) => <span key={key} className={`${negative ? 'negative' : ''} ${key.startsWith('world') ? 'world' : ''}`}>{label}</span>)}</div>;
}
