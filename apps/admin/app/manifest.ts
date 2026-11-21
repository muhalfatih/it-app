import type { MetadataRoute } from "next"

import { BRAND } from "@/lib/brand"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Unit IT & Media",
    short_name: "IT & Media",
    description: "Aplikasi kerja Unit IT & Media SIT Insantama",
    start_url: "/",
    display: "standalone",
    theme_color: BRAND.primary,
    background_color: BRAND.background,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/icon", sizes: "512x512", type: "image/png" },
    ],
  }
}
