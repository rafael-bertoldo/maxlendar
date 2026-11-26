import type { CalendarEvent } from '../../shared/api/events';
import { formatEventDateTime, formatInTimeZone } from '../../shared/lib/calendar';

type EventItemProps = {
  event: CalendarEvent;
  compact?: boolean;
};

export function EventItem({ event, compact = false }: EventItemProps) {
  const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hasDifferentTimeZone = event.timeZone !== viewerTimeZone;
  const originalTime = hasDifferentTimeZone
    ? formatInTimeZone(event.startsAt, event.timeZone)
    : null;
  const localTime = formatEventDateTime(event.startsAt);
  const provenance = hasDifferentTimeZone
    ? originalTime
      ? `Horário original: ${originalTime} (${event.timeZone})`
      : `Fuso original: ${event.timeZone} (horário indisponível)`
    : null;
  const compactProvenance = hasDifferentTimeZone
    ? originalTime
      ? `↔ ${originalTime} (${event.timeZone})`
      : `↔ ${event.timeZone}`
    : null;
  const label = provenance
    ? `${event.title}, ${localTime} no fuso ${viewerTimeZone}; ${provenance}`
    : `${event.title}, ${localTime} no fuso ${viewerTimeZone}`;

  return (
    <article
      className={compact ? 'event-item event-item-compact' : 'event-item'}
      aria-label={label}
    >
      <time className="event-time" dateTime={event.startsAt}>
        {localTime}
      </time>
      <span className="event-title">{event.title}</span>
      {provenance ? (
        <span className="event-origin" title={provenance}>
          {compact ? compactProvenance : provenance}
        </span>
      ) : null}
    </article>
  );
}
