import { readApiError } from './client';

export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  timeZone: string;
  version: number;
};

export async function listEvents(
  from: Date,
  to: Date,
  signal?: AbortSignal,
): Promise<CalendarEvent[]> {
  const query = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });

  let response: Response;
  try {
    response = await fetch(`/api/events?${query.toString()}`, {
      credentials: 'include',
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Não foi possível conectar ao maxlendar. Verifique sua conexão.');
  }

  if (!response.ok) {
    throw await readApiError(response);
  }

  const body = (await response.json()) as { events?: CalendarEvent[] };
  return body.events ?? [];
}

export async function createEvent(input: {
  title: string;
  startsAt: string;
  timeZone: string;
}): Promise<CalendarEvent> {
  let response: Response;

  try {
    response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error('Não foi possível conectar ao maxlendar. Verifique sua conexão.');
  }

  if (!response.ok) {
    throw await readApiError(response);
  }

  const body = (await response.json()) as { event?: CalendarEvent };
  if (!body.event) {
    throw new Error('O servidor não confirmou o evento salvo. Tente novamente.');
  }

  return body.event;
}
