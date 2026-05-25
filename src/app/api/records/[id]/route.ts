import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeUploadPath } from "@/lib/storage";
import { serializeRecord } from "@/lib/types";

function asArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(String).map((item) => item.trim()).filter(Boolean);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();

  const record = await prisma.record.update({
    where: { id },
    data: {
      userNote: body.userNote?.trim() || null,
      aiSummary: body.aiSummary?.trim() || null,
      location: body.location?.trim() || null,
      emotion: body.emotion?.trim() || null,
      storyValue: body.storyValue?.trim() || null,
      people: JSON.stringify(asArray(body.people)),
      activities: JSON.stringify(asArray(body.activities)),
      food: JSON.stringify(asArray(body.food)),
      objects: JSON.stringify(asArray(body.objects)),
      transport: JSON.stringify(asArray(body.transport)),
      tags: JSON.stringify(asArray(body.tags))
    }
  });

  return NextResponse.json(serializeRecord(record));
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const record = await prisma.record.delete({ where: { id } });
  const filename = path.basename(decodeURIComponent(record.imagePath.split("/").pop() || ""));

  if (filename) {
    await unlink(safeUploadPath(filename)).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
