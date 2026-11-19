import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { requirePermission } from "@workspace/auth/session"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"

import { listManagerTasks } from "@/lib/manager-task/queries"

import { TaskList } from "./_task-list"

export const metadata: Metadata = { title: "Tugas dari Manajer" }

export default async function TugasPage() {
  await requirePermission("tugas_manajer.kelola")
  const tasks = await listManagerTasks()

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Tugas dari Manajer
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Tugas di luar Planner. Muncul di laporan harian staf yang dipilih
            selama rentang tanggalnya, dan tetap tampil sebagai Tertunda sampai
            dituntaskan.
          </p>
        </div>
        <Link
          href="/tugas/baru"
          className={buttonVariants({ className: "sm:ml-auto" })}
        >
          <PlusIcon data-icon="inline-start" />
          Beri tugas
        </Link>
      </div>
      {tasks.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Belum ada tugas</EmptyTitle>
            <EmptyDescription>
              Beri tugas ke satu atau beberapa staf, lengkap dengan rentang
              tanggalnya.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/tugas/baru" className={buttonVariants()}>
              Beri tugas
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <TaskList rows={tasks} />
      )}
    </div>
  )
}
