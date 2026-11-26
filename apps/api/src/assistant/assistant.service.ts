import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import type { AssistantDraft, AssistantResult, AssistantTarget } from "./assistant.types";

type LocalDate = { year: number; month: number; day: number };
type LocalTime = { hour: number; minute: number };
type DateTimeParse = { startsAt: string; matched: string[]; ambiguous: boolean };

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  terça: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
  sábado: 6,
};

const MONTHS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  março: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const STOP_WORDS = new Set([
  "crie", "criar", "agende", "agendar", "marque", "marcar", "adicione", "adicionar",
  "mude", "mudar", "altere", "alterar", "reagende", "reagendar", "mova", "mover",
  "renomeie", "renomear", "antecipe", "atrasse", "exclua", "excluir", "delete",
  "deletar", "remova", "remover", "apague", "apagar", "hoje", "amanha", "depois",
  "proxima", "segunda", "terca", "terça", "quarta", "quinta", "sexta", "sabado",
  "sábado", "domingo", "para", "como", "qual", "quando", "tenho", "evento",
  "compromisso", "reuniao", "reunião", "algo", "alguem", "que", "quais", "os",
  "tem", "houver", "minha", "meu", "dia", "semana", "proximo", "por", "favor",
  "agenda", "diga", "me", "sobre", "eventos", "compromissos",
]);

function fold(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function partsInZone(date: Date, timeZone: string) {
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
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute") };
}

function asUtc(local: LocalDate & LocalTime): number {
  return Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
}

function offsetAt(instant: Date, timeZone: string): number {
  const parts = partsInZone(instant, timeZone);
  return asUtc(parts) - instant.getTime();
}

function resolveLocalCandidates(local: LocalDate & LocalTime, timeZone: string): Date[] {
  const target = asUtc(local);
  const offsets = new Set<number>();
  for (const hours of [-26, -25, -24, -23, -22, -2, -1, 0, 1, 2, 22, 23, 24, 25, 26]) {
    offsets.add(offsetAt(new Date(target + hours * 3_600_000), timeZone));
  }

  const candidates: Date[] = [];
  for (const offset of offsets) {
    const candidate = new Date(target - offset);
    if (asUtc(partsInZone(candidate, timeZone)) !== target) continue;
    if (!candidates.some((existing) => existing.getTime() === candidate.getTime())) {
      candidates.push(candidate);
    }
  }
  return candidates;
}

function zonedLocalToUtc(local: LocalDate & LocalTime, timeZone: string): Date | null {
  return resolveLocalCandidates(local, timeZone)[0] ?? null;
}

function addDays(local: LocalDate, amount: number): LocalDate {
  const date = new Date(Date.UTC(local.year, local.month - 1, local.day + amount));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function isAmbiguous(local: LocalDate & LocalTime, timeZone: string): boolean {
  return resolveLocalCandidates(local, timeZone).length > 1;
}

function findLocalDate(text: string, referenceLocal: LocalDate): { date: LocalDate; matched: string; label: string } | null {
  const normalized = fold(text);

  if (normalized.includes("depois de amanha")) {
    const index = normalized.indexOf("depois de amanha");
    return { date: addDays(referenceLocal, 2), matched: text.slice(index, index + 16), label: "depois de amanhã" };
  }
  if (normalized.includes("amanha")) {
    const index = normalized.indexOf("amanha");
    return { date: addDays(referenceLocal, 1), matched: text.slice(index, index + 6), label: "amanhã" };
  }
  if (normalized.includes("hoje")) {
    const index = normalized.indexOf("hoje");
    return { date: referenceLocal, matched: text.slice(index, index + 4), label: "hoje" };
  }

  const nextWeek = normalized.match(/\bproxima\s+(domingo|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado)\b/);
  if (nextWeek) {
    const todayWeekday = new Date(Date.UTC(referenceLocal.year, referenceLocal.month - 1, referenceLocal.day)).getUTCDay();
    const target = WEEKDAYS[nextWeek[1]] ?? 1;
    const days = (target - todayWeekday + 7) % 7 || 7;
    return { date: addDays(referenceLocal, days), matched: nextWeek[0], label: `próxima ${nextWeek[1]}` };
  }

  const weekday = normalized.match(/\b(domingo|segunda|terca|terça|quarta|quinta|sexta|sabado|sábado)\b/);
  if (weekday) {
    const todayWeekday = new Date(Date.UTC(referenceLocal.year, referenceLocal.month - 1, referenceLocal.day)).getUTCDay();
    const target = WEEKDAYS[weekday[1]] ?? 1;
    const days = (target - todayWeekday + 7) % 7;
    return { date: addDays(referenceLocal, days), matched: weekday[0], label: weekday[1] };
  }

  const numeric = text.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (numeric) {
    const month = Number(numeric[1]);
    const day = Number(numeric[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { date: { year: referenceLocal.year, month, day }, matched: numeric[0], label: numeric[0] };
    }
  }

  const namedMonth = normalized.match(/\b(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/);
  if (namedMonth) {
    return {
      date: { year: referenceLocal.year, month: MONTHS[namedMonth[2]] ?? 1, day: Number(namedMonth[1]) },
      matched: namedMonth[0],
      label: namedMonth[0],
    };
  }

  const inDays = normalized.match(/\bem\s+(\d{1,2})\s+dias\b/);
  if (inDays) {
    return { date: addDays(referenceLocal, Number(inDays[1])), matched: inDays[0], label: `em ${inDays[1]} dias` };
  }

  return null;
}

function findLocalTime(text: string): { time: LocalTime; matched: string } | null {
  const normalized = fold(text);
  if (normalized.includes("meia noite")) {
    const index = normalized.indexOf("meia noite");
    return { time: { hour: 0, minute: 0 }, matched: text.slice(index, index + 10) };
  }
  if (normalized.includes("meio dia")) {
    const index = normalized.indexOf("meio dia");
    return { time: { hour: 12, minute: 0 }, matched: text.slice(index, index + 8) };
  }
  const afterPreposition = text.match(/(?:às|as)\s+(\d{1,2})(?::(\d{2}))?(?!\d)/i);
  if (afterPreposition) {
    const hour = Number(afterPreposition[1]);
    const minute = Number(afterPreposition[2] ?? 0);
    if (hour <= 23 && minute <= 59) {
      return { time: { hour, minute }, matched: afterPreposition[0] };
    }
  }

  const clock = text.match(/\b(\d{1,2})(?::(\d{2})|h(\d{2})?)\b/);
  if (clock) {
    const hour = Number(clock[1]);
    const minute = Number(clock[2] ?? clock[3] ?? 0);
    if (hour <= 23 && minute <= 59) {
      return { time: { hour, minute }, matched: clock[0] };
    }
  }
  const period = normalized.match(/\bde (manha|tarde|noite)\b/);
  if (period) {
    const hours: Record<string, number> = { manha: 9, tarde: 15, noite: 20 };
    return { time: { hour: hours[period[1]] ?? 9, minute: 0 }, matched: period[0] };
  }
  return null;
}

function parseDateTime(text: string, reference: Date, timeZone: string): DateTimeParse | null {
  const datePart = findLocalDate(text, partsInZone(reference, timeZone));
  const timePart = findLocalTime(text);
  if (!datePart || !timePart) return null;

  const local = { ...datePart.date, ...timePart.time };
  const instant = zonedLocalToUtc(local, timeZone);
  if (!instant) return null;

  return {
    startsAt: instant.toISOString(),
    matched: [datePart.matched, timePart.matched],
    ambiguous: isAmbiguous(local, timeZone),
  };
}

function removePhrases(text: string, phrases: string[]): string {
  let cleaned = text;
  for (const phrase of phrases) {
    if (!phrase.trim()) continue;
    cleaned = cleaned.replace(new RegExp(escapeRegExp(phrase), "gi"), " ");
  }
  return cleaned
    .replace(/\b(crie|criar|agende|agendar|marque|marcar|adicione|adicionar|mude|mudar|altere|alterar|reagende|reagendar|mova|mover|renomeie|renomear|antecipe|atrasse|exclua|excluir|delete|deletar|remova|remover|apague|apagar|hoje|amanhã|amanha|depois|próxima|proxima|segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo|às|para|um|uma)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function tokens(value: string): string[] {
  return fold(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function formatLocal(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function clarification(message: string): AssistantResult {
  return { kind: "clarification", message, confidence: "none" };
}

function detectIntent(text: string): "answer" | "delete" | "edit" | "create" {
  const normalized = fold(text);
  if (normalized.includes("?")) return "answer";
  if (/\b(o que|quais|quando|tenho|agenda|eventos|compromissos|procurar|encontre)\b/.test(normalized)) return "answer";
  if (/\b(exclua|excluir|delete|deletar|remova|remover|apague|apagar)\b/.test(normalized)) return "delete";
  if (/\b(mude|mudar|altere|alterar|reagende|reagendar|mova|mover|renomeie|renomear|antecipe|atrasse)\b/.test(normalized)) return "edit";
  return "create";
}

@Injectable()
export class AssistantService {
  constructor(private readonly prisma: PrismaService) {}

  async interpret(userId: string, text: string, timeZone: string, reference: Date): Promise<AssistantResult> {
    const intent = detectIntent(text);
    if (intent === "answer") return this.answer(userId, text, timeZone, reference);
    if (intent === "delete") return this.delete(userId, text, timeZone, reference);
    if (intent === "edit") return this.edit(userId, text, timeZone, reference);
    return this.create(text, timeZone, reference);
  }

  private async create(text: string, timeZone: string, reference: Date): Promise<AssistantResult> {
    const parsed = parseDateTime(text, reference, timeZone);
    if (!parsed) {
      return clarification("Informe uma data e um horário, por exemplo: ‘Reunião de plano amanhã às 10’.");
    }
    if (parsed.ambiguous) {
      return clarification("Esse horário pode ser ambíguo por causa da mudança de fuso. Informe um horário diferente ou um offset explícito.");
    }

    const title = capitalize(removePhrases(text, parsed.matched));
    if (!title || ["evento", "compromisso"].includes(fold(title))) {
      return clarification("Informe um título para o evento, por exemplo: ‘Dentista amanhã às 14:30’.");
    }

    return {
      kind: "create",
      message: `Entendi: criar “${title}” no horário informado. Revise antes de salvar.`,
      draft: { title, startsAt: parsed.startsAt, timeZone },
      confidence: "high",
    };
  }

  private async answer(userId: string, text: string, timeZone: string, reference: Date): Promise<AssistantResult> {
    const normalized = fold(text);
    const referenceLocal = partsInZone(reference, timeZone);
    const mondayOf = (date: LocalDate) => {
      const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
      return addDays(date, -(weekday === 0 ? 6 : weekday - 1));
    };

    if (normalized.includes("semana que vem") || normalized.includes("proxima semana")) {
      const monday = addDays(mondayOf(referenceLocal), 7);
      const sunday = addDays(monday, 6);
      const from = zonedLocalToUtc({ ...monday, hour: 0, minute: 0 }, timeZone)!;
      const to = zonedLocalToUtc({ ...sunday, hour: 23, minute: 59 }, timeZone)!;
      return this.answerFromRange(userId, text, from, to, "na semana que vem", timeZone, false);
    }

    if (normalized.includes("esta semana") || normalized.includes("essa semana")) {
      const monday = mondayOf(referenceLocal);
      const sunday = addDays(monday, 6);
      const from = zonedLocalToUtc({ ...monday, hour: 0, minute: 0 }, timeZone)!;
      const to = zonedLocalToUtc({ ...sunday, hour: 23, minute: 59 }, timeZone)!;
      return this.answerFromRange(userId, text, from, to, "nesta semana", timeZone, false);
    }

    const datePart = findLocalDate(text, referenceLocal);
    if (datePart) {
      const from = zonedLocalToUtc({ ...datePart.date, hour: 0, minute: 0 }, timeZone)!;
      const to = zonedLocalToUtc({ ...datePart.date, hour: 23, minute: 59 }, timeZone)!;
      return this.answerFromRange(userId, text, from, to, `em ${datePart.label}`, timeZone, false);
    }

    const questionTokens = tokens(text);
    if (questionTokens.length === 0) {
      return clarification("Por qual período devo procurar? Você pode perguntar, por exemplo, ‘O que tenho hoje?’.");
    }

    const from = new Date(reference.getTime() - 7 * 86_400_000);
    const to = new Date(reference.getTime() + 14 * 86_400_000);
    return this.answerFromRange(userId, text, from, to, "nos próximos dias", timeZone, true);
  }

  private async answerFromRange(
    userId: string,
    text: string,
    from: Date,
    to: Date,
    label: string,
    timeZone: string,
    applyTitleFilter: boolean,
  ): Promise<AssistantResult> {
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        calendar: { userId },
        startsAt: { gte: from, lte: to },
      },
      select: { id: true, title: true, startsAt: true },
      orderBy: { startsAt: "asc" },
    });

    const questionTokens = applyTitleFilter ? tokens(text) : [];
    const matches = questionTokens.length > 0
      ? events.filter((event) => {
          const title = fold(event.title);
          return questionTokens.every((token) => title.includes(token));
        })
      : events;

    if (matches.length === 0) {
      return {
        kind: "answer",
        message: "Responda sempre a partir dos seus eventos salvos.",
        answer: `Não encontrei eventos ${label}.`,
        evidence: [],
        confidence: "high",
      };
    }

    const lines = matches.slice(0, 8).map((event) => `${formatLocal(event.startsAt.toISOString(), timeZone)} — ${event.title}`);
    const more = matches.length > 8 ? ` e mais ${matches.length - 8}` : "";
    return {
      kind: "answer",
      message: "Responda sempre a partir dos seus eventos salvos.",
      answer: `Você tem ${matches.length} evento(s) ${label}: ${lines.join("; ")}${more}.`,
      evidence: matches.slice(0, 8).map((event) => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt.toISOString(),
      })),
      confidence: "high",
    };
  }

  private async delete(userId: string, text: string, timeZone: string, reference: Date): Promise<AssistantResult> {
    const result = await this.findTarget(userId, text, timeZone, reference);
    if ("kind" in result) return result;
    return {
      kind: "delete",
      message: `Entendi: excluir “${result.target.title}”. Revise antes de confirmar.`,
      target: result.target,
      confidence: "high",
    };
  }

  private async edit(userId: string, text: string, timeZone: string, reference: Date): Promise<AssistantResult> {
    const parts = text.split(/\bpara\b/i);
    const targetText = parts[0] ?? text;
    const changeText = parts.length > 1 ? parts.slice(1).join(" ") : "";

    const result = await this.findTarget(userId, targetText, timeZone, reference);
    if ("kind" in result) return result;

    const changes: Partial<AssistantDraft> = {};
    const parsed = changeText ? parseDateTime(changeText, reference, timeZone) : null;

    if (parsed?.ambiguous) {
      return clarification("Esse horário pode ser ambíguo por causa da mudança de fuso. Informe outro horário ou um offset explícito.");
    }
    if (parsed) {
      changes.startsAt = parsed.startsAt;
      changes.timeZone = timeZone;
    } else if (changeText) {
      const title = capitalize(removePhrases(changeText, []));
      if (title) changes.title = title;
    }

    if (Object.keys(changes).length === 0) {
      return clarification("O que devo alterar nesse evento? Informe um novo título, data ou horário.");
    }

    return {
      kind: "edit",
      message: `Entendi: alterar “${result.target.title}”. Revise as mudanças antes de confirmar.`,
      target: result.target,
      changes,
      confidence: "high",
    };
  }

  private async findTarget(
    userId: string,
    text: string,
    timeZone: string,
    reference: Date,
  ): Promise<AssistantResult | { target: AssistantTarget }> {
    const targetTokens = tokens(text);
    if (targetTokens.length === 0) {
      return clarification("Qual evento? Informe parte do título, por exemplo: ‘Excluir reunião de plano’.");
    }

    const from = new Date(reference.getTime() - 14 * 86_400_000);
    const to = new Date(reference.getTime() + 14 * 86_400_000);
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        calendar: { userId },
        startsAt: { gte: from, lte: to },
      },
      select: { id: true, title: true, startsAt: true, creationTimeZone: true, version: true },
      orderBy: { startsAt: "asc" },
    });

    const matches = events.filter((event) => {
      const title = fold(event.title);
      return targetTokens.every((token) => title.includes(token));
    });

    if (matches.length === 0) {
      void timeZone;
      return clarification("Não encontrei um evento com esse título nos próximos 14 dias. Você pode dizer outro título?");
    }
    if (matches.length > 1) {
      const titles = matches.slice(0, 4).map((event) => `“${event.title}”`).join(", ");
      return clarification(`Encontrei mais de um evento possível: ${titles}. Especifique melhor o título.`);
    }

    const match = matches[0];
    return {
      target: {
        id: match.id,
        title: match.title,
        startsAt: match.startsAt.toISOString(),
        timeZone: match.creationTimeZone,
        version: match.version,
      },
    };
  }
}
