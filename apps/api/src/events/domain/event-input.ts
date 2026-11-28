import { BadRequestException } from "@nestjs/common";
import { partsInZone } from "../../recurrence/local-time";

export const MAX_TITLE_LENGTH = 120;
export const MAX_RANGE_DAYS = 62;
export const MAX_VERSION = 2_147_483_647;

const ISO_INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/;

export function validationError(field: string, message: string): BadRequestException {
  return new BadRequestException({
    code: "VALIDATION_ERROR",
    field,
    message,
  });
}

export function readTitle(value: unknown): string {
  if (typeof value !== "string") {
    throw validationError("title", "Title is required.");
  }

  const title = value.trim();
  if (!title || title.length > MAX_TITLE_LENGTH) {
    throw validationError("title", `Title must have between 1 and ${MAX_TITLE_LENGTH} characters.`);
  }

  return title;
}

export function readTimeZone(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw validationError("timeZone", "A valid IANA time zone is required.");
  }

  const timeZone = value.trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    throw validationError("timeZone", "A valid IANA time zone is required.");
  }

  return timeZone;
}

export function readVersion(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > MAX_VERSION
  ) {
    throw validationError("version", "A valid event version is required.");
  }

  return value;
}

export function readVersionParam(value: unknown): number {
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return readVersion(Number(value));
  }

  return readVersion(value);
}

export function readInstant(value: unknown, field: string): Date {
  if (typeof value !== "string") {
    throw validationError(field, "A valid date and time are required.");
  }

  const match = ISO_INSTANT.exec(value);
  if (!match) {
    throw validationError(field, "Use an ISO date and time with an explicit time-zone offset.");
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, millisecondText, zone, sign, offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = secondText ? Number(secondText) : 0;
  const millisecond = millisecondText ? Number(millisecondText.padEnd(3, "0")) : 0;

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    throw validationError(field, "The date or time is invalid.");
  }

  const localParts = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  if (
    localParts.getUTCFullYear() !== year ||
    localParts.getUTCMonth() !== month - 1 ||
    localParts.getUTCDate() !== day
  ) {
    throw validationError(field, "The date or time is invalid.");
  }

  let offsetMinutes = 0;
  if (zone !== "Z") {
    const offsetHour = Number(offsetHourText);
    const offsetMinute = Number(offsetMinuteText);
    if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) {
      throw validationError(field, "The time-zone offset is invalid.");
    }
    offsetMinutes = (offsetHour * 60 + offsetMinute) * (sign === "-" ? -1 : 1);
  }

  const instant = new Date(localParts.getTime() - offsetMinutes * 60_000);
  if (Number.isNaN(instant.getTime())) {
    throw validationError(field, "The date or time is invalid.");
  }

  return instant;
}

export function readRange(fromValue: unknown, toValue: unknown): { from: Date; to: Date } {
  const from = readInstant(fromValue, "from");
  const to = readInstant(toValue, "to");
  const span = to.getTime() - from.getTime();

  if (span <= 0 || span > MAX_RANGE_DAYS * 86_400_000) {
    throw validationError("from", `The range must be positive and at most ${MAX_RANGE_DAYS} days.`);
  }

  return { from, to };
}

export interface WeeklyRecurrence {
  frequency: "weekly";
  byWeekday: number[];
}

export type EventScope = "occurrence" | "series";

function unsupportedRecurrence(message: string): BadRequestException {
  return new BadRequestException({
    code: "UNSUPPORTED_RECURRENCE",
    message,
  });
}

export function readRecurrence(value: unknown): WeeklyRecurrence | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw validationError("recurrence", "The recurrence rule must be an object.");
  }

  const rule = value as Record<string, unknown>;
  const unsupportedFields = Object.keys(rule).filter(
    (key) => key !== "frequency" && key !== "byWeekday",
  );
  if (unsupportedFields.length > 0) {
    throw unsupportedRecurrence("Only weekly recurrence without an end date is supported.");
  }
  if (rule.frequency !== "weekly") {
    throw unsupportedRecurrence("Only weekly recurrence is supported.");
  }
  if (!Array.isArray(rule.byWeekday) || rule.byWeekday.length !== 1) {
    throw unsupportedRecurrence("Choose exactly one weekday per weekly recurrence.");
  }

  const byWeekday: number[] = [];
  for (const weekday of rule.byWeekday) {
    if (
      typeof weekday !== "number" ||
      !Number.isInteger(weekday) ||
      weekday < 0 ||
      weekday > 6
    ) {
      throw validationError("recurrence.byWeekday", "Weekdays must be integers from 0 to 6.");
    }
    if (byWeekday.includes(weekday)) {
      throw validationError("recurrence.byWeekday", "Weekdays must be unique.");
    }
    byWeekday.push(weekday);
  }

  return { frequency: "weekly", byWeekday };
}

export function readScope(value: unknown): EventScope {
  if (value === undefined || value === "series") return "series";
  if (value === "occurrence") return "occurrence";
  throw validationError("scope", "Scope must be either 'occurrence' or 'series'.");
}

export function readLocalTime(startsAt: Date, timeZone: string): string {
  const local = partsInZone(startsAt, timeZone);
  return `${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`;
}
