import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { getSiteWorkspacePaths } from '../../utils/siteWorkspace.js';
import { livePublishedPath } from '../../utils/visitorExperience.js';

export default function LegacySitePaneRedirect({ pane, fromParam = false }) {
  const [searchParams] = useSearchParams();
  const params = useParams();

  if (fromParam) {
    const siteKey = params.subdomain;
    if (siteKey) {
      return <Navigate to={getSiteWorkspacePaths(siteKey)[pane]} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const siteId = searchParams.get('siteId');

  if (siteId) {
    return <Navigate to={getSiteWorkspacePaths(siteId)[pane]} replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

export function LegacyPublishedSiteRedirect() {
  const { subdomain } = useParams();
  const [searchParams] = useSearchParams();
  const path = livePublishedPath(subdomain);
  if (!path) return <Navigate to="/" replace />;
  const search = searchParams.toString();
  return <Navigate to={search ? `${path}?${search}` : path} replace />;
}
