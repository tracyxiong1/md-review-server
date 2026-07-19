import { useEffect } from 'react';
import { ANALYTICS_READY_EVENT } from './useAnalytics';

type DocumentEventName =
  | 'document_initialized'
  | 'document_opened'
  | 'review_round_started'
  | 'document_revised';

interface PendingDocumentEvent {
  id: string;
  name: string;
  data: Record<string, unknown>;
}

type DocumentEventData = Record<string, string | number | boolean>;

const inFlightSyncs = new Map<string, Promise<void>>();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSequence(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function sanitizeEvent(event: PendingDocumentEvent): {
  id: string;
  name: DocumentEventName;
  data: DocumentEventData;
} | null {
  const documentId = event.data?.document_id;
  if (!event.id || typeof documentId !== 'string' || !UUID_PATTERN.test(documentId)) {
    return null;
  }

  if (event.name === 'document_initialized') {
    return {
      id: event.id,
      name: event.name,
      data: { document_id: documentId },
    };
  }

  if (event.name === 'document_opened' && isSequence(event.data.open_seq)) {
    return {
      id: event.id,
      name: event.name,
      data: {
        document_id: documentId,
        open_seq: event.data.open_seq,
      },
    };
  }

  if (
    (event.name === 'review_round_started' || event.name === 'document_revised') &&
    isSequence(event.data.revision_seq) &&
    isSequence(event.data.round_seq)
  ) {
    return {
      id: event.id,
      name: event.name,
      data: {
        document_id: documentId,
        revision_seq: event.data.revision_seq,
        round_seq: event.data.round_seq,
      },
    };
  }

  return null;
}

async function performSync(file: string) {
  const trackEvent = window.__mdReviewTrackEvent;
  if (!trackEvent) {
    return;
  }

  try {
    const response = await fetch('/api/document-analytics/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file }),
    });
    if (!response.ok) {
      return;
    }

    const result = (await response.json()) as { events?: PendingDocumentEvent[] };
    const acknowledgedIds: string[] = [];

    for (const pendingEvent of result.events || []) {
      const event = sanitizeEvent(pendingEvent);
      if (event && (await trackEvent(event.name, event.data))) {
        acknowledgedIds.push(event.id);
      }
    }

    if (acknowledgedIds.length > 0) {
      await fetch('/api/document-analytics/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file,
          eventIds: acknowledgedIds,
        }),
      });
    }
  } catch {
    // Analytics should never affect the review UI.
  }
}

export function syncDocumentAnalytics(file: string): Promise<void> {
  if (!file || !window.__mdReviewTrackEvent) {
    return Promise.resolve();
  }

  const existingSync = inFlightSyncs.get(file);
  if (existingSync) {
    return existingSync;
  }

  const sync = performSync(file).finally(() => {
    if (inFlightSyncs.get(file) === sync) {
      inFlightSyncs.delete(file);
    }
  });
  inFlightSyncs.set(file, sync);
  return sync;
}

export function useDocumentAnalytics(file: string | null | undefined, content: string | null) {
  useEffect(() => {
    if (!file || content === null) {
      return;
    }

    const sync = () => {
      void syncDocumentAnalytics(file);
    };

    sync();
    window.addEventListener(ANALYTICS_READY_EVENT, sync);
    return () => {
      window.removeEventListener(ANALYTICS_READY_EVENT, sync);
    };
  }, [content, file]);
}
