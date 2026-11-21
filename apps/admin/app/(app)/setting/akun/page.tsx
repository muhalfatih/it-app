import type { Metadata } from "next"

import { listAccounts } from "@workspace/auth/accounts"
import { requirePermission } from "@workspace/auth/session"
import { directoryEnabled } from "@workspace/auth/simtama-api"
import { db } from "@workspace/db/client"
import { asc, eq } from "@workspace/db/orm"
import { unit } from "@workspace/db/schema"

import { AccountsClient } from "./_accounts-client"

export const metadata: Metadata = { title: "Akun & peran · Setting" }

export default async function AkunPage() {
  const me = await requirePermission("setting.kelola")
  const [accounts, units] = await Promise.all([
    listAccounts(),
    db
      .select({ id: unit.id, name: unit.name })
      .from(unit)
      .where(eq(unit.active, true))
      .orderBy(asc(unit.name)),
  ])

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Akun &amp; peran
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Buat akun untuk staf unit dan pegawai unit lain. Akun tanpa peran
          hanya bisa membuka menu Layanan.
        </p>
      </div>
      <AccountsClient
        accounts={accounts.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
        }))}
        units={units}
        currentUserId={me.id}
        directory={directoryEnabled()}
      />
    </div>
  )
}
