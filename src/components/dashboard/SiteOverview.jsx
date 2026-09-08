import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlan } from '../../hooks/usePlan';
import { useAuth } from '../../hooks/useAuth';
import { useSiteWorkspace } from '../../context/SiteWorkspaceContext';
import { getSiteDisplayName, getSiteFeatures, getSiteWorkspacePaths } from '../../utils/siteWorkspace';
import { api } from '../../services/api';
import { OWNER_ORDER_FILTERS, countOrdersForOwnerFilter } from '../../utils/orderOwnerStatus';

function SiteOverview() {
  const { site } = useSiteWorkspace();
  const { user } = useAuth();
  const { isGrowth } = usePlan();
  const [today, setToday] = useState({ nextAppointment: null, newOrderCount: 0 });
  const features = site ? getSiteFeatures(site) : {};
  const paths = site ? getSiteWorkspacePaths(site.id, site) : {};
  const name = site ? getSiteDisplayName(site) : '';
  const orderingOn = features.onlineOrdering?.enabled !== false;
  const bookingOn = features.booking?.enabled !== false;

  useEffect(() => {
    if (!site) return undefined;
    let cancelled = false;

    async function loadToday() {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      const requests = [
        orderingOn
          ? api.get(`/api/orders/${site.id}/orders`)
          : Promise.resolve({ orders: [] }),
        bookingOn && user?.id
          ? api.get(`/api/booking/admin/${user.id}/appointments`, {
            params: {
              siteId: site.id,
              start_date: now.toISOString(),
              end_date: end.toISOString(),
            },
          })
          : Promise.resolve({ appointments: [] }),
      ];

      const [ordersResult, appointmentsResult] = await Promise.allSettled(requests);
      if (cancelled) return;

      const orders = ordersResult.status === 'fulfilled' ? ordersResult.value.orders || [] : [];
      const appointments = appointmentsResult.status === 'fulfilled'
        ? appointmentsResult.value.appointments || []
        : [];
      const nextAppointment = appointments
        .map((appointment) => ({
          ...appointment,
          start: new Date(appointment.startTime || appointment.start || appointment.appointmentDate),
        }))
        .filter((appointment) => !Number.isNaN(appointment.start.getTime()) && appointment.start >= now)
        .sort((a, b) => a.start - b.start)[0] || null;

      setToday({
        nextAppointment,
        newOrderCount: countOrdersForOwnerFilter(orders, OWNER_ORDER_FILTERS.NEW),
      });
    }

    loadToday();
    return () => {
      cancelled = true;
    };
  }, [bookingOn, orderingOn, site?.id, user?.id]);

  if (!site) return null;

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
      to: site.status === 'published' && site.subdomain ? paths.liveEdit : paths.edit,
      title: site.status === 'published' ? 'Edit on site' : 'Editor',
      body: site.status === 'published'
        ? 'Edit outlined text directly on your live site.'
        : 'Change pages, sections, and content for this site.',
      meta: site.status === 'published' ? 'Inline editor' : 'Open page builder',
      testId: 'site-overview-edit',
    },
  ];

  return (
    <div className="site-overview" data-testid="site-overview">
      <div className="site-overview-today" data-testid="site-overview-today">
        <div>
          <span className="site-overview-today-label">Today</span>
          <strong>
            {today.nextAppointment
              ? `${today.nextAppointment.customerName || today.nextAppointment.serviceName || 'Next appointment'} · ${today.nextAppointment.start.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`
              : 'No upcoming appointments'}
          </strong>
        </div>
        <span className="site-overview-today-orders">
          {today.newOrderCount > 0 ? `${today.newOrderCount} new order${today.newOrderCount === 1 ? '' : 's'}` : 'No orders yet'}
        </span>
      </div>
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
