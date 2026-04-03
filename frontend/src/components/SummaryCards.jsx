function money(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  });
}

export default function SummaryCards({ summary }) {
  const cards = [
    { label: 'Available Resale Tickets', value: summary?.availableListings ?? 0, tone: 'blue' },
    { label: 'Sold Through TravelSwap', value: summary?.soldListings ?? 0, tone: 'green' },
    { label: 'Seller Recovery', value: money(summary?.sellerRecoveryAmount), tone: 'orange' },
    { label: 'Occupancy Lift', value: `${summary?.occupancyLiftPercent ?? 0}%`, tone: 'teal' }
  ];

  return (
    <section className="summary-grid">
      {cards.map((card) => (
        <article key={card.label} className={`summary-card ${card.tone}`}>
          <p>{card.label}</p>
          <h3>{card.value}</h3>
        </article>
      ))}
    </section>
  );
}