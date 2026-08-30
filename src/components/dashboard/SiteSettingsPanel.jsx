import { useState } from 'react';
import { useSiteWorkspace } from '../../context/SiteWorkspaceContext';
import PaymentSettings from '../setup/forms/PaymentSettings';
import FoundationSettings from './FoundationSettings';
import CustomDomainSettings from './CustomDomainSettings';

const TABS = [
  { id: 'payments', label: 'Payments' },
  { id: 'domain', label: 'Custom domain' },
  { id: 'foundation', label: 'Foundation' },
];

function SiteSettingsPanel() {
  const { site } = useSiteWorkspace();
  const [tab, setTab] = useState('payments');

  if (!site) return null;

  return (
    <div className="site-settings-panel" data-testid="site-settings-panel">
      <p className="site-settings-note">
        These settings belong to this site. Billing for your Right Site Light plan stays in account settings.
      </p>

      <div className="site-settings-tabs" role="tablist" aria-label="Site settings">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`site-settings-tab${tab === item.id ? ' active' : ''}`}
            data-testid={`site-settings-tab-${item.id}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'payments' && <PaymentSettings site={site} />}
      {tab === 'domain' && (
        site.subdomain ? (
          <CustomDomainSettings subdomain={site.subdomain} />
        ) : (
          <p className="site-settings-note">Publish this site before connecting a custom domain.</p>
        )
      )}
      {tab === 'foundation' && (
        <FoundationSettings site={site} onUpdate={() => {}} />
      )}
    </div>
  );
}

export default SiteSettingsPanel;
