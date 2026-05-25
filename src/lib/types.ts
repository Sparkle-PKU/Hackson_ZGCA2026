import type { Record } from "@prisma/client";

export type AiRecordInsight = {
  summary: string;
  date_hint?: string;
  location?: string;
  people: string[];
  activities: string[];
  food: string[];
  objects: string[];
  transport: string[];
  emotion?: string;
  tags: string[];
  story_value: string;
  imageDescription?: string;
};

export type SerializedRecord = Omit<
  Record,
  "capturedAt" | "uploadedAt" | "people" | "activities" | "food" | "objects" | "transport" | "tags"
> & {
  capturedAt: string;
  uploadedAt: string;
  people: string[];
  activities: string[];
  food: string[];
  objects: string[];
  transport: string[];
  tags: string[];
  imageDescription?: string | null;
};

export type StructuredReport = {
  themeName: string;
  subtitle: string;
  title: string;
  coverImage: string;
  prologue: string;
  keywords: string[];
  stats: {
    totalRecords: number;
    activeDays: number;
    topLocations: string[];
    topActivities: string[];
    topEmotions: string[];
  };
  yearNarrative: Array<{
    title: string;
    text: string;
  }>;
  featureSections: Array<{
    title: string;
    subtitle: string;
    text: string;
    tags: string[];
    images: string[];
  }>;
  moments: Array<{
    title: string;
    date: string;
    text: string;
    image: string;
  }>;
  selfPortrait: string;
  closing: string;
};

export type ReportPayload = {
  themeName: string;
  title: string;
  subtitle: string;
  coverImage: string;
  prologue: string;
  keywords: string[];
  stats: {
    totalRecords: number;
    activeDays: number;
    topLocations: string[];
    topActivities: string[];
    topEmotions: string[];
  };
  yearNarrative: Array<{
    title: string;
    text: string;
  }>;
  featureSections: Array<{
    title: string;
    subtitle: string;
    text: string;
    tags: string[];
    images: string[];
  }>;
  moments: Array<{
    title: string;
    date: string;
    text: string;
    image: string;
  }>;
  timeline: Array<{
    id: string;
    date: string;
    summary: string;
    location?: string | null;
    emotion?: string | null;
    imagePath: string;
    imageDescription?: string | null;
  }>;
  selfPortrait: string;
  closing: string;
  structured?: StructuredReport;
};

export function jsonArray(value: unknown): string[] {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return jsonArray(parsed);
    } catch {
      return value
        .split(/[,，、\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function serializeRecord(record: Record): SerializedRecord {
  return {
    ...record,
    capturedAt: record.capturedAt.toISOString(),
    uploadedAt: record.uploadedAt.toISOString(),
    people: jsonArray(record.people),
    activities: jsonArray(record.activities),
    food: jsonArray(record.food),
    objects: jsonArray(record.objects),
    transport: jsonArray(record.transport),
    tags: jsonArray(record.tags)
  };
}
