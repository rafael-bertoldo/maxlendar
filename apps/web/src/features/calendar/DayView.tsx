import type { CalendarEvent } from '../../shared/api/events';
import { formatDayLabel } from '../../shared/lib/calendar';
import { EventItem } from './EventItem';

type DayViewProps = {
  days: Date[];
  events: CalendarEvent[];
  onEdit: (event: CalendarEvent) => void;
};

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function DayView({ days, events, onEdit }: DayViewProps) {
  const day = days[0];
  const eventsByHour = new Map<number, CalendarEvent[]>();

  for (const event of events) {
    const hour = new Date(event.startsAt).getHours();
    const hourEvents = eventsByHour.get(hour) ?? [];
    hourEvents.push(event);
    eventsByHour.set(hour, hourEvents);
  }

  return (
    <div className="day-view">
      <p className="view-caption">{formatDayLabel(day)}</p>
      <div className="day-grid">
        {HOURS.map((hour) => (
          <div className="day-row" key={hour}>
            <span className="day-hour" aria-hidden="true">
              {String(hour).padStart(2, '0')}:00
            </span>
            <div className="day-slot">
              {(eventsByHour.get(hour) ?? []).map((event) => (
                <EventItem key={event.id} event={event} onEdit={onEdit} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
