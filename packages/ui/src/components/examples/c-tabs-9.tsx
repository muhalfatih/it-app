"use client"

import { useState } from "react"

import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { CalendarDaysIcon, ListIcon, UsersIcon } from "lucide-react"

/** Ganti tampilan Planner: daftar, kalender pekanan, partisi per orang. */
export function Pattern() {
  const [view, setView] = useState("daftar")

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Tabs value={view} onValueChange={setView}>
        <TabsList className="w-full">
          <TabsTrigger value="daftar" className="gap-1.5">
            <ListIcon className="size-4" />
            Daftar
          </TabsTrigger>
          <TabsTrigger value="kalender" className="gap-1.5">
            <CalendarDaysIcon className="size-4" />
            Kalender
          </TabsTrigger>
          <TabsTrigger value="partisi" className="gap-1.5">
            <UsersIcon className="size-4" />
            Partisi
          </TabsTrigger>
        </TabsList>
        <TabsContent value="daftar">
          <Card>
            <CardContent>
              <p className="text-sm font-medium">24 entri bulan ini</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Diurutkan menurut tanggal tayang.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="kalender">
          <Card>
            <CardContent>
              <p className="text-sm font-medium">Pekan 16–22 November</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Senin sampai Minggu, satu entri per hari tayang.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="partisi">
          <Card>
            <CardContent>
              <p className="text-sm font-medium">6 staf</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Beban tugas tiap orang dalam satu pekan.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
