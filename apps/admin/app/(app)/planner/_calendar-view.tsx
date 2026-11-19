"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { id as localeId } from "date-fns/locale"

import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { EventCalendar } from "@workspace/ui/components/reui/event-calendar/event-calendar"
import { EventCalendarContent } from "@workspace/ui/components/reui/event-calendar/event-calendar-content"
import type { CalendarEvent } from "@workspace/ui/components/reui/event-calendar/event-calendar-types"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { EVENT_CALENDAR_I18N_ID } from "@workspace/ui/lib/i18n-id"

import type { PlannerEventData } from "@/lib/planner/views"

const noop = () => () => {}

type CalendarViewProps = {
  events: CalendarEvent<PlannerEventData>[]
  /** Senin awal pekan, yyyy-MM-dd. Navigasi periode lewat toolbar halaman. */
  start: string
}

export function CalendarView({ events, start }: CalendarViewProps) {
  const router = useRouter()
  const mobile = useIsMobile()
  // Garis "sekarang" bergantung jam klien (hydration mismatch); render setelah mount saja.
  const mounted = React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
  if (!mounted) return <Skeleton className="h-110 w-full" />

  return (
    <EventCalendar<PlannerEventData>
      events={events}
      defaultView={mobile ? "agenda" : "days"}
      view={mobile ? "agenda" : "days"}
      views={mobile ? ["agenda"] : ["days"]}
      dayCount={7}
      agendaDayCount={7}
      // Tengah malam WIB, sama dengan batas event; parseISO(start) memakai zona browser dan menggeser pekan di WITA/WIT.
      date={new Date(`${start}T00:00:00+07:00`)}
      weekStartsOn={1}
      // Event allDay dikirim sebagai tengah malam WIB; zona tetap supaya hari tidak bergeser di zona browser lain.
      timeZone="Asia/Jakarta"
      locale={localeId}
      i18n={EVENT_CALENDAR_I18N_ID}
      interactions={{ drag: false, resize: false }}
      onEventClick={(occ) => {
        const entryId = occ.event.data?.entryId
        if (entryId) router.push(`/planner/${entryId}`)
      }}
      // shortcut: kalender belum punya mode "hanya sehari penuh"; grid jam dipadatkan jadi satu jam, ganti bila mode itu ada.
      dayStartHour={8}
      dayEndHour={9}
      // shortcut: lajur jam (anak terakhir time grid) disembunyikan lewat classNames karena tidak ada prop untuk itu; periksa lagi bila struktur event-calendar berubah.
      classNames={{ timeGrid: "[&>div:last-child]:hidden" }}
      className={mobile ? "h-110" : undefined}
    >
      <EventCalendarContent />
    </EventCalendar>
  )
}
