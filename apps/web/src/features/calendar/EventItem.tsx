import type { CalendarEvent } from '../../shared/api/events';
import { formatTime } from '../../shared/lib/calendar';

type EventItemProps = {
  event: CalendarEvent;
  compact?: boolean;
};

export function EventItem({ event, compact = false }: EventItemProps) {
  return (
    <div className={compact ? 'event-item event-item-compact' : 'event-item'}>
      <time className="event-time" dateTime={event.startsAt}>
        {formatTime(event.startsAt)}
      </time>
      <span className="event-title">{event.title}</span>
    </div>
  );
}
