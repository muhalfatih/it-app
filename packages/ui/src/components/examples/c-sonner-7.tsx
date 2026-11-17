import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

export function Pattern() {
  const handleUpload = () => {
    toast.promise(
      new Promise<{ n: number }>((resolve) =>
        setTimeout(() => resolve({ n: 4 }), 2000)
      ),
      {
        loading: "Mengunggah 4 file…",
        success: (data) => `${data.n} file terunggah`,
        error: "Gagal mengunggah. Coba lagi.",
      }
    )
  }

  return (
    <div className="flex items-center justify-center">
      <Button onClick={handleUpload} variant="outline" className="w-fit">
        Proses
      </Button>
    </div>
  )
}