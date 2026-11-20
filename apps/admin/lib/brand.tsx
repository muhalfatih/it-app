// Salinan hex token tema terang di packages/ui/src/styles/globals.css (--primary, --background,
// --primary-foreground): manifest dan ImageResponse tidak bisa membaca variabel CSS. Ubah bersama token.
export const BRAND = {
  primary: "#16505e",
  background: "#fcfefe",
  primaryForeground: "#f4f9fa",
}

/** Ikon sementara (inisial di atas warna brand) sampai ada logo; dipakai icon.tsx & apple-icon.tsx. */
export function BrandIcon({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND.primary,
        color: BRAND.primaryForeground,
        fontSize: size * 0.42,
        fontWeight: 700,
        letterSpacing: "-0.02em",
      }}
    >
      IT
    </div>
  )
}
