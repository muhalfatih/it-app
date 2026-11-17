import { BellIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

export function Pattern() {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() =>
          toast("Draf tersimpan", {
            icon: <BellIcon className="size-4 text-muted-foreground" />,
          })
        }
      >
        Biasa
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() =>
          toast.success("Laporan terkirim", {
            classNames: { icon: "text-success" },
          })
        }
      >
        Berhasil
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() =>
          toast.error("Gagal menyimpan", {
            classNames: { icon: "text-destructive" },
          })
        }
      >
        Gagal
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() =>
          toast.warning("Lampiran hampir penuh", {
            classNames: { icon: "text-warning" },
          })
        }
      >
        Peringatan
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() =>
          toast.info("Pembaruan sistem tersedia", {
            classNames: { icon: "text-info" },
          })
        }
      >
        Info
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => {
          const id = toast.loading("Memproses…")
          setTimeout(() => toast.dismiss(id), 3000)
        }}
      >
        Memuat
      </Button>
    </div>
  )
}