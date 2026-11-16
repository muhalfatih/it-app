import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col items-start justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Unit IT &amp; Media
      </h1>
      <p className="text-sm text-muted-foreground">
        Modul Tahap 1 sedang disiapkan. Tinjau design system terlebih dahulu.
      </p>
      <Button render={<Link href="/galeri" />} nativeButton={false}>
        Buka galeri komponen
      </Button>
    </div>
  )
}
