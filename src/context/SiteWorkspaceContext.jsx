import { createContext, useContext } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const SiteWorkspaceContext = createContext({
  embedded: false,
  site: null,
  siteId: null,
  unreadMessages: 0,
  refreshUnreadMessages: null,
});

export function SiteWorkspaceProvider({ children, site, siteId, unreadMessages = 0, refreshUnreadMessages }) {
  return (
    <SiteWorkspaceContext.Provider value={{ embedded: true, site, siteId, unreadMessages, refreshUnreadMessages }}>
      {children}
    </SiteWorkspaceContext.Provider>
  );
}

export function useSiteWorkspace() {
  const context = useContext(SiteWorkspaceContext);
  const params = useParams();
  const [searchParams] = useSearchParams();
  const siteId = context.siteId || params.siteId || searchParams.get('siteId') || null;

  return {
    embedded: Boolean(context.embedded),
    site: context.site,
    siteId,
    unreadMessages: context.unreadMessages || 0,
    refreshUnreadMessages: context.refreshUnreadMessages || (() => {}),
  };
}

export default SiteWorkspaceContext;
