import { NextResponse, type NextRequest } from "next/server"

import { PATH_HEADER } from "@workspace/auth/rules"

// Hanya meneruskan path asal ke guard sesi (requireUser) agar /masuk bisa kembali ke halaman itu.
// Bukan gerbang keamanan: sesi tetap diperiksa di setiap halaman dan aksi server.
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  // Ditimpa selalu, sehingga nilai kiriman klien tidak terpakai.
  headers.set(
    PATH_HEADER,
    request.nextUrl.pathname + request.nextUrl.search
  )
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|masuk|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|ico|svg|jpg|webp|js|css|txt)$).*)",
  ],
}
