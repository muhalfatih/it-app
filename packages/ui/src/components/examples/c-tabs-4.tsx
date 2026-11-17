import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

const SETTINGS = [
  { value: "unit", label: "Unit", hint: "Unit kerja yang mengajukan layanan." },
  { value: "gedung", label: "Gedung", hint: "Lokasi untuk pengaduan dan aset." },
  {
    value: "jenis-tugas",
    label: "Jenis tugas",
    hint: "Daftar penugasan Planner.",
  },
  { value: "kanal", label: "Kanal", hint: "Kanal publikasi konten." },
]

/** Menu Setting: satu bagian per daftar, tab vertikal bergaris. */
export function Pattern() {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <Tabs defaultValue="unit" orientation="vertical" className="gap-5">
        <TabsList variant="line" className="w-40 shrink-0">
          {SETTINGS.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {SETTINGS.map((s) => (
          <TabsContent key={s.value} value={s.value}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{s.label}</CardTitle>
                <CardDescription className="text-sm">{s.hint}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`setting-${s.value}`} className="text-sm">
                    Tambah {s.label.toLowerCase()}
                  </Label>
                  <Input
                    id={`setting-${s.value}`}
                    name={`setting-${s.value}`}
                    autoComplete="off"
                    placeholder={`Nama ${s.label.toLowerCase()}…`}
                    className="h-9"
                  />
                </div>
              </CardContent>
              <CardFooter className="pt-3">
                <Button size="sm">Tambah</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
