import type { CalendarEvent } from '../../shared/api/events';
import { formatEventDateTime, formatInTimeZone } from '../../shared/lib/calendar';

type EventItemProps = {
  event: CalendarEvent;
  compact?: boolean;
  onEdit: (event: CalendarEvent) => void;
};

export function EventItem({ event, compact = false, onEdit }: EventItemProps) {
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
    ? `${event.title}, ${localTime} no fuso ${viewerTimeZone}; ${provenance}. Editar evento.`
    : `${event.title}, ${localTime} no fuso ${viewerTimeZone}. Editar evento.`;

  return (
    <button
      type="button"
      className={compact ? 'event-item event-item-compact' : 'event-item'}
      aria-label={label}
      title="Clique para editar"
      onClick={() => onEdit(event)}
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
      <span className="event-edit-hint" aria-hidden="true">✎</span>
    </button>
  );
}
