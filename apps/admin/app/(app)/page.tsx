import Link from "next/link"
import { ShieldAlertIcon } from "lucide-react"

import { requireUser } from "@workspace/auth/session"
import { Button } from "@workspace/ui/components/button"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/reui/alert"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ akses?: string }>
}) {
  const user = await requireUser()
  const { akses } = await searchParams

  return (
    <div className="flex flex-col gap-6 p-6">
      {akses === "ditolak" ? (
        <Alert variant="warning" className="max-w-xl">
          <ShieldAlertIcon />
          <AlertTitle>Halaman itu tidak tersedia untuk akun Anda</AlertTitle>
          <AlertDescription>
            Menu yang bisa Anda buka ada di sidebar. Bila perlu akses lain,
            minta Manajer menambah peran Anda.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Halo, {user.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Modul Tahap 1 sedang disiapkan satu per satu.
        </p>
      </div>
      <div>
        <Button
          variant="outline"
          render={<Link href="/galeri" />}
          nativeButton={false}
        >
          Lihat galeri komponen
        </Button>
      </div>
    </div>
  )
}
