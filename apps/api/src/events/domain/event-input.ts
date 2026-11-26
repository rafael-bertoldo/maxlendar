import { BadRequestException } from "@nestjs/common";

export const MAX_TITLE_LENGTH = 120;
export const MAX_RANGE_DAYS = 62;

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
