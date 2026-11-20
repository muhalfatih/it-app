import { NextResponse } from "next/server"

import { requireUser } from "@workspace/auth/session"

import { getRequestFor, rundownKeyOf } from "@/lib/layanan/queries"
import { presignRead } from "@/lib/storage"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await requireUser()
  const raw = (await ctx.params).id
  const view = /^\d+$/.test(raw) ? await getRequestFor(user, Number(raw)) : null
  const key = view?.rundown ? await rundownKeyOf(view.id) : null
  if (!view?.rundown || !key) return new NextResponse(null, { status: 404 })

  const url = await presignRead(key, {
    mime: view.rundown.mime,
    downloadName: view.rundown.name || undefined,
  })
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } })
}
