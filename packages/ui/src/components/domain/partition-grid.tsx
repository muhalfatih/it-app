import { cn } from "cn"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

type PartitionItem = { id: string; label: string; href?: string }

type PartitionRow = {
  personId: string
  name: string
  /** Kunci = `days[i].key`. */
  items: Record<string, PartitionItem[]>
}

type PartitionGridProps = {
  days: { key: string; label: string }[]
  rows: PartitionRow[]
}

/** Partisi per orang: baris = orang, kolom = hari. Sel kosong abu-abu supaya terlihat siapa yang longgar. */
function PartitionGrid({ days, rows }: PartitionGridProps) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="sticky left-0 z-10 w-36 bg-background">
            Nama
          </TableHead>
          {days.map((day) => (
            <TableHead key={day.key} className="w-36">
              {day.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.personId}>
            <TableCell className="sticky left-0 z-10 bg-background font-medium whitespace-normal">
              <span className="line-clamp-2">{row.name}</span>
            </TableCell>
            {days.map((day) => {
              const items = row.items[day.key] ?? []
              return (
                <TableCell
                  key={day.key}
                  className={cn(
                    "align-top whitespace-normal",
                    items.length === 0 && "bg-muted"
                  )}
                >
                  {items.length === 0 ? (
                    <span className="sr-only">Kosong</span>
                  ) : (
                    <ul className="flex flex-col gap-1 text-xs">
                      {items.map((item) => (
                        <li key={item.id} className="line-clamp-2">
                          {item.href ? (
                            <a
                              href={item.href}
                              className="underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {item.label}
                            </a>
                          ) : (
                            item.label
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { PartitionGrid, type PartitionItem, type PartitionRow }
