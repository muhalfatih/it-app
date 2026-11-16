"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { Toaster } from "@workspace/ui/components/sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

/** Hapus entri tahap Review ke atas butuh konfirmasi dua langkah (spesifikasi §4.5). */
function TwoStepDelete() {
  const [first, setFirst] = React.useState(false)
  const [second, setSecond] = React.useState(false)
  return (
    <>
      <AlertDialog open={first} onOpenChange={setFirst}>
        <AlertDialogTrigger render={<Button variant="destructive" />}>
          Hapus entri (tahap Review)
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus entri Planner?</AlertDialogTitle>
            <AlertDialogDescription>
              Kartu konten &quot;Video Profil Sekolah 2026&quot; sudah di tahap
              Review. Kartu beserta semua file-nya ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                // AlertDialogAction bukan tombol tutup: tutup langkah 1 sebelum membuka langkah 2.
                setFirst(false)
                setSecond(true)
              }}
            >
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={second} onOpenChange={setSecond}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi sekali lagi</AlertDialogTitle>
            <AlertDialogDescription>
              Penghapusan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setSecond(false)
                toast.success("Entri dihapus (contoh).")
              }}
            >
              Hapus permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function OverlaysDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toaster />
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Tolak pengajuan
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pengajuan SDM</DialogTitle>
            <DialogDescription>
              Alasan penolakan akan terlihat di &quot;Pengajuan Saya&quot; milik
              pengaju.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="alasan">Alasan</FieldLabel>
              <Input
                id="alasan"
                placeholder="mis. Semua SDM sudah bertugas di tanggal itu"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Batal
            </DialogClose>
            <Button variant="destructive">Tolak</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TwoStepDelete />

      <Sheet>
        <SheetTrigger render={<Button variant="outline" />}>
          Detail kartu
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Video Profil Sekolah 2026</SheetTitle>
            <SheetDescription>
              Tahap Draft · tayang Kamis, 20 November.
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>

      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>
          Info stok
        </PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Kamera Sony A7 III</PopoverTitle>
            <PopoverDescription>
              Jumlah 3 · dipinjam 1 · rusak/hilang 1 · tersedia 1
            </PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>

      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" />}>
          Arahkan ke sini
        </TooltipTrigger>
        <TooltipContent>Terkunci sejak tahap Review</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          Aksi
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem>Ubah entri</DropdownMenuItem>
            <DropdownMenuItem>Unduh PDF</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Hapus</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="secondary"
        onClick={() =>
          toast("Penugasan baru: Editing — Video Profil Sekolah, 19–20 Nov")
        }
      >
        Tampilkan toast
      </Button>
    </div>
  )
}
