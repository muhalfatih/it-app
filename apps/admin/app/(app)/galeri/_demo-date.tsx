import { Pattern as DatePicker } from "@workspace/ui/components/examples/c-calendar-24"
import { Pattern as DateRangePicker } from "@workspace/ui/components/examples/c-calendar-25"
import { Pattern as DatePresets } from "@workspace/ui/components/examples/c-calendar-16"

function Block({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <h3 id={id} className="text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  )
}

/** Pemilih tanggal baku aplikasi: satu tanggal, rentang, dan rentang dengan preset. */
export function DateDemo() {
  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-2">
      <Block id="demo-tanggal-label" title="Kalender biasa">
        <DatePicker
          id="demo-tanggal"
          aria-labelledby="demo-tanggal-label demo-tanggal"
        />
      </Block>
      <Block id="demo-rentang-label" title="Kalender dengan rentang">
        <DateRangePicker
          id="demo-rentang"
          aria-labelledby="demo-rentang-label demo-rentang"
        />
      </Block>
      <div className="md:col-span-2">
        <Block title="Kalender dengan preset">
          <div className="max-w-full overflow-x-auto">
            <DatePresets />
          </div>
        </Block>
      </div>
    </div>
  )
}
