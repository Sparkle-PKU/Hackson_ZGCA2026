import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { safeUploadPath } from "@/lib/storage";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  const filePath = safeUploadPath(filename);
  const data = await readFile(filePath);
  const contentType = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  return new NextResponse(data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
