import { useState } from 'react';

function money(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  });
}

export default function SummaryCards({ summary }) {
  const [collapsed, setCollapsed] = useState({});
  const cards = [
    { label: 'Available Resale Tickets', value: summary?.availableListings ?? 0, tone: 'blue' },
    { label: 'Sold Through TravelSwap', value: summary?.soldListings ?? 0, tone: 'green' },
    { label: 'Seller Recovery', value: money(summary?.sellerRecoveryAmount), tone: 'orange' },
    { label: 'Occupancy Lift', value: `${summary?.occupancyLiftPercent ?? 0}%`, tone: 'teal' }
  ];

  return (
    <section className="summary-grid">
      {cards.map((card) => (
        <article key={card.label} className={`summary-card ${card.tone} ${collapsed[card.label] ? 'collapsed' : ''}`}>
          <div className="summary-card-head">
            <p>{card.label}</p>
            <button
              type="button"
              className="summary-toggle-btn"
              onClick={() => setCollapsed((prev) => ({ ...prev, [card.label]: !prev[card.label] }))}
              aria-label={collapsed[card.label] ? `Expand ${card.label}` : `Collapse ${card.label}`}
            >
              {collapsed[card.label] ? '▸' : '▾'}
            </button>
          </div>
          {!collapsed[card.label] && <h3>{card.value}</h3>}
        </article>
      ))}
    </section>
  );
}
