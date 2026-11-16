import type { Metadata } from "next"
import Link from "next/link"

import { listAccounts } from "@workspace/auth/accounts"
import { requirePermission } from "@workspace/auth/session"
import { db } from "@workspace/db/client"
import { asc, eq } from "@workspace/db/orm"
import { routineTask } from "@workspace/db/schema"
import { SettingList } from "@workspace/ui/components/domain/setting-list"
import { Field, FieldLabel } from "@workspace/ui/components/field"

import { PersonSelect } from "./_person-select"
import { addRoutineTask, updateRoutineTask } from "./actions"

export const metadata: Metadata = { title: "Tugas rutin · Setting" }

export default async function TugasRutinPage({
  searchParams,
}: {
  searchParams: Promise<{ orang?: string }>
}) {
  await requirePermission("setting.kelola")
  const { orang } = await searchParams
  const staff = (await listAccounts()).filter(
    (a) => a.roles.length > 0 && !a.disabled
  )
  const selected = staff.find((s) => s.id === orang) ?? null
  const tasks = selected
    ? await db
        .select()
        .from(routineTask)
        .where(eq(routineTask.userId, selected.id))
        .orderBy(asc(routineTask.sortOrder), asc(routineTask.id))
    : []

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Tugas rutin</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Tugas yang muncul setiap hari kerja di laporan harian orang tersebut.
        </p>
      </div>
      <Field className="max-w-sm">
        <FieldLabel htmlFor="orang">Staf unit</FieldLabel>
        <PersonSelect
          people={staff.map((s) => ({ value: s.id, label: s.name }))}
          value={selected?.id ?? null}
        />
      </Field>
      {selected ? (
        <div className="max-w-2xl">
          <SettingList
            title={`Tugas rutin ${selected.name}`}
            itemLabel="tugas rutin"
            rows={tasks.map((t) => ({
              id: t.id,
              name: t.title,
              active: t.active,
            }))}
            onAdd={addRoutineTask.bind(null, selected.id)}
            onUpdate={updateRoutineTask}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {staff.length ? (
            "Pilih staf untuk melihat dan mengubah tugas rutinnya."
          ) : (
            <>
              Belum ada staf unit. Beri peran ke akun di{" "}
              <Link
                href="/setting/akun"
                className="underline underline-offset-4"
              >
                Setting → Akun &amp; peran
              </Link>
              .
            </>
          )}
        </p>
      )}
    </div>
  )
}
