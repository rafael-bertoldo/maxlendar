import { PrismaService } from "../../database/prisma.service";
import { parseLocalDateKey } from "../../recurrence/local-time";

export interface SeriesRecord {
  id: string;
  calendarId: string;
  title: string;
  weekday: number;
  localTime: string;
  startDate: string | null;
  timeZone: string;
  version: number;
  deletedAt: Date | null;
}

export interface ExceptionRecord {
  id: string;
  seriesId: string;
  localDate: string;
  startsAt: Date | null;
  title: string | null;
  deleted: boolean;
  version: number;
}

export interface SeriesLookup {
  series: SeriesRecord;
  occurrenceKey?: string;
}

export interface ExceptionLookup {
  exception: ExceptionRecord;
  series: SeriesRecord;
}

const SERIES_SELECT = {
  id: true,
  calendarId: true,
  title: true,
  weekday: true,
  localTime: true,
  startDate: true,
  timeZone: true,
  version: true,
  deletedAt: true,
} as const;

const EXCEPTION_SELECT = {
  id: true,
  seriesId: true,
  localDate: true,
  startsAt: true,
  title: true,
  deleted: true,
  version: true,
} as const;

function splitOccurrenceId(id: string): { seriesId: string; localDate: string } | null {
  const separator = id.indexOf("@");
  if (separator < 1 || separator === id.length - 1) return null;
  return { seriesId: id.slice(0, separator), localDate: id.slice(separator + 1) };
}

export async function findSeriesLookup(
  prisma: PrismaService,
  userId: string,
  id: string,
): Promise<SeriesLookup | null> {
  const synthetic = splitOccurrenceId(id);
  if (synthetic) {
    const series = await prisma.recurringEvent.findFirst({
      where: { id: synthetic.seriesId, calendar: { userId } },
      select: SERIES_SELECT,
    });
    if (series) {
      return {
        series,
        occurrenceKey: parseLocalDateKey(synthetic.localDate) ? synthetic.localDate : undefined,
      };
    }
  }

  const direct = await prisma.recurringEvent.findFirst({
    where: { id, calendar: { userId } },
    select: SERIES_SELECT,
  });
  if (direct) return { series: direct };

  const exception = await prisma.recurringOccurrence.findFirst({
    where: { id, series: { calendar: { userId } } },
    select: {
      ...EXCEPTION_SELECT,
      series: { select: SERIES_SELECT },
    },
  });
  if (exception) return { series: exception.series, occurrenceKey: exception.localDate };

  return null;
}

export async function findExceptionLookup(
  prisma: PrismaService,
  userId: string,
  id: string,
): Promise<ExceptionLookup | null> {
  const synthetic = splitOccurrenceId(id);
  const where = synthetic
    ? {
        seriesId: synthetic.seriesId,
        localDate: synthetic.localDate,
        series: { calendar: { userId } },
      }
    : { id, series: { calendar: { userId } } };

  const exception = await prisma.recurringOccurrence.findFirst({
    where,
    select: {
      ...EXCEPTION_SELECT,
      series: { select: SERIES_SELECT },
    },
  });

  return exception ? { exception, series: exception.series } : null;
}
