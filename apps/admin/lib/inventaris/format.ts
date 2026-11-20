// Format tanggal Inventaris: selalu WIB.
const dateTime = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
})

export const formatDateTime = (d: Date) => dateTime.format(d)
