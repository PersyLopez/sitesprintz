import { usePublishedSeamlessEdit } from '../../hooks/usePublishedSeamlessEdit';
import SeamlessEditToolbar from './SeamlessEditToolbar';

/**
 * Owner live-edit session. Loaded only when edit mode is on so visitors
 * do not download the editor with the published page.
 */
export default function PublishedLiveEdit({
  subdomain,
  liveRef,
  siteData,
  bindKey,
  onRestored,
  dashboardHref,
  settingsHref,
  builderHref,
  appointmentsHref,
  productsHref,
}) {
  const edit = usePublishedSeamlessEdit({
    enabled: true,
    subdomain,
    liveRef,
    siteData,
    bindKey,
    onRestored,
  });

  return (
    <SeamlessEditToolbar
      saveState={edit.saveState}
      canUndo={edit.canUndo}
      onUndo={edit.undo}
      onOpenHistory={edit.openHistory}
      historyOpen={edit.historyOpen}
      history={edit.history}
      historyError={edit.historyError}
      selectedVersion={edit.selectedVersion}
      onSelectVersion={edit.setSelectedVersion}
      onCloseHistory={edit.closeHistory}
      onRestore={edit.restore}
      restoring={edit.restoring}
      formatHistoryTime={edit.formatHistoryTime}
      dashboardHref={dashboardHref}
      settingsHref={settingsHref}
      builderHref={builderHref}
      appointmentsHref={appointmentsHref}
      productsHref={productsHref}
      unboundHint={edit.unboundHint}
    />
  );
}
