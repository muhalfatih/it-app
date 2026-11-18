import { NextResponse } from "next/server"

import { authorize } from "@workspace/auth/authorize"
import { getCurrentUser } from "@workspace/auth/session"

import { parseMediaId } from "@/lib/kanban/media"
import { getMediaFile } from "@/lib/kanban/queries"
import { presignRead } from "@/lib/storage"

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  const decision = authorize(user, "kanban.lihat")
  if (decision === "unauthenticated") return new NextResponse(null, { status: 401 })
  if (decision !== "ok") return new NextResponse(null, { status: 403 })

  const id = parseMediaId((await ctx.params).id)
  const file = id === null ? null : await getMediaFile(id)
  if (!file) return new NextResponse(null, { status: 404 })

  const unduh = new URL(req.url).searchParams.get("unduh") === "1"
  const url = await presignRead(file.key, {
    mime: file.mime,
    downloadName: unduh ? file.originalName : undefined,
  })
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } })
}
