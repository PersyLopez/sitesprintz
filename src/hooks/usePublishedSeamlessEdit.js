import { useCallback, useEffect, useRef, useState } from 'react';
import { get, post } from '../utils/api';
import api from '../services/api';
import { bindSeamlessEditing } from '../utils/seamlessEdit';
import { getSiteDataVersion } from '../utils/seamlessEditFields';

const MAX_DELAYED_FLUSH_RETRIES = 3;
const DELAYED_FLUSH_MS = 3000;

function formatHistoryTime(timestamp) {
  if (!timestamp) return 'Saved version';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Saved version';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function usePublishedSeamlessEdit({
  enabled,
  subdomain,
  liveRef,
  siteData,
  bindKey,
  onRestored,
}) {
  const [saveState, setSaveState] = useState('saved');
  const [undoStack, setUndoStack] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const siteVersion = getSiteDataVersion(siteData);
  const versionRef = useRef(siteVersion);
  const queueRef = useRef(new Map());
  const timerRef = useRef(null);
  const delayedFlushRetriesRef = useRef(0);

  useEffect(() => {
    versionRef.current = siteVersion;
  }, [subdomain, siteVersion]);

  const scheduleDelayedFlush = useCallback((flushFn) => {
    if (delayedFlushRetriesRef.current >= MAX_DELAYED_FLUSH_RETRIES) {
      setSaveState('error');
      return;
    }
    delayedFlushRetriesRef.current += 1;
    setSaveState('error');
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      flushFn({ fromDelayedRetry: true });
    }, DELAYED_FLUSH_MS);
  }, []);

  const flush = useCallback(async (opts = {}) => {
    if (!subdomain || queueRef.current.size === 0) return;
    const changes = [...queueRef.current.entries()].map(([field, value]) => ({ field, value }));
    queueRef.current.clear();
    setSaveState('saving');
    try {
      const result = await api.patch(`/api/sites/${encodeURIComponent(subdomain)}`, {
        version: versionRef.current,
        changes,
      });
      if (result?.version) versionRef.current = result.version;
      delayedFlushRetriesRef.current = 0;
      setSaveState('saved');
    } catch (error) {
      const statusCode = error.statusCode;
      const payload = error.payload;

      if (statusCode === 409 && !opts.conflictRetried) {
        let nextVersion = payload?.currentVersion;
        if (typeof nextVersion !== 'number') {
          try {
            const sessionData = await api.get(`/api/sites/${encodeURIComponent(subdomain)}/session`);
            nextVersion = sessionData?.session?.currentVersion;
          } catch {
            nextVersion = undefined;
          }
        }
        if (typeof nextVersion === 'number') {
          versionRef.current = nextVersion;
          changes.forEach((change) => queueRef.current.set(change.field, change.value));
          return flush({ conflictRetried: true });
        }
      }

      changes.forEach((change) => queueRef.current.set(change.field, change.value));

      if (statusCode === 403) {
        setSaveState('error');
        return;
      }

      const retryable = !statusCode
        || statusCode >= 500
        || statusCode === 429
        || error.isNetworkError;

      if (retryable && !opts.fromDelayedRetry) {
        scheduleDelayedFlush(flush);
        return;
      }

      if (retryable && opts.fromDelayedRetry) {
        scheduleDelayedFlush(flush);
        return;
      }

      setSaveState('error');
    }
  }, [subdomain, scheduleDelayedFlush]);

  const queueChange = useCallback((field, value) => {
    queueRef.current.set(field, value);
    setSaveState('pending');
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      flush();
    }, 700);
  }, [flush]);

  const handleCommit = useCallback((change) => {
    setUndoStack((stack) => [...stack, change].slice(-40));
    queueChange(change.field, change.value);
  }, [queueChange]);

  useEffect(() => {
    if (!enabled || !liveRef.current) return undefined;
    liveRef.current.classList.add('ss-live--editing');
    const unbind = bindSeamlessEditing(liveRef.current, { onCommit: handleCommit });
    return () => {
      liveRef.current?.classList.remove('ss-live--editing');
      unbind();
    };
  }, [enabled, handleCommit, liveRef, bindKey]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const undo = useCallback(() => {
    const last = undoStack[undoStack.length - 1];
    if (!last || !liveRef.current) return;
    const el = liveRef.current.querySelector(`[data-editable="${last.field}"]`);
    if (el) el.textContent = last.previous;
    setUndoStack((stack) => stack.slice(0, -1));
    queueChange(last.field, last.previous);
  }, [liveRef, queueChange, undoStack]);

  const openHistory = useCallback(async () => {
    setHistoryOpen(true);
    setHistoryError('');
    setSelectedVersion(null);
    try {
      const data = await get(`/api/sites/${encodeURIComponent(subdomain)}/history`);
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (error) {
      setHistoryError(error.message || 'Could not load version history');
      setHistory([]);
    }
  }, [subdomain]);

  const restore = useCallback(async () => {
    if (!selectedVersion || !subdomain) return;
    setRestoring(true);
    setHistoryError('');
    try {
      await post(`/api/sites/${encodeURIComponent(subdomain)}/restore/${encodeURIComponent(selectedVersion)}`);
      setHistoryOpen(false);
      setUndoStack([]);
      setSaveState('saved');
      await onRestored?.();
    } catch (error) {
      setHistoryError(error.message || 'Could not restore that version');
    } finally {
      setRestoring(false);
    }
  }, [onRestored, selectedVersion, subdomain]);

  return {
    saveState,
    canUndo: undoStack.length > 0,
    undo,
    historyOpen,
    history,
    historyError,
    selectedVersion,
    setSelectedVersion,
    openHistory,
    closeHistory: () => setHistoryOpen(false),
    restore,
    restoring,
    formatHistoryTime,
  };
}
