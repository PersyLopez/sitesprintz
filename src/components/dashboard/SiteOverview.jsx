import { Link } from 'react-router-dom';
import { usePlan } from '../../hooks/usePlan';
import { useSiteWorkspace } from '../../context/SiteWorkspaceContext';
import { getSiteDisplayName, getSiteFeatures, getSiteWorkspacePaths } from '../../utils/siteWorkspace';

function SiteOverview() {
  const { site } = useSiteWorkspace();
  const { isGrowth } = usePlan();
  if (!site) return null;
  const features = getSiteFeatures(site);
  const paths = getSiteWorkspacePaths(site.id);
  const name = getSiteDisplayName(site);
  const orderingOn = features.onlineOrdering?.enabled !== false;
  const bookingOn = features.booking?.enabled !== false;

  const cards = [
    {
      to: paths.orders,
      title: 'Orders',
      body: orderingOn
        ? `Track and fulfill orders for ${name}.`
        : 'Ordering is available if you turn it on for this site.',
      meta: isGrowth ? 'Open order inbox' : 'Growth plan required',
      testId: 'site-overview-orders',
    },
    {
      to: paths.appointments,
      title: 'Appointments',
      body: bookingOn
        ? 'Manage bookings, services, and availability for this site only.'
        : 'Booking is available if you turn it on for this site.',
      meta: isGrowth ? 'Open appointment calendar' : 'Growth plan required',
      testId: 'site-overview-appointments',
    },
    {
      to: paths.settings,
      title: 'Site settings',
      body: 'Payments, custom domain, and foundation settings that apply only to this site.',
      meta: 'Payments · Domain · Foundation',
      testId: 'site-overview-settings',
    },
    {
      to: paths.products,
      title: 'Products',
      body: 'Edit the catalog customers see on this site.',
      meta: 'Manage catalog',
      testId: 'site-overview-products',
    },
    {
      to: paths.analytics,
      title: 'Analytics',
      body: 'Traffic and performance for this site.',
      meta: isGrowth ? 'View site analytics' : 'Growth plan required',
      testId: 'site-overview-analytics',
    },
    {
      to: paths.edit,
      title: 'Editor',
      body: 'Change pages, sections, and content for this site.',
      meta: 'Open page builder',
      testId: 'site-overview-edit',
    },
  ];

  return (
    <div className="site-overview" data-testid="site-overview">
      <div className="site-overview-grid">
        {cards.map((card) => (
          <Link
            key={card.testId}
            to={card.to}
            className="site-overview-card"
            data-testid={card.testId}
          >
            <h2>{card.title}</h2>
            <p>{card.body}</p>
            <span className="site-overview-card-meta">{card.meta}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default SiteOverview;
