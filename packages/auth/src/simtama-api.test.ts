// Klien Simtama API terhadap server tiruan (fetch di-stub).
import { beforeEach, expect, it, vi } from "vitest"

const BASE = "https://api.test/v1"
vi.stubEnv("SIMTAMA_API_URL", `${BASE}/`)
vi.stubEnv("SIMTAMA_SERVICE_CLIENT_ID", "svc")
vi.stubEnv("SIMTAMA_SERVICE_CLIENT_SECRET", "rahasia")
vi.stubEnv("SIMTAMA_APPLICATION_ID", "26")

type Call = {
  method: string
  path: string
  auth: string | null
  body?: unknown
}
let calls: Call[]
let tokens: number
let access: unknown[]
let rejectNextBearer: boolean

vi.stubGlobal("fetch", async (input: string, init: RequestInit = {}) => {
  const url = new URL(input)
  const path = url.pathname.replace("/v1", "") + url.search
  const auth = new Headers(init.headers).get("authorization")
  const body =
    typeof init.body === "string" && init.body.startsWith("{")
      ? JSON.parse(init.body)
      : init.body
  calls.push({ method: init.method ?? "GET", path, auth, body })
  if (url.pathname === "/v1/service/token") {
    tokens++
    return Response.json({ access_token: `t${tokens}`, expires_in: 600 })
  }
  if (rejectNextBearer) {
    rejectNextBearer = false
    return new Response(null, { status: 401 })
  }
  if (url.pathname === "/v1/account")
    return Response.json({
      data: [
        {
          id: 7,
          uid: "u7",
          username: "budi",
          name: "Budi",
          roles: [{ slug: "staff", object_id: "P7" }],
        },
        {
          id: 8,
          uid: "u8",
          username: "siti",
          name: "Siti",
          roles: [{ slug: "staff", object_id: "P8" }],
        },
        {
          id: 9,
          uid: "u9",
          username: "andi",
          name: "Andi",
          roles: [{ slug: "generic" }],
        },
      ],
    })
  if (url.pathname === "/v1/internal/role-requests/lookups/staff") {
    const q = url.searchParams.get("q")
    const items =
      q === "P8"
        ? [{ id: "P8", id_unit: "U-IT", nama_unit: "Informasi dan Teknologi" }]
        : [{ id: "P7", id_unit: "U-UMUM", nama_unit: " Bagian Umum " }]
    return Response.json({ data: { items } })
  }
  if (url.pathname === "/v1/account/7")
    return Response.json({
      data: {
        id: 7,
        uid: "u7",
        username: "budi",
        name: "Budi",
        status: 1,
        roles: [{ slug: "staff", object_id: "P7" }],
      },
    })
  if (url.pathname === "/v1/account/9")
    return Response.json({
      data: {
        id: 9,
        uid: "u9",
        username: "andi",
        name: "Andi",
        status: 1,
        roles: [{ slug: "generic" }],
      },
    })
  if (url.pathname === "/v1/access" && init.method === "POST")
    return Response.json({ data: {} })
  if (url.pathname === "/v1/access") return Response.json({ data: access })
  if (url.pathname === "/v1/access-level")
    return Response.json({
      data: {
        levels: [
          { id: 1, slug: "admin" },
          { id: 8, slug: "user" },
        ],
      },
    })
  return new Response(null, { status: 404 })
})

const api = await import("./simtama-api")

beforeEach(() => {
  calls = []
  access = []
  rejectNextBearer = false
})
tokens = 0

it("aktif bila semua variabel diisi", () => {
  expect(api.directoryEnabled()).toBe(true)
})

it("mencari pegawai dengan unitnya; token diminta sekali lalu dipakai ulang", async () => {
  const rows = await api.searchStaff(" bu ")
  expect(rows).toEqual([
    { id: 7, uid: "u7", username: "budi", name: "Budi", unit: "Bagian Umum" },
    {
      id: 8,
      uid: "u8",
      username: "siti",
      name: "Siti",
      unit: "Informasi dan Teknologi",
    },
    { id: 9, uid: "u9", username: "andi", name: "Andi", unit: null },
  ])
  const token = calls.find((c) => c.path === "/service/token")!
  expect(token.auth).toBe(`Basic ${btoa("svc:rahasia")}`)
  expect(String(token.body)).toContain("grant_type=client_credentials")
  expect(calls.find((c) => c.path.startsWith("/account?"))!.path).toBe(
    "/account?q=bu&role=staff&status=1&per_page=20"
  )
  expect(calls.filter((c) => c.path === "/service/token")).toHaveLength(1)
  await api.searchStaff("bu")
  expect(tokens).toBe(1)
})

it("tidak memanggil Simtama untuk kata kunci di bawah 2 huruf", async () => {
  expect(await api.searchStaff(" b ")).toEqual([])
  expect(calls).toHaveLength(0)
})

it("mengambil token baru sekali saat 401", async () => {
  rejectNextBearer = true
  expect(await api.getStaff(7)).toMatchObject({ uid: "u7" })
  expect(calls.filter((c) => c.path === "/service/token")).toHaveLength(1)
  expect(calls.at(-1)!.auth).toBe(`Bearer t${tokens}`)
})

it("getStaff menolak akun bukan pegawai atau tidak ada", async () => {
  expect(await api.getStaff(9)).toBeNull()
  expect(await api.getStaff(404)).toBeNull()
})

it("memberi akses level user hanya bila belum ada akses aktif", async () => {
  await api.grantAccess(7)
  const post = calls.find((c) => c.method === "POST" && c.path === "/access")
  expect(post!.body).toEqual({
    account_id: 7,
    application_id: 26,
    access_level_id: 8,
    status: 1,
  })

  calls = []
  access = [{ access_level_id: 1 }]
  await api.grantAccess(7)
  expect(calls.some((c) => c.method === "POST")).toBe(false)
})
