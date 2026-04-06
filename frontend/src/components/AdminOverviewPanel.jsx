import CollapsiblePanel from './CollapsiblePanel';

export default function AdminOverviewPanel({ overview }) {
  const stats = overview || {};
  const money = (value) => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  return (
    <CollapsiblePanel title="Admin Overview" subtitle="Travellers, sellers, buyers and ecosystem counts">
      <div className="admin-stats-grid">
        <article className="admin-stat-card">
          <h4>Users</h4>
          <p>Total Users: {stats.totalUsers || 0}</p>
          <p>Admins: {stats.totalAdmins || 0}</p>
        </article>
        <article className="admin-stat-card">
          <h4>Marketplace Participants</h4>
          <p>Travellers: {stats.totalTravellers || 0}</p>
          <p>Sellers: {stats.totalSellers || 0}</p>
          <p>Buyers: {stats.totalBuyers || 0}</p>
        </article>
        <article className="admin-stat-card">
          <h4>Inventory</h4>
          <p>Travels: {stats.totalTravels || 0}</p>
          <p>Buses: {stats.totalBuses || 0}</p>
        </article>
        <article className="admin-stat-card">
          <h4>Transactions</h4>
          <p>Total Listings: {stats.totalListings || 0}</p>
          <p>Sold Listings: {stats.totalSoldListings || 0}</p>
          <p>Total Platform Fees: {money(stats.totalPlatformFees)}</p>
          <p>Resale Fee Share: {money(stats.resalePlatformFees)}</p>
          <p>Booking Fee Share: {money(stats.bookingPlatformFees)}</p>
        </article>
      </div>
    </CollapsiblePanel>
  );
}
