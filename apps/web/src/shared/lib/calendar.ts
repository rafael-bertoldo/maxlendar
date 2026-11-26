export type CalendarView = 'day' | 'week' | 'month';

export const CALENDAR_VIEWS: { id: CalendarView; label: string }[] = [
  { id: 'day', label: 'Dia' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
];

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const daysSinceMonday = (day.getDay() + 6) % 7;
  return addDays(day, -daysSinceMonday);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function calendarDays(view: CalendarView, anchor: Date): Date[] {
  if (view === 'day') return [startOfDay(anchor)];

  if (view === 'week') {
    const firstDay = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, index) => addDays(firstDay, index));
  }

  const firstDay = startOfWeek(startOfMonth(anchor));
  const lastDateOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const lastDay = addDays(startOfWeek(lastDateOfMonth), 6);
  const days: Date[] = [];

  for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
    days.push(day);
  }

  return days;
}

export function rangeForView(view: CalendarView, anchor: Date): { from: Date; to: Date; days: Date[] } {
  const days = calendarDays(view, anchor);
  const lastDay = days[days.length - 1];
  return { from: days[0], to: addDays(lastDay, 1), days };
}

export function moveAnchor(view: CalendarView, anchor: Date, direction: -1 | 1): Date {
  if (view === 'day') return addDays(anchor, direction);
  if (view === 'week') return addDays(anchor, direction * 7);
  return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function eventDateKey(instant: string): string {
  return localDateKey(new Date(instant));
}

export function formatTime(instant: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant));
}

export function formatDayLabel(date: Date): string {
  const label = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatWeekdayLabel(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(date)
    .replace('.', '')
    .replace(/^./, (character) => character.toUpperCase());
}

export function formatRangeTitle(view: CalendarView, anchor: Date, days: Date[]): string {
  if (view === 'day') {
    const label = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(anchor);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  if (view === 'week') {
    const first = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(days[0]);
    const last = new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(days[days.length - 1]);
    return `${first} – ${last}`;
  }

  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(anchor);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
