export type AssistantRecurrence = {
  frequency: "weekly";
  byWeekday: number[];
};

export type AssistantDraft = {
  title: string;
  startsAt: string;
  timeZone: string;
  recurrence?: AssistantRecurrence;
};

export type AssistantTarget = {
  id: string;
  title: string;
  startsAt: string;
  timeZone: string;
  version: number;
  source?: "one-off" | "recurring";
  seriesId?: string;
  occurrenceKey?: string;
  isException?: boolean;
  recurrence?: AssistantRecurrence;
};

export type AssistantEvidence = {
  id: string;
  title: string;
  startsAt: string;
};

export type AssistantResult =
  | {
      kind: "create";
      message: string;
      draft: AssistantDraft;
      confidence: "high" | "medium";
    }
  | {
      kind: "answer";
      message: string;
      answer: string;
      evidence: AssistantEvidence[];
      confidence: "high" | "medium";
    }
  | {
      kind: "edit";
      message: string;
      target: AssistantTarget;
      changes: Partial<AssistantDraft>;
      confidence: "high" | "medium";
    }
  | {
      kind: "delete";
      message: string;
      target: AssistantTarget;
      confidence: "high" | "medium";
    }
  | {
      kind: "clarification";
      message: string;
      confidence: "none";
    };
