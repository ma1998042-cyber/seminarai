import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOC_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
];

export async function POST(request: NextRequest) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
  }

  const uploadType = formData.get("type") as string | null;
  const isDocument = uploadType === "document";
  const allowedTypes = isDocument ? [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES] : ALLOWED_IMAGE_TYPES;
  const maxSize = isDocument ? MAX_DOC_SIZE : MAX_FILE_SIZE;

  if (!allowedTypes.includes(file.type)) {
    const msg = isDocument
      ? "PDF, Word, Excel, PowerPoint, ZIP, または画像ファイルのみアップロード可能です"
      : "JPEG, PNG, WebP, GIF のみアップロード可能です";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (file.size > maxSize) {
    const sizeLabel = isDocument ? "50MB" : "5MB";
    return NextResponse.json({ error: `ファイルサイズは${sizeLabel}以下にしてください` }, { status: 400 });
  }

  const ALLOWED_PREFIXES = ["events", "blog", "cases", "resources", "resource-files"];
  const prefix = formData.get("prefix") as string | null;
  const safePrefix = prefix && ALLOWED_PREFIXES.includes(prefix) ? prefix : "events";

  const ext = file.name.split(".").pop() || "jpg";
  const key = `${safePrefix}/${crypto.randomUUID()}.${ext}`;

  const { env } = getCloudflareContext();
  await env.R2.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  return NextResponse.json({ key });
}
