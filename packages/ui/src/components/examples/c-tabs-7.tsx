import { Badge } from "@workspace/ui/components/reui/badge"

import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

/** Filter status laporan harian dengan jumlah per status. */
export function Pattern() {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Tabs defaultValue="semua">
        <TabsList variant="line" className="mb-3.5 w-full">
          <TabsTrigger value="semua" className="gap-2">
            Semua
            <Badge variant="primary-light" size="sm">
              6
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="belum" className="gap-2">
            Belum dikirim
            <Badge variant="info-light" size="sm">
              2
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="terkirim" className="gap-2">
            Terkirim
          </TabsTrigger>
          <TabsTrigger value="terlambat" className="gap-2">
            Terlambat
            <Badge variant="destructive-light" size="sm">
              1
            </Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="semua">
          <Card>
            <CardContent>6 staf wajib lapor pekan ini.</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="belum">
          <Card>
            <CardContent>2 laporan menunggu dikirim hari ini.</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="terkirim">
          <Card>
            <CardContent>Laporan yang sudah dikirim tampil di sini.</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="terlambat">
          <Card>
            <CardContent>1 laporan melewati batas pukul 10.00 WIB.</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
