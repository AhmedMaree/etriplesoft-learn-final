import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ref = process.env.SUPABASE_DEV_PROJECT_REF;
if (
  !url ||
  !ref ||
  new URL(url).hostname !== `${ref}.supabase.co` ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error(
    "Configure the matching hosted DEV project and server-only storage key.",
  );
}
const manifestPath = process.argv[2];
if (!manifestPath)
  throw new Error("Provide an approved JSON resource upload manifest.");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (!Array.isArray(manifest) || manifest.length > 50)
  throw new Error("Invalid upload manifest.");
const client = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: bucket, error: bucketError } =
  await client.storage.getBucket("course-resources");
if (bucketError || !bucket || bucket.public)
  throw new Error("A private course-resources bucket is required.");
const root = path.resolve("courses-images") + path.sep;
const receipts = [];
for (const item of manifest) {
  if (
    !item ||
    typeof item.file !== "string" ||
    typeof item.key !== "string" ||
    typeof item.resourceId !== "string" ||
    !/^courses\/[a-f0-9-]+\/lessons\/[a-f0-9-]+\/resources\/[a-f0-9-]+$/.test(
      item.key,
    ) ||
    !item.key.endsWith(`/${item.resourceId}`)
  )
    throw new Error("Invalid resource target.");
  const filePath = path.resolve(item.file);
  if (!filePath.startsWith(root) || !filePath.toLowerCase().endsWith(".pdf"))
    throw new Error("Use PDF files inside courses-images.");
  const bytes = await readFile(filePath);
  if (
    bytes.length > 50 * 1024 * 1024 ||
    !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))
  )
    throw new Error("Invalid PDF.");
  const { error } = await client.storage
    .from("course-resources")
    .upload(item.key, bytes, { contentType: "application/pdf", upsert: false });
  if (error && String(error.statusCode) !== "409")
    throw new Error("Private resource upload failed; details withheld.");
  const { data: stored, error: downloadError } = await client.storage
    .from("course-resources")
    .download(item.key);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (
    downloadError ||
    !stored ||
    createHash("sha256")
      .update(Buffer.from(await stored.arrayBuffer()))
      .digest("hex") !== digest
  ) {
    throw new Error("Stored PDF did not match the approved source.");
  }
  receipts.push({
    resourceId: item.resourceId,
    file: item.file,
    sha256: digest,
    bytes: bytes.length,
  });
  process.stdout.write(
    `Verified private PDF upload: ${path.basename(filePath)}\n`,
  );
}
await writeFile(
  "tmp/course-resource-upload-receipts.json",
  JSON.stringify(receipts, null, 2),
);
