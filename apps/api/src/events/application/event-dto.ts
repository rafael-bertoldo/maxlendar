export interface RecurrenceDto {
  frequency: "weekly";
  byWeekday: number[];
}

import type { ExpandedOccurrence } from "../../recurrence/local-time";

export interface CalendarEventDto {
  id: string;
  title: string;
  startsAt: string;
  timeZone: string;
  version: number;
  source: "one-off" | "recurring";
  seriesId?: string;
  occurrenceKey?: string;
  isException?: boolean;
  recurrence?: RecurrenceDto;
}

export function weeklyRecurrence(weekday: number): RecurrenceDto {
  return { frequency: "weekly", byWeekday: [weekday] };
}

export function toRecurringEventDto(
  occurrence: ExpandedOccurrence,
  recurrence: RecurrenceDto,
): CalendarEventDto {
  return {
    id: occurrence.id,
    title: occurrence.title,
    startsAt: occurrence.startsAt.toISOString(),
    timeZone: occurrence.timeZone,
    version: occurrence.version,
    source: "recurring",
    seriesId: occurrence.seriesId,
    occurrenceKey: occurrence.occurrenceKey,
    isException: occurrence.isException,
    recurrence,
  };
}
