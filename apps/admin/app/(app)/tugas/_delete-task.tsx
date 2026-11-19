"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

import { removeTask } from "./actions"

export function DeleteTask({ id, title }: { id: number; title: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function confirm() {
    setError(null)
    startTransition(async () => {
      const result = await removeTask(id)
      if ("error" in result) return setError(result.error)
      toast.success("Tugas dihapus")
      setOpen(false)
      router.push("/tugas")
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <Trash2Icon data-icon="inline-start" />
        Hapus
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus tugas ini?</AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” hilang dari laporan harian semua staf yang belum
            terkunci. Laporan yang sudah terkunci tetap utuh.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={confirm}>
            {pending && <Spinner data-icon="inline-start" />}
            Hapus tugas
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
