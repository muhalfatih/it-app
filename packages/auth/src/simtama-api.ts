// Server-only: Simtama API lewat service client (client_credentials), untuk Setting → Akun:
// mencari pegawai di direktori Simtama dan memberi akses aplikasi ini kepadanya.
// Pola sama dengan simtama-buku-tamu/server/simtama.ts.
//
// Risiko yang diterima: `console:access:write` bisa memberi akses ke aplikasi Simtama MANA PUN
// dan `console:accounts:read` membaca semua akun. Modul ini hanya mengirim
// SIMTAMA_APPLICATION_ID miliknya, tetapi itu tidak membatasi secret yang bocor:
// service client produksi wajib dibatasi ke IP server. Token hanya disimpan di memori.

export type DirectoryStaff = {
  /** account_id Simtama (dipakai untuk akses). */
  id: number
  /** = `sub` SSO; kunci tautan akun lokal. */
  uid: string
  username: string
  name: string
  unit: string | null
}

const SCOPES =
  "console:accounts:read console:access:read console:access:write console:access-levels:read"
/** Level akses yang diberikan; id-nya beda per environment, jadi dicari dari slug. */
const ACCESS_LEVEL = "user"
const TIMEOUT = 15_000

const base = () => (process.env.SIMTAMA_API_URL ?? "").replace(/\/$/, "")
const appId = () => Number(process.env.SIMTAMA_APPLICATION_ID)

/** Aktif hanya bila semua nilai diisi. */
export const directoryEnabled = () =>
  Boolean(
    base() &&
    process.env.SIMTAMA_SERVICE_CLIENT_ID &&
    process.env.SIMTAMA_SERVICE_CLIENT_SECRET &&
    Number.isInteger(appId()) &&
    appId() > 0
  )

let cachedToken: { token: string; until: number } | null = null
let levelId: number | null = null

async function serviceToken(): Promise<string> {
  if (cachedToken && cachedToken.until > Date.now()) return cachedToken.token
  const id = process.env.SIMTAMA_SERVICE_CLIENT_ID ?? ""
  const secret = process.env.SIMTAMA_SERVICE_CLIENT_SECRET ?? ""
  const res = await fetch(`${base()}/service/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: SCOPES,
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  })
  if (!res.ok) throw new Error(`service token ${res.status}`)
  const body = (await res.json()) as {
    access_token: string
    expires_in: number
  }
  // Diperbarui 30 detik lebih awal agar tidak kedaluwarsa di tengah request.
  cachedToken = {
    token: body.access_token,
    until: Date.now() + (Number(body.expires_in) - 30) * 1000,
  }
  return cachedToken.token
}

/** Request terautentikasi; 401 (token dicabut/dirotasi) mengambil token baru sekali. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON Simtama, dibaca defensif
async function api(path: string, json?: unknown): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${base()}${path}`, {
      method: json === undefined ? "GET" : "POST",
      headers: {
        authorization: `Bearer ${await serviceToken()}`,
        ...(json !== undefined && { "content-type": "application/json" }),
      },
      body: json === undefined ? undefined : JSON.stringify(json),
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (res.status === 401 && attempt === 0) {
      cachedToken = null
      continue
    }
    if (!res.ok) throw new Error(`Simtama ${path.split("?")[0]} ${res.status}`)
    return res.json()
  }
}

type RawAccount = {
  id: number
  uid: string
  username: string
  name: string
  status?: number
  roles?: { slug?: string; object_id?: string | null }[]
}

const staffId = (a: RawAccount) =>
  a.roles?.find((r) => r.slug === "staff")?.object_id ?? null

/**
 * Nama unit per id pegawai, dari lookup staf yang dipakai Simtama Console (scope accounts:read).
 * `q` cocok dengan nama atau id pegawai: satu panggilan dengan kata kunci biasanya mencakup semua,
 * sisanya (akun yang ketemu lewat username) dicari per id. Tidak pernah melempar: unit hanya label.
 */
async function unitsOf(term: string, ids: string[]) {
  const units = new Map<string, string | null>()
  const lookup = async (q: string) => {
    const body = await api(
      `/internal/role-requests/lookups/staff?${new URLSearchParams({ q })}`
    )
    for (const s of body?.data?.items ?? [])
      units.set(String(s.id), String(s.nama_unit ?? "").trim() || null)
  }
  try {
    await lookup(term)
    await Promise.all(ids.filter((id) => !units.has(id)).map(lookup))
  } catch (e) {
    console.warn(
      JSON.stringify({ evt: "simtama.unit_failed", message: String(e) })
    )
  }
  return units
}

/** Akun pegawai aktif (role staff) yang cocok dengan nama/username, maksimal 20. */
export async function searchStaff(q: string): Promise<DirectoryStaff[]> {
  const term = q.trim()
  if (term.length < 2) return []
  const params = new URLSearchParams({
    q: term,
    role: "staff",
    status: "1",
    per_page: "20",
  })
  const found: RawAccount[] = (await api(`/account?${params}`))?.data ?? []
  const units = await unitsOf(
    term,
    found.map(staffId).filter((id): id is string => !!id)
  )
  return found.map((a) => {
    const pegawai = staffId(a)
    return {
      id: Number(a.id),
      uid: String(a.uid),
      username: String(a.username ?? ""),
      name: String(a.name ?? ""),
      unit: (pegawai && units.get(pegawai)) ?? null,
    }
  })
}

/** Akun Simtama menurut account_id; null bila tidak ada, nonaktif, atau bukan pegawai. */
export async function getStaff(
  accountId: number
): Promise<Omit<DirectoryStaff, "unit"> | null> {
  let a: RawAccount | undefined
  try {
    a = (await api(`/account/${accountId}`))?.data
  } catch (e) {
    if (String(e).endsWith(" 404")) return null
    throw e
  }
  if (!a || a.status !== 1 || !staffId(a)) return null
  return {
    id: Number(a.id),
    uid: String(a.uid),
    username: String(a.username),
    name: String(a.name),
  }
}

/**
 * Pastikan akun punya akses aktif ke aplikasi ini (wajib karena "Wajib punya hak akses").
 * Akses yang sudah ada tidak diubah, agar level yang lebih tinggi tidak turun.
 */
export async function grantAccess(accountId: number): Promise<void> {
  const params = new URLSearchParams({
    account_id: String(accountId),
    application_id: String(appId()),
    status: "1",
    per_page: "1",
  })
  if (((await api(`/access?${params}`))?.data ?? []).length) return
  if (levelId === null) {
    const levels: { id: number; slug: string }[] =
      (await api("/access-level"))?.data?.levels ?? []
    const level = levels.find((l) => l.slug === ACCESS_LEVEL)
    if (!level) throw new Error(`access level '${ACCESS_LEVEL}' not found`)
    levelId = Number(level.id)
  }
  // POST /access adalah upsert per (akun, aplikasi).
  await api("/access", {
    account_id: accountId,
    application_id: appId(),
    access_level_id: levelId,
    status: 1,
  })
}
