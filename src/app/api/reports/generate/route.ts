import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildReport, periodRange } from "@/lib/report";
import { serializeRecord } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const year = Number(body.year) || new Date().getFullYear();
  const month = body.month ? Number(body.month) : undefined;
  const periodType = month ? "month" : "year";
  const { start, end } = periodRange(year, month);

  const records = await prisma.record.findMany({
    where: {
      capturedAt: {
        gte: start,
        lt: end
      }
    },
    orderBy: { capturedAt: "asc" }
  });

  const payload = await buildReport(records.map(serializeRecord), year, month);
  const saved = await prisma.report.create({
    data: {
      periodType,
      periodStart: start,
      periodEnd: end,
      title: payload.title,
      narrative: JSON.stringify(payload),
      stats: JSON.stringify(payload.stats),
      highlights: JSON.stringify(payload.moments)
    }
  });

  return NextResponse.json({ id: saved.id, ...payload });
}
