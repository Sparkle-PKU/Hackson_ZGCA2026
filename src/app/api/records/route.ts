import { writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeImage } from "@/lib/ai";
import { ensureUploadDir, safeUploadPath, uploadUrl } from "@/lib/storage";
import { serializeRecord } from "@/lib/types";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);

export async function GET() {
  const records = await prisma.record.findMany({ orderBy: { capturedAt: "desc" } });
  return NextResponse.json(records.map(serializeRecord));
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("image");
  const userNote = String(formData.get("userNote") || "").trim();
  const capturedAtValue = String(formData.get("capturedAt") || "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请先选择一张图片。" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "仅支持 JPG、PNG、WEBP 图片。" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "图片不能超过 10MB。" }, { status: 400 });
  }

  await ensureUploadDir();
  const ext = path.extname(file.name) || (file.type === "image/png" ? ".png" : ".jpg");
  const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const filePath = safeUploadPath(filename);
  await writeFile(filePath, bytes);

  const created = await prisma.record.create({
    data: {
      imagePath: uploadUrl(filename),
      originalName: file.name,
      userNote: userNote || null,
      capturedAt: capturedAtValue ? new Date(capturedAtValue) : new Date(),
      aiStatus: "pending"
    }
  });

  const insight = await analyzeImage(filePath, userNote);
  const updated = await prisma.record.update({
    where: { id: created.id },
    data: {
      aiStatus: "done",
      aiSummary: insight.summary,
      location: insight.location || null,
      people: JSON.stringify(insight.people),
      activities: JSON.stringify(insight.activities),
      food: JSON.stringify(insight.food),
      objects: JSON.stringify(insight.objects),
      transport: JSON.stringify(insight.transport),
      emotion: insight.emotion || null,
      tags: JSON.stringify(insight.tags),
      storyValue: insight.story_value,
      rawAi: JSON.stringify(insight)
    }
  });

  return NextResponse.json(serializeRecord(updated), { status: 201 });
}
