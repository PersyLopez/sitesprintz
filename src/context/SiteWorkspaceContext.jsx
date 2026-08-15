import { createContext, useContext } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const SiteWorkspaceContext = createContext({
  embedded: false,
  site: null,
  siteId: null,
});

export function SiteWorkspaceProvider({ children, site, siteId }) {
  return (
    <SiteWorkspaceContext.Provider value={{ embedded: true, site, siteId }}>
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
  };
}

export default SiteWorkspaceContext;
