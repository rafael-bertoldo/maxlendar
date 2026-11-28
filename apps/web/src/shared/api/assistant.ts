import { ApiError, readApiError } from './client';
import type { Recurrence, RecurrenceScope } from './events';

export type AssistantDraft = {
  title: string;
  startsAt: string;
  timeZone: string;
  recurrence?: Recurrence;
};

export type AssistantTarget = {
  id: string;
  title: string;
  startsAt: string;
  timeZone: string;
  version: number;
  source?: 'one-off' | 'recurring';
  seriesId?: string;
  occurrenceKey?: string;
  isException?: boolean;
  recurrence?: Recurrence;
};

export type AssistantEvidence = {
  id: string;
  title: string;
  startsAt: string;
};

export type AssistantResult =
  | { kind: 'create'; message: string; draft: AssistantDraft; confidence: 'high' | 'medium' }
  | {
      kind: 'answer';
      message: string;
      answer: string;
      evidence: AssistantEvidence[];
      confidence: 'high' | 'medium';
    }
  | {
      kind: 'edit';
      message: string;
      target: AssistantTarget;
      changes: Partial<AssistantDraft>;
      scope?: RecurrenceScope;
      confidence: 'high' | 'medium';
    }
  | {
      kind: 'delete';
      message: string;
      target: AssistantTarget;
      scope?: RecurrenceScope;
      confidence: 'high' | 'medium';
    }
  | { kind: 'clarification'; message: string; confidence: 'none' };

export async function interpretRequest(
  text: string,
  timeZone: string,
  signal?: AbortSignal,
): Promise<AssistantResult> {
  let response: Response;
  try {
    response = await fetch('/api/assistant/interpret', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, timeZone, now: new Date().toISOString() }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', undefined, 'Não foi possível conectar ao assistente.');
  }

  if (!response.ok) throw await readApiError(response);
  return (await response.json()) as AssistantResult;
}
