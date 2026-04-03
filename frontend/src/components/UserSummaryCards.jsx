function money(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  });
}

export default function UserSummaryCards({ summary }) {
  const cards = [
    { label: 'Active Selling Tickets', value: summary?.activeSellingTickets ?? 0, tone: 'blue' },
    { label: 'Tickets Purchased', value: summary?.purchasedTickets ?? 0, tone: 'teal' },
    { label: 'Sales Recovery', value: money(summary?.totalRecoveryFromSales), tone: 'green' },
    { label: 'Purchase Savings', value: money(summary?.totalSavingsOnPurchases), tone: 'orange' },
    { label: 'Sales Loss', value: money(summary?.totalLossFromSales), tone: 'danger' },
    { label: 'Total Spend', value: money(summary?.totalSpentOnPurchases), tone: 'muted' },
    {
      label: 'Net Profit / Loss',
      value: money(summary?.netProfitOrLoss),
      tone: Number(summary?.netProfitOrLoss || 0) >= 0 ? 'green' : 'danger'
    }
  ];

  return (
    <section className="summary-grid wide">
      {cards.map((card) => (
        <article key={card.label} className={`summary-card ${card.tone}`}>
          <p>{card.label}</p>
          <h3>{card.value}</h3>
        </article>
      ))}
    </section>
  );
}
