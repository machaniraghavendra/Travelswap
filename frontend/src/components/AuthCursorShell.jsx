import { useRef } from 'react';

export default function AuthCursorShell({ children }) {
  const shellRef = useRef(null);
  const busRef = useRef(null);
  const prevRef = useRef({ x: null, y: null });

  const onMove = (event) => {
    if (!shellRef.current || !busRef.current) return;
    const rect = shellRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const xPct = `${((x / rect.width) * 100).toFixed(2)}%`;
    const yPct = `${((y / rect.height) * 100).toFixed(2)}%`;
    shellRef.current.style.setProperty('--cursor-x', xPct);
    shellRef.current.style.setProperty('--cursor-y', yPct);
    busRef.current.style.left = `${x}px`;
    busRef.current.style.top = `${y}px`;

    const prev = prevRef.current;
    if (prev.x !== null && prev.y !== null) {
      const dx = x - prev.x;
      const dy = y - prev.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        let direction = 'right';
        if (Math.abs(dx) >= Math.abs(dy)) {
          direction = dx >= 0 ? 'right' : 'left';
        } else {
          direction = dy >= 0 ? 'down' : 'up';
        }
        busRef.current.setAttribute('data-dir', direction);
      }
    }
    prevRef.current = { x, y };
  };

  const onLeave = () => {
    if (!shellRef.current || !busRef.current) return;
    shellRef.current.style.setProperty('--cursor-x', '50%');
    shellRef.current.style.setProperty('--cursor-y', '50%');
    busRef.current.style.left = '50%';
    busRef.current.style.top = '50%';
    busRef.current.setAttribute('data-dir', 'right');
    prevRef.current = { x: null, y: null };
  };

  return (
    <div ref={shellRef} className="auth-shell interactive-auth" onMouseMove={onMove} onMouseLeave={onLeave}>
      <span ref={busRef} className="cursor-bus" data-dir="right" aria-hidden="true">🚌</span>
      {children}
    </div>
  );
}
