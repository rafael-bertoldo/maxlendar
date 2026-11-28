export type LocalDate = {
  year: number;
  month: number;
  day: number;
};

export type LocalTime = {
  hour: number;
  minute: number;
};

export type LocalParts = LocalDate & LocalTime;

export interface RecurrenceSeries {
  id: string;
  title: string;
  weekday: number;
  localTime: string;
  startDate: string | null;
  timeZone: string;
  version: number;
}

export interface RecurrenceOverride {
  localDate: string;
  startsAt: Date | null;
  title: string | null;
  deleted: boolean;
  version: number;
}

export interface ExpandedOccurrence {
  id: string;
  title: string;
  startsAt: Date;
  timeZone: string;
  version: number;
  seriesId: string;
  occurrenceKey: string;
  isException: boolean;
}

const OFFSET_SAMPLE_HOURS = [-26, -25, -24, -23, -22, -2, -1, 0, 1, 2, 22, 23, 24, 25, 26];

function utcMillis(local: LocalDate | LocalParts): number {
  const date = new Date(0);
  date.setUTCFullYear(local.year, local.month - 1, local.day);
  date.setUTCHours(
    "hour" in local ? local.hour : 0,
    "minute" in local ? local.minute : 0,
    0,
    0,
  );
  return date.getTime();
}

function isValidLocalDate(local: LocalDate): boolean {
  const date = new Date(utcMillis(local));
  return (
    date.getUTCFullYear() === local.year &&
    date.getUTCMonth() === local.month - 1 &&
    date.getUTCDate() === local.day
  );
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function offsetAt(instant: Date, timeZone: string): number {
  return utcMillis(partsInZone(instant, timeZone)) - instant.getTime();
}

function sameWallTime(left: LocalParts, right: LocalParts): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

function resolveExactLocalTime(local: LocalParts, timeZone: string): Date | null {
  if (
    !isValidLocalDate(local) ||
    !Number.isInteger(local.hour) ||
    !Number.isInteger(local.minute) ||
    local.hour < 0 ||
    local.hour > 23 ||
    local.minute < 0 ||
    local.minute > 59
  ) {
    return null;
  }

  const target = utcMillis(local);
  const offsets = new Set<number>();
  for (const hours of OFFSET_SAMPLE_HOURS) {
    offsets.add(offsetAt(new Date(target + hours * 3_600_000), timeZone));
  }

  let first: Date | null = null;
  for (const offset of offsets) {
    const candidate = new Date(target - offset);
    if (!sameWallTime(partsInZone(candidate, timeZone), local)) continue;
    if (!first || candidate.getTime() < first.getTime()) first = candidate;
  }
  return first;
}

function parseLocalTime(value: string): LocalTime | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function compareLocalDate(left: LocalDate, right: LocalDate): number {
  return utcMillis(left) - utcMillis(right);
}

export function partsInZone(date: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

export function addDays(local: LocalDate, amount: number): LocalDate {
  const date = new Date(utcMillis(local));
  date.setUTCDate(date.getUTCDate() + amount);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function localDateKey(local: LocalDate): string {
  return `${local.year}-${pad2(local.month)}-${pad2(local.day)}`;
}

export function parseLocalDateKey(value: string): LocalDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const local = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  return isValidLocalDate(local) ? local : null;
}

export function weekdayOfLocalDate(local: LocalDate): number {
  return new Date(utcMillis(local)).getUTCDay();
}

export function resolveLocalTime(local: LocalParts, timeZone: string): Date | null {
  const exact = resolveExactLocalTime(local, timeZone);
  if (exact) return exact;

  if (!isValidLocalDate(local)) return null;

  const startMinute = local.hour * 60 + local.minute + 1;
  for (let minute = startMinute; minute <= 23 * 60 + 59; minute += 1) {
    const shifted: LocalParts = {
      year: local.year,
      month: local.month,
      day: local.day,
      hour: Math.floor(minute / 60),
      minute: minute % 60,
    };
    const candidate = resolveExactLocalTime(shifted, timeZone);
    if (candidate) return candidate;
  }
  return null;
}

export function firstFutureOccurrence(
  weekday: number,
  hour: number,
  minute: number,
  timeZone: string,
  now: Date,
): Date | null {
  if (
    !Number.isInteger(weekday) ||
    weekday < 0 ||
    weekday > 6 ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  let local: LocalDate = partsInZone(now, timeZone);
  for (let checked = 0; checked < 14; checked += 1) {
    if (weekdayOfLocalDate(local) === weekday) {
      const instant = resolveLocalTime({ ...local, hour, minute }, timeZone);
      if (instant && instant.getTime() > now.getTime()) return instant;
    }
    local = addDays(local, 1);
  }
  return null;
}

export function expandSeriesOccurrences(
  series: RecurrenceSeries,
  overrides: RecurrenceOverride[],
  from: Date,
  to: Date,
): ExpandedOccurrence[] {
  const localTime = parseLocalTime(series.localTime);
  if (!localTime || from.getTime() >= to.getTime()) return [];

  const overridesByDate = new Map<string, RecurrenceOverride>();
  for (const override of overrides) {
    overridesByDate.set(override.localDate, override);
  }

  const firstDate = addDays(partsInZone(from, series.timeZone), -1);
  const lastDate = addDays(partsInZone(to, series.timeZone), 1);
  const occurrences: ExpandedOccurrence[] = [];
  let local: LocalDate = firstDate;

  while (compareLocalDate(local, lastDate) <= 0) {
    if (weekdayOfLocalDate(local) === series.weekday) {
      const occurrenceKey = localDateKey(local);
      if (series.startDate && occurrenceKey < series.startDate) {
        local = addDays(local, 1);
        continue;
      }
      const override = overridesByDate.get(occurrenceKey);
      if (override?.deleted) {
        local = addDays(local, 1);
        continue;
      }
      const resolved = resolveLocalTime({ ...local, ...localTime }, series.timeZone);
      const startsAt = override?.startsAt ?? resolved;

      if (
        startsAt &&
        startsAt.getTime() >= from.getTime() &&
        startsAt.getTime() < to.getTime()
      ) {
        occurrences.push({
          id: `${series.id}@${occurrenceKey}`,
          title: override?.title ?? series.title,
          startsAt,
          timeZone: series.timeZone,
          version: override?.version ?? series.version,
          seriesId: series.id,
          occurrenceKey,
          isException: Boolean(override),
        });
      }
    }
    local = addDays(local, 1);
  }

  return occurrences.sort(
    (left, right) =>
      left.startsAt.getTime() - right.startsAt.getTime() || left.id.localeCompare(right.id),
  );
}
