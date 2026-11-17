import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

export function Pattern() {
  return (
    <div className="flex items-center justify-center">
      <Button
        onClick={() =>
          toast("Penugasan dihapus", {
            description: "Budi Santoso · Editing",
            icon: <Trash2Icon className="size-4 text-muted-foreground" />,
            action: {
              label: "Urungkan",
              onClick: () => toast.success("Penugasan dikembalikan"),
            },
          })
        }
        variant="outline"
        className="w-fit"
      >
        Dengan aksi
      </Button>
    </div>
  )
}