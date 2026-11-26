import type { CalendarEvent } from '../../shared/api/events';
import { eventDateKey, formatWeekdayLabel, localDateKey } from '../../shared/lib/calendar';
import { EventItem } from './EventItem';

type WeekViewProps = {
  days: Date[];
  events: CalendarEvent[];
};

export function WeekView({ days, events }: WeekViewProps) {
  const eventsByDay = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const key = eventDateKey(event.startsAt);
    const dayEvents = eventsByDay.get(key) ?? [];
    dayEvents.push(event);
    eventsByDay.set(key, dayEvents);
  }

  return (
    <div className="week-view">
      {days.map((day) => {
        const key = localDateKey(day);
        const dayEvents = eventsByDay.get(key) ?? [];

        return (
          <section className="week-column" key={key} aria-label={`${formatWeekdayLabel(day)}, ${day.getDate()}`}>
            <h3 className="week-day-heading">
              <span>{formatWeekdayLabel(day)}</span>
              <strong>{day.getDate()}</strong>
            </h3>
            <div className="week-events">
              {dayEvents.length > 0 ? (
                dayEvents.map((event) => <EventItem key={event.id} event={event} compact />)
              ) : (
                <span className="day-empty" aria-hidden="true">—</span>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
