import type { Metadata } from "next"
import Link from "next/link"

import { buttonVariants } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"

export const metadata: Metadata = { title: "Halaman tidak ditemukan" }

export default function NotFound() {
  return (
    <div className="flex items-center justify-center p-6 sm:p-10">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Halaman tidak ditemukan</EmptyTitle>
          <EmptyDescription>
            Alamat yang Anda buka tidak ada atau datanya sudah dihapus.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/" data-slot="button" className={buttonVariants()}>
            Kembali ke beranda
          </Link>
        </EmptyContent>
      </Empty>
    </div>
  )
}
