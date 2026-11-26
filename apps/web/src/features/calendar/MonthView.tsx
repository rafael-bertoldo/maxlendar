import type { CalendarEvent } from '../../shared/api/events';
import { eventDateKey, formatWeekdayLabel, localDateKey } from '../../shared/lib/calendar';
import { EventItem } from './EventItem';

type MonthViewProps = {
  anchor: Date;
  days: Date[];
  events: CalendarEvent[];
};

export function MonthView({ anchor, days, events }: MonthViewProps) {
  const eventsByDay = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const key = eventDateKey(event.startsAt);
    const dayEvents = eventsByDay.get(key) ?? [];
    dayEvents.push(event);
    eventsByDay.set(key, dayEvents);
  }

  return (
    <div className="month-view">
      <div className="month-weekdays" aria-hidden="true">
        {days.slice(0, 7).map((day) => (
          <span key={localDateKey(day)}>{formatWeekdayLabel(day)}</span>
        ))}
      </div>
      <div className="month-grid">
        {days.map((day) => {
          const key = localDateKey(day);
          const dayEvents = eventsByDay.get(key) ?? [];
          const isOutsideMonth = day.getMonth() !== anchor.getMonth();

          return (
            <section
              className={isOutsideMonth ? 'month-cell month-cell-outside' : 'month-cell'}
              key={key}
              aria-label={`${day.getDate()} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(day)}`}
            >
              <span className="month-day-number">{day.getDate()}</span>
              <div className="month-events">
                {dayEvents.map((event) => (
                  <EventItem key={event.id} event={event} compact />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
