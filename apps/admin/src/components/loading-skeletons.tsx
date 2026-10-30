import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCard, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function MetricCardGridSkeleton({ count = 4 }: { count?: number }) {
  const columnClass = count === 3 ? "md:grid-cols-3" : "md:grid-cols-4";

  return (
    <Surface className={`grid sm:grid-cols-2 ${columnClass}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="border-b p-5 last:border-b-0 sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
          key={index}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-10 w-20" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ))}
    </Surface>
  );
}

export function TableCardSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <TableCard>
        <div className="border-b px-4 py-3">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton className="h-4 w-20" key={index} />
            ))}
          </div>
        </div>
        <div className="flex flex-col">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div
              className="grid gap-4 border-b px-4 py-4 last:border-b-0"
              key={rowIndex}
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((__, columnIndex) => (
                <Skeleton
                  className={`h-4 ${columnIndex === 0 ? "w-24" : columnIndex === columns - 1 ? "w-12" : "w-full"}`}
                  key={columnIndex}
                />
              ))}
            </div>
          ))}
        </div>
      </TableCard>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-28" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
    </div>
  );
}

export function SidebarTeamSkeleton() {
  return (
    <Item className="pointer-events-none gap-2 px-3 py-2" size="xs" variant="outline">
      <ItemMedia variant="icon">
        <Skeleton className="size-4 rounded-full" />
      </ItemMedia>
      <ItemContent className="gap-0.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </ItemContent>
      <ItemActions>
        <Skeleton className="size-4 rounded-full" />
      </ItemActions>
    </Item>
  );
}

export function ChartBlockSkeleton({ height = 320 }: { height?: number }) {
  return (
    <Surface className="p-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="mt-6 w-full rounded-xl" style={{ height }} />
    </Surface>
  );
}

/** Placeholder rows for the appointments list, matching its seven columns and 48px rows. */
export function AppointmentRowsSkeleton({ label, rows = 5 }: { label: string; rows?: number }) {
  const cells = ["w-36", "w-28", "w-24", "w-20", "w-16 h-5 rounded-full", "w-14", "w-16 h-8 ms-auto"];

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow className="h-12 hover:bg-transparent" key={rowIndex}>
          {cells.map((width, cellIndex) => (
            <TableCell key={cellIndex}>
              <Skeleton className={`h-4 ${width}`} />
              {rowIndex === 0 && cellIndex === 0 ? <span className="sr-only">{label}</span> : null}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** The appointments calendar and the selected day's list while bookings load. */
export function AppointmentsCalendarSkeleton({ label, tabs, weeks = 5 }: { label: string; tabs: { range: string[]; view: string[] }; weeks?: number }) {
  return (
    <>
      <div className="flex flex-col gap-4">
        <span className="sr-only" role="status">{label}</span>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
          <Skeleton className="h-7 min-w-0 flex-1 basis-24 sm:max-w-56" />
          <div className="ms-auto flex items-center gap-2">
            <Skeleton className="h-8 w-16" />
            <TabsListSkeleton labels={tabs.range} />
            <TabsListSkeleton labels={tabs.view} />
          </div>
        </div>
        <div className="rounded-xl border p-2 md:hidden">
          <div className="grid grid-cols-7">
            {Array.from({ length: 7 + weeks * 7 }).map((_, index) => (
              <div className="flex h-12 items-center justify-center" key={index}>
                <Skeleton className={index < 7 ? "h-3 w-3" : "size-5 rounded-full"} />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden overflow-x-auto rounded-xl border md:block">
          <div className="grid min-w-[42rem] grid-cols-7">
            {Array.from({ length: 7 }).map((_, index) => (
              <div className="border-b px-3 py-2" key={index}>
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
            {Array.from({ length: weeks * 7 }).map((_, index) => (
              <div
                className={`flex min-h-24 flex-col gap-1.5 p-2 ${index % 7 !== 6 ? "border-r" : ""} ${index >= (weeks - 1) * 7 ? "" : "border-b"}`}
                key={index}
              >
                <Skeleton className="h-4 w-5" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <section className="flex flex-col gap-3">
        <div className="px-1">
          <Skeleton className="h-7 w-48" />
        </div>
        <Surface className="p-0">
          <ul className="divide-y">
            {Array.from({ length: 2 }).map((_, index) => (
              <li className="p-1" key={index}>
                <div className="flex items-center gap-4 px-3 py-3">
                  <div className="flex w-20 shrink-0 flex-col gap-1">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-8 w-20 shrink-0" />
                </div>
              </li>
            ))}
          </ul>
        </Surface>
      </section>
    </>
  );
}

/** Stands in for HeaderSearch: the same 36px height and responsive width. */
export function HeaderSearchSkeleton() {
  return <Skeleton className="h-9 w-full sm:w-64" />;
}

/** Placeholder rows for the calls table, with the column widths of the real rows. */
export function CallRowsSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow className="h-12 hover:bg-transparent" key={index}>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell className="max-w-0"><Skeleton className="h-4 w-3/4" /></TableCell>
          <TableCell><Skeleton className="ms-auto h-4 w-32" /></TableCell>
          <TableCell className="w-12"><Skeleton className="ms-auto size-8" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

/** Stands in for DataTablePagination: the rows-per-page select, the page count and four page buttons, with its responsive layout. */
export function DataTablePaginationSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-between overflow-clip px-2 @max-2xl/content:flex-col-reverse @max-2xl/content:gap-4"
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex w-[100px] items-center justify-center @2xl/content:hidden">
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="flex items-center gap-2 @max-2xl/content:flex-row-reverse">
          <Skeleton className="h-8 w-[70px]" />
          <Skeleton className="hidden h-5 w-24 sm:block" />
        </div>
      </div>
      <div className="flex items-center sm:space-x-6 lg:space-x-8">
        <div className="flex w-[100px] items-center justify-center @max-3xl/content:hidden">
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="size-8 @max-md/content:hidden" />
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
          <Skeleton className="size-8 @max-md/content:hidden" />
        </div>
      </div>
    </div>
  );
}

/** Placeholder rows for the contacts table, with the fixed column layout of the real rows. */
export function ContactRowsSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow className="h-12 hover:bg-transparent" key={index}>
          <TableCell>
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-1.5">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="size-5 rounded-full" />
            </div>
          </TableCell>
          <TableCell>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="mx-auto h-4 w-5" /></TableCell>
          <TableCell><Skeleton className="ms-auto h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="ms-auto size-8" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

/** Placeholder rows for the knowledge table, with the fixed column layout of the real rows. */
export function KnowledgeRowsSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow className="h-12 hover:bg-transparent" key={index}>
          <TableCell>
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 shrink-0" />
              <Skeleton className="h-4 w-32" />
            </div>
          </TableCell>
          <TableCell className="max-w-0"><Skeleton className="h-4 w-3/4" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Skeleton className="ms-auto h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="size-8" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

/** The whole knowledge page body, for the moment before the workspace is known and the real table can render. */
export function KnowledgePageSkeleton({ headings }: { headings: [title: string, preview: string, status: string, added: string] }) {
  return (
    <>
      <TableCard>
        <Table className="min-w-[60rem] w-full table-fixed">
          <colgroup><col className="w-[20%]" /><col className="w-[46%]" /><col className="w-[12%]" /><col className="w-[22%]" /><col className="w-12" /></colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>{headings[0]}</TableHead>
              <TableHead>{headings[1]}</TableHead>
              <TableHead>{headings[2]}</TableHead>
              <TableHead className="text-right">{headings[3]}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody aria-busy="true"><KnowledgeRowsSkeleton /></TableBody>
        </Table>
      </TableCard>
      <DataTablePaginationSkeleton />
      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4 px-1">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
        <Card className="border-border/70">
          <CardContent className="flex flex-col gap-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="flex flex-col gap-2" key={index}>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

/**
 * Stands in for a header button with a leading icon, such as "+ Add knowledge". The label stays in the layout
 * but is hidden, so the placeholder is as wide as the real button in every language.
 */
export function HeaderButtonSkeleton({ label, trailingIcon = false }: { label: string; trailingIcon?: boolean }) {
  return (
    <Skeleton
      aria-hidden="true"
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 pl-2.5 text-sm font-medium whitespace-nowrap ${trailingIcon ? "pr-2.5" : "pr-3"}`}
    >
      <span className="invisible size-4 shrink-0" />
      <span className="invisible">{label}</span>
      {trailingIcon ? <span className="invisible size-4 shrink-0" /> : null}
    </Skeleton>
  );
}

/**
 * Stands in for a TabsList. It copies the list's height and padding and the triggers' padding and type,
 * with the real labels hidden in place, so it is as wide as the real tabs in every language.
 */
export function TabsListSkeleton({ labels }: { labels: string[] }) {
  return (
    <Skeleton aria-hidden="true" className="inline-flex h-9 w-fit shrink-0 items-center justify-center rounded-full p-[3px]">
      {labels.map((label) => (
        <span
          className="invisible inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center border border-transparent px-3 py-1 type-control font-medium whitespace-nowrap"
          key={label}
        >
          {label}
        </span>
      ))}
    </Skeleton>
  );
}

/** Placeholder rows for the services table, with the fixed column layout of the real rows. */
export function ServiceRowsSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow className="h-12 hover:bg-transparent" key={index}>
          <TableCell>
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 shrink-0" />
              <Skeleton className="h-4 w-28" />
            </div>
          </TableCell>
          <TableCell className="max-w-0"><Skeleton className="h-4 w-3/4" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Skeleton className="ms-auto h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="size-8" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

/** The services table and its pagination, for the moment before the workspace is known and the real table can render. */
export function ServicesPageSkeleton({ headings }: { headings: [title: string, preview: string, price: string, status: string, added: string] }) {
  return (
    <>
      <TableCard>
        <Table className="min-w-[60rem] w-full table-fixed">
          <colgroup><col className="w-[20%]" /><col className="w-[34%]" /><col className="w-[14%]" /><col className="w-[12%]" /><col className="w-[16%]" /><col className="w-12" /></colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>{headings[0]}</TableHead>
              <TableHead>{headings[1]}</TableHead>
              <TableHead>{headings[2]}</TableHead>
              <TableHead>{headings[3]}</TableHead>
              <TableHead className="text-right">{headings[4]}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody aria-busy="true"><ServiceRowsSkeleton /></TableBody>
        </Table>
      </TableCard>
      <DataTablePaginationSkeleton />
    </>
  );
}

/** Placeholder rows for the employees table, with the fixed column layout of the real rows. */
export function EmployeeRowsSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <TableRow className="h-12 hover:bg-transparent" key={index}>
          <TableCell>
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 shrink-0" />
              <Skeleton className="h-4 w-24" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="ms-auto h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="size-8" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}
