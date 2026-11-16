"use client"

import { useRouter } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

/** Pilihan orang disimpan di URL (?orang=) agar halaman bisa dimuat ulang/dibagikan. */
export function PersonSelect({
  people,
  value,
}: {
  people: { value: string; label: string }[]
  value: string | null
}) {
  const router = useRouter()
  return (
    <Select
      items={people}
      value={value}
      onValueChange={(v) => v && router.push(`?orang=${encodeURIComponent(v)}`)}
    >
      <SelectTrigger id="orang" className="w-full sm:w-72">
        <SelectValue placeholder="Pilih staf unit" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {people.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
