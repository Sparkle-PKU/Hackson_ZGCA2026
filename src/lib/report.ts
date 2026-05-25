import type { SerializedRecord, ReportPayload, StructuredReport } from "@/lib/types";
import { generateStructuredReport } from "@/lib/ai";

function cnDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric"
  }).format(new Date(date));
}

function mapStructuredToPayload(
  structured: StructuredReport,
  records: SerializedRecord[]
): ReportPayload {
  const sorted = [...records].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );

  const timeline = sorted.map((record) => ({
    id: record.id,
    date: cnDate(record.capturedAt),
    summary: record.aiSummary || record.userNote || "一条日常记录",
    location: record.location,
    emotion: record.emotion,
    imagePath: record.imagePath,
    imageDescription: record.imageDescription || null
  }));

  return {
    themeName: structured.themeName,
    title: structured.title,
    subtitle: structured.subtitle,
    coverImage: structured.coverImage,
    prologue: structured.prologue,
    keywords: structured.keywords,
    stats: structured.stats,
    yearNarrative: structured.yearNarrative,
    featureSections: structured.featureSections,
    moments: structured.moments,
    timeline,
    selfPortrait: structured.selfPortrait,
    closing: structured.closing,
    structured
  };
}

export async function buildReport(
  records: SerializedRecord[],
  year: number,
  month?: number
): Promise<ReportPayload> {
  const structured = await generateStructuredReport(records, year, month);
  return mapStructuredToPayload(structured, records);
}

export function periodRange(year: number, month?: number) {
  const start = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const end = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
  return { start, end };
}
