// Satu-satunya tempat yang bicara ke MinIO/S3. Konfigurasi dibaca malas agar `next build` tanpa env tetap jalan.
import { Client } from "minio"

const need = (env: NodeJS.ProcessEnv, k: string) => {
  const v = env[k]
  if (!v) throw new Error(`${k} belum diatur`)
  return v
}

export function storageConfig(env: NodeJS.ProcessEnv) {
  const endpoint = new URL(need(env, "S3_ENDPOINT"))
  const publicUrl = new URL(need(env, "S3_PUBLIC_URL"))
  return {
    endPoint: endpoint.hostname,
    port: Number(endpoint.port) || (endpoint.protocol === "https:" ? 443 : 80),
    useSSL: endpoint.protocol === "https:",
    publicUrl,
    accessKey: need(env, "S3_ACCESS_KEY"),
    secretKey: need(env, "S3_SECRET_KEY"),
    bucket: need(env, "S3_BUCKET"),
    region: env.S3_REGION || "us-east-1",
  }
}

let cached: { cfg: ReturnType<typeof storageConfig>; internal: Client; signer: Client } | undefined

function ctx() {
  if (cached) return cached
  const cfg = storageConfig(process.env)
  const base = { accessKey: cfg.accessKey, secretKey: cfg.secretKey, region: cfg.region }
  const { publicUrl: p } = cfg
  cached = {
    cfg,
    internal: new Client({ ...base, endPoint: cfg.endPoint, port: cfg.port, useSSL: cfg.useSSL }),
    // Klien kedua hanya menandatangani, supaya URL memuat host yang dijangkau browser.
    signer: new Client({
      ...base,
      endPoint: p.hostname,
      port: Number(p.port) || (p.protocol === "https:" ? 443 : 80),
      useSSL: p.protocol === "https:",
    }),
  }
  return cached
}

export async function presignUpload(key: string, mime: string, maxBytes: number) {
  const { cfg, signer } = ctx()
  const policy = signer.newPostPolicy()
  policy.setBucket(cfg.bucket)
  policy.setKey(key)
  policy.setContentType(mime)
  policy.setContentLengthRange(1, maxBytes)
  policy.setExpires(new Date(Date.now() + 15 * 60_000))
  const { postURL, formData } = await signer.presignedPostPolicy(policy)
  return { url: postURL, fields: formData as Record<string, string> }
}

export function presignRead(key: string, opts: { mime: string; downloadName?: string }) {
  const { cfg, signer } = ctx()
  const headers: Record<string, string> = { "response-content-type": opts.mime }
  if (opts.downloadName) {
    headers["response-content-disposition"] =
      `attachment; filename*=UTF-8''${encodeURIComponent(opts.downloadName)}`
  }
  return signer.presignedGetObject(cfg.bucket, key, 3600, headers)
}

export async function statObject(key: string) {
  const { cfg, internal } = ctx()
  try {
    const s = await internal.statObject(cfg.bucket, key)
    return {
      size: s.size,
      mime: String(s.metaData?.["content-type"] ?? ""),
      lastModified: s.lastModified,
    }
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === "NotFound" || code === "NoSuchKey") return null
    throw e
  }
}

export async function readRange(key: string, offset: number, length: number) {
  const { cfg, internal } = ctx()
  const stream = await internal.getPartialObject(cfg.bucket, key, offset, length)
  const chunks: Buffer[] = []
  for await (const c of stream) chunks.push(Buffer.from(c))
  return new Uint8Array(Buffer.concat(chunks))
}

export async function removeObjects(keys: string[]) {
  if (keys.length === 0) return
  const { cfg, internal } = ctx()
  await internal.removeObjects(cfg.bucket, keys)
}

export async function* listObjects(prefix: string) {
  const { cfg, internal } = ctx()
  for await (const o of internal.listObjectsV2(cfg.bucket, prefix, true)) {
    if (o.name && o.lastModified) yield { key: o.name, lastModified: o.lastModified }
  }
}
