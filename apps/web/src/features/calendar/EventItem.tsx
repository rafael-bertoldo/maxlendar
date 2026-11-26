import type { CalendarEvent } from '../../shared/api/events';
import { formatEventDateTime, formatInTimeZone } from '../../shared/lib/calendar';

type EventItemProps = {
  event: CalendarEvent;
  compact?: boolean;
};

const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function EventItem({ event, compact = false }: EventItemProps) {
  const originalTime =
    event.timeZone !== viewerTimeZone ? formatInTimeZone(event.startsAt, event.timeZone) : null;
  const label = originalTime
    ? `${event.title}, ${formatEventDateTime(event.startsAt)} no fuso ${viewerTimeZone}; horário original ${originalTime} em ${event.timeZone}`
    : `${event.title}, ${formatEventDateTime(event.startsAt)} no fuso ${viewerTimeZone}`;

  return (
    <article
      className={compact ? 'event-item event-item-compact' : 'event-item'}
      aria-label={label}
    >
      <time className="event-time" dateTime={event.startsAt}>
        {formatEventDateTime(event.startsAt)}
      </time>
      <span className="event-title">{event.title}</span>
      {originalTime ? (
        <span
          className="event-origin"
          title={`Horário original: ${originalTime} em ${event.timeZone}`}
        >
          {compact ? `↔ ${event.timeZone}` : `Horário original: ${originalTime} (${event.timeZone})`}
        </span>
      ) : null}
    </article>
  );
}
