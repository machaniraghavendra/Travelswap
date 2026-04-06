import { useState } from 'react';

export default function CollapsiblePanel({
  title,
  subtitle,
  className = '',
  defaultOpen = true,
  headerMeta = null,
  children
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`panel ${className}`.trim()}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <span>{subtitle}</span>}
        </div>
        <div className="panel-head-actions">
          {headerMeta}
          <button
            type="button"
            className="panel-toggle-btn"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
            title={open ? 'Collapse' : 'Expand'}
          >
            {open ? '▾' : '▸'}
          </button>
        </div>
      </div>
      {open && children}
    </section>
  );
}
