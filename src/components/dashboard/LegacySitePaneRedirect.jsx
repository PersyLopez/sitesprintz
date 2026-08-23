import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { getSiteWorkspacePaths } from '../../utils/siteWorkspace.js';

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
