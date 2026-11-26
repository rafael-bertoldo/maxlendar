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

export async function createEvent(
  input: {
    title: string;
    startsAt: string;
    timeZone: string;
  },
  signal?: AbortSignal,
): Promise<CalendarEvent> {
  let response: Response;

  try {
    response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
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

export async function deleteEvent(
  id: string,
  version: number,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`/api/events/${encodeURIComponent(id)}?version=${version}`, {
      method: 'DELETE',
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
}

export async function updateEvent(
  id: string,
  input: {
    title: string;
    startsAt: string;
    timeZone: string;
    version: number;
  },
  signal?: AbortSignal,
): Promise<CalendarEvent> {
  let response: Response;

  try {
    response = await fetch(`/api/events/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Não foi possível conectar ao maxlendar. Verifique sua conexão.');
  }

  if (!response.ok) {
    throw await readApiError(response);
  }

  const body = (await response.json()) as { event?: CalendarEvent };
  if (!body.event) {
    throw new Error('O servidor não confirmou o evento alterado. Tente novamente.');
  }

  return body.event;
}
