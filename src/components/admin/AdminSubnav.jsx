import { NavLink } from 'react-router-dom';
import './AdminSubnav.css';

const ADMIN_NAV_ITEMS = [
  { to: '/admin', label: 'Hub', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/sites', label: 'Sites' },
  { to: '/admin/candidates', label: 'Candidates' },
  { to: '/admin/build-intakes', label: 'Build intakes' },
  { to: '/admin/templates', label: 'Templates' },
  { to: '/admin/pricing', label: 'Pricing' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/plan-features', label: 'Plan features' },
];

function AdminSubnav() {
  return (
    <nav className="admin-subnav" aria-label="Admin" data-testid="admin-subnav">
      {ADMIN_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `admin-subnav-link${isActive ? ' active' : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default AdminSubnav;
