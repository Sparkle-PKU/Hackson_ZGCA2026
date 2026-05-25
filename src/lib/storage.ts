import { mkdir } from "node:fs/promises";
import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

export async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export function safeUploadPath(filename: string) {
  const safeName = path.basename(filename);
  return path.join(UPLOAD_DIR, safeName);
}

export function uploadUrl(filename: string) {
  return `/api/uploads/${encodeURIComponent(path.basename(filename))}`;
}
