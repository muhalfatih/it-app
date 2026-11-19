/** Unggah langsung ke MinIO lewat presigned POST. Hanya untuk klien (XMLHttpRequest dipakai demi progres unggah). */
export function uploadToStorage(
  target: { url: string; fields: Record<string, string> },
  file: File,
  onProgress: (pct: number) => void,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Dibatalkan", "AbortError"))
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    for (const [k, v] of Object.entries(target.fields)) form.append(k, v)
    form.append("file", file) // MinIO/S3 mewajibkan `file` sebagai field terakhir

    const onAbort = () => xhr.abort()
    signal.addEventListener("abort", onAbort, { once: true })
    const done = () => signal.removeEventListener("abort", onAbort)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      done()
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Unggahan ditolak (status ${xhr.status})`))
    }
    xhr.onerror = () => {
      done()
      reject(new Error("Koneksi terputus saat mengunggah"))
    }
    xhr.onabort = () => {
      done()
      reject(new DOMException("Dibatalkan", "AbortError"))
    }
    xhr.open("POST", target.url)
    xhr.send(form)
  })
}
