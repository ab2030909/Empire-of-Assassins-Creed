// Uploads every picture in public/characters, public/places and public/home to Cloudinary
// as eoa/<same path without extension>. 3D models are not uploaded.
//
// Usage (PowerShell):
//   $env:CLOUDINARY_URL = "cloudinary://<api_key>:<api_secret>@<cloud_name>"
//   node scripts/upload-cloudinary.mjs
// Then put VITE_CLOUDINARY_CLOUD=<cloud_name> in .env and restart `npm run dev`.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, extname, sep } from 'node:path';

const url = process.env.CLOUDINARY_URL;
const m = url?.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
if (!m) { console.error('Set CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name> first.'); process.exit(1); }
const [, key, secret, cloud] = m;

const ROOT = 'public';
const DIRS = ['characters', 'places', 'home'];
const EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (EXT.has(extname(e.name).toLowerCase())) out.push(p);
  }
  return out;
}

async function upload(file) {
  const rel = relative(ROOT, file).split(sep).join('/');
  const publicId = 'eoa/' + rel.slice(0, -extname(rel).length);
  const params = { overwrite: 'true', public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)) };
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  const signature = createHash('sha1').update(toSign + secret).digest('hex');
  const form = new FormData();
  form.append('file', new Blob([await readFile(file)]), rel.split('/').pop());
  for (const [k, v] of Object.entries(params)) form.append(k, v);
  form.append('api_key', key); form.append('signature', signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form });
  const body = await res.json();
  if (!res.ok) throw new Error(`${rel}: ${body.error?.message ?? res.status}`);
  return { rel, kb: Math.round(body.bytes / 1024) };
}

const files = (await Promise.all(DIRS.map((d) => walk(join(ROOT, d)).catch(() => [])))).flat();
console.log(`Uploading ${files.length} images to cloud "${cloud}"…`);
let ok = 0, failed = 0;
for (let i = 0; i < files.length; i += 4) {
  const results = await Promise.allSettled(files.slice(i, i + 4).map(upload));
  for (const r of results) {
    if (r.status === 'fulfilled') { ok++; console.log(`  ✓ ${r.value.rel}`); }
    else { failed++; console.error(`  ✗ ${r.reason.message}`); }
  }
}
console.log(`Done: ${ok} uploaded, ${failed} failed.`);
if (failed) process.exit(1);
