import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { put } from "@vercel/blob";

const SOURCE_ROOT = path.resolve(
  process.cwd(),
  process.argv[2] || "private-album-source"
);
const ALBUM_PREFIXES = ["BSIC", "PRX0", "VIPX"];

if (
  !process.env.VERCEL_OIDC_TOKEN &&
  !process.env.BLOB_READ_WRITE_TOKEN
) {
  throw new Error(
    "Missing VERCEL_OIDC_TOKEN or BLOB_READ_WRITE_TOKEN. Run vercel env pull first."
  );
}

let uploaded = 0;

for (const prefix of ALBUM_PREFIXES) {
  const sourceDirectory = path.join(SOURCE_ROOT, prefix);
  const filenames = (await readdir(sourceDirectory))
    .filter((filename) =>
      new RegExp(`^${prefix}-[0-9]{2}\\.jpg$`).test(filename)
    )
    .sort();

  for (const filename of filenames) {
    const localPath = path.join(sourceDirectory, filename);
    const pathname = `userfx-album/${prefix}/${filename}`;
    const body = await readFile(localPath);

    await put(pathname, body, {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      cacheControlMaxAge: 3600,
      contentType: "image/jpeg",
    });

    uploaded += 1;
    console.log(`Uploaded ${pathname}`);
  }
}

console.log(`Private album ready: ${uploaded} files uploaded.`);
