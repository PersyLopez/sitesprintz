import { Navigate, useSearchParams } from 'react-router-dom';
import { getSiteWorkspacePaths } from '../../utils/siteWorkspace.js';

export default function LegacySitePaneRedirect({ pane }) {
  const [searchParams] = useSearchParams();
  const siteId = searchParams.get('siteId');

  if (siteId) {
    return <Navigate to={getSiteWorkspacePaths(siteId)[pane]} replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
