// Service worker push (didaftarkan dari PushToggle lewat new URL(..., import.meta.url)).
self.addEventListener("push", (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon",
      data: { url: data.url || "/" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  // Hanya path dalam aplikasi ini.
  const url = new URL(event.notification.data?.url || "/", self.location.origin)
  if (url.origin !== self.location.origin) return
  event.waitUntil(openOrFocus(url.href))
})

// Pakai jendela yang sudah terbuka; openWindow saja akan menumpuk tab baru tiap notifikasi.
async function openOrFocus(href) {
  const [open] = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  })
  if (!open) return self.clients.openWindow(href)
  await open.focus()
  // navigate() ditolak untuk klien yang belum dikendalikan SW ini; lebih baik tab baru
  // daripada berhenti di halaman yang salah.
  try {
    await open.navigate(href)
  } catch {
    await self.clients.openWindow(href)
  }
}
