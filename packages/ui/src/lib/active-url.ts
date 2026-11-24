/**
 * URL menu yang paling cocok dengan lokasi sekarang: prefiks path terpanjang,
 * dan query di URL menu (mis. `?tampilan=kalender`) harus ikut cocok.
 * `/` hanya cocok persis supaya Beranda tidak menyala di semua halaman.
 */
export function activeUrl(
  urls: string[],
  pathname: string,
  search: string
): string | null {
  const have = new URLSearchParams(search)
  let best: string | null = null
  let score = -1
  for (const url of urls) {
    const [path = "", query] = url.split("?")
    const pathOk =
      path === "/"
        ? pathname === "/"
        : pathname === path || pathname.startsWith(path + "/")
    if (!pathOk) continue
    const want = [...new URLSearchParams(query)]
    if (want.some(([k, v]) => have.get(k) !== v)) continue
    // Path lebih panjang menang; pada path sama, URL dengan query lebih spesifik.
    const s = path.length * 10 + want.length
    if (s > score) {
      best = url
      score = s
    }
  }
  return best
}
