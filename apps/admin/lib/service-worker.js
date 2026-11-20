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
  event.waitUntil(self.clients.openWindow(url.href))
})
