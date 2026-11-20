// Label bahasa Indonesia untuk komponen @reui yang bawaannya berbahasa Inggris.
import type { EventCalendarI18nOverrides } from "@workspace/ui/components/reui/event-calendar/event-calendar-i18n"
import type { DataGridI18nOverrides } from "@workspace/ui/components/reui/data-grid/data-grid-i18n"
import type { TimePickerI18nOverrides } from "@workspace/ui/components/reui/time-picker"

export const EVENT_CALENDAR_I18N_ID: EventCalendarI18nOverrides = {
  labels: {
    today: "Hari ini",
    previous: "Sebelumnya",
    next: "Berikutnya",
    addEvent: "Tambah",
    allDay: "Sehari",
    more: (count) => `+${count} lagi`,
    noEvents: "Tidak ada jadwal",
    loading: "Memuat jadwal",
    event: "jadwal",
    events: (count) => `${count} jadwal`,
    selectView: "Pilih tampilan",
    week: (weekNumber) => `P${weekNumber}`,
    goToDate: "Ke tanggal",
    dropNotAllowed: "Tidak bisa di sini",
    continues: "berlanjut",
    timeFrom: (time) => `Dari ${time}`,
    timeUntil: (time) => `Sampai ${time}`,
    toggleDayEvents: (count) => `${count} jadwal`,
  },
  viewNames: {
    month: "Bulan",
    week: "Pekan",
    day: "Hari",
    days: (count) => (count === 6 ? "Senin–Sabtu" : `${count} hari`),
    agenda: "Agenda",
  },
  formats: {
    dayTitle: "EEEE, d MMMM yyyy",
    agendaDayHeader: "EEEE, d MMMM",
    moreDayHeader: "EEEE, d MMMM",
    timeGutter: "HH.mm",
    timeGutterMinute: "HH.mm",
    eventTime: "HH.mm",
  },
}

export const DATA_GRID_I18N_ID: DataGridI18nOverrides = {
  labels: {
    sortAscending: "Urut naik",
    sortDescending: "Urut turun",
    pinColumnStart: "Sematkan ke kiri",
    pinColumnEnd: "Sematkan ke kanan",
    moveColumnStart: "Geser ke kiri",
    moveColumnEnd: "Geser ke kanan",
    columnsMenu: "Kolom",
    unpinColumn: (title) => `Lepas sematan kolom ${title}`,
    toggleColumns: "Tampilkan kolom",
    rowCreate: "Tambah baris",
    pinRow: "Sematkan baris",
    unpinRow: "Lepas sematan baris",
    selectRow: "Pilih baris",
    selectAll: "Pilih semua",
    expandRow: "Buka baris",
    collapseRow: "Tutup baris",
    dragToReorder: "Seret untuk mengurutkan",
    dragToReorderRow: "Seret untuk mengurutkan baris",
    reorderingUnavailable: "Pengurutan tidak tersedia",
    loading: "Memuat…",
    empty: "Belum ada data",
    allRowsLoaded: "Semua data sudah dimuat",
    rowsPerPage: "Baris per halaman",
    paginationInfo: ({ from, to, count }) => `${from}–${to} dari ${count}`,
    previousPage: "Halaman sebelumnya",
    nextPage: "Halaman berikutnya",
    goToPage: (page) => `Ke halaman ${page}`,
    filterSelectedCount: (count) => `${count} dipilih`,
    filterNoResults: "Tidak ada hasil.",
    filterClear: "Hapus filter",
  },
}

export const TIME_PICKER_I18N_ID: TimePickerI18nOverrides = {
  labels: {
    placeholder: "Pilih jam",
    hour: "Jam",
    minute: "Menit",
    second: "Detik",
    now: "Sekarang",
    clear: "Hapus",
    confirm: "OK",
    panelLabel: "Pilih jam",
    openPicker: "Buka pemilih jam",
  },
}
