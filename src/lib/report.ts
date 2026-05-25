import type { SerializedRecord, ReportPayload } from "@/lib/types";
import { writeReportNarrative } from "@/lib/ai";

function countTop(values: string[], limit = 5) {
  const map = new Map<string, number>();
  for (const value of values.filter(Boolean)) {
    map.set(value, (map.get(value) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function cnDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric"
  }).format(new Date(date));
}

export async function buildReport(records: SerializedRecord[], year: number, month?: number): Promise<ReportPayload> {
  const sorted = [...records].sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  const activeDays = new Set(sorted.map((record) => record.capturedAt.slice(0, 10))).size;
  const periodName = month ? `${year} 年 ${month} 月` : `${year} 年`;

  const stats = {
    totalRecords: sorted.length,
    activeDays,
    topLocations: countTop(sorted.map((record) => record.location || "").filter(Boolean)),
    topActivities: countTop(sorted.flatMap((record) => record.activities)),
    topFood: countTop(sorted.flatMap((record) => record.food)),
    topEmotions: countTop(sorted.map((record) => record.emotion || "").filter(Boolean))
  };

  const keywords = countTop(sorted.flatMap((record) => record.tags), 7).map((item) => item.name);
  const defaultOpening =
    sorted.length > 0
      ? `${periodName}，你留下了 ${sorted.length} 个生活切片。它们有的热闹，有的安静，但共同把这一段日子折成了可以回看的形状。`
      : `${periodName} 还没有记录。上传几张照片后，这里会长出你的生活报告。`;
  const opening = await writeReportNarrative(sorted, defaultOpening);

  const moments = sorted
    .map((record) => ({
      id: record.id,
      date: cnDate(record.capturedAt),
      title: record.emotion ? `最${record.emotion}的一天` : "被收好的这一天",
      text: record.storyValue || record.aiSummary || record.userNote || "这张照片把一个瞬间留了下来。",
      imagePath: record.imagePath,
      tags: record.tags
    }))
    .slice(-6)
    .reverse();

  return {
    title: `${periodName}生活回声`,
    subtitle: "由你的日常照片、只言片语和时间线生成",
    opening,
    keywords: keywords.length > 0 ? keywords : ["生活切片", "值得记住"],
    stats,
    moments,
    timeline: sorted.map((record) => ({
      id: record.id,
      date: cnDate(record.capturedAt),
      summary: record.aiSummary || record.userNote || "一条日常记录",
      location: record.location,
      emotion: record.emotion,
      imagePath: record.imagePath
    })),
    closing:
      sorted.length > 0
        ? "这一年不是由某一个盛大瞬间定义的，而是由这些被你保存下来的小证据共同组成。"
        : "先把第一张照片交给它吧，报告会从那里开始。"
  };
}

export function periodRange(year: number, month?: number) {
  const start = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const end = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
  return { start, end };
}
