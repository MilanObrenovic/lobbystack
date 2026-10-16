"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Appointment } from "@/hooks/use-appointments";
import { addDays, addMonths, dayKey, firstDayOfWeek, keyToDate, monthGrid, weekDays } from "@/lib/calendar-days";
import { formatDateTime, intlLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

type CalendarView = "week" | "month";

const WEEK_PREVIEW = 4;

/**
 * Upcoming appointments on a week or month grid. Selecting a day hands it to
 * the page, which lists that day's appointments under the grid.
 */
export function AppointmentsCalendar({ appointments, onSelectDay, selectedDay, timeZone, today, contactName }: {
  appointments: Appointment[];
  onSelectDay: (day: string) => void;
  selectedDay: string;
  timeZone: string;
  today: string;
  contactName: (appointment: Appointment) => string;
}) {
  const { i18n, t } = useTranslation("common");
  const locale = intlLocale(i18n.language);
  const firstDay = firstDayOfWeek(locale);
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState(today);

  const byDay = useMemo(() => {
    const days = new Map<string, Appointment[]>();
    for (const appointment of appointments) {
      const key = dayKey(appointment.startsAt, timeZone);
      days.set(key, [...(days.get(key) ?? []), appointment]);
    }
    return days;
  }, [appointments, timeZone]);

  const days = view === "week" ? weekDays(anchor, firstDay) : monthGrid(anchor, firstDay);
  const month = anchor.slice(0, 7);
  const label = (key: string, options: Intl.DateTimeFormatOptions) => formatDateTime(keyToDate(key).toISOString(), i18n.language, { ...options, timeZone: "UTC" });
  const title = view === "month"
    ? label(anchor, { month: "long", year: "numeric" })
    : `${label(days[0]!, { month: "short", day: "numeric" })} – ${label(days[6]!, { month: "short", day: "numeric", year: "numeric" })}`;
  const step = (direction: 1 | -1) => setAnchor((current) => view === "week" ? addDays(current, 7 * direction) : addMonths(current, direction));
  const select = (key: string) => { onSelectDay(key); if (view === "month" && key.slice(0, 7) !== month) setAnchor(key); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button aria-label={t("appointments.calendarView.previous")} onClick={() => step(-1)} size="icon-sm" variant="outline"><ChevronLeft /></Button>
          <Button aria-label={t("appointments.calendarView.next")} onClick={() => step(1)} size="icon-sm" variant="outline"><ChevronRight /></Button>
          <Button onClick={() => { setAnchor(today); onSelectDay(today); }} size="sm" variant="outline">{t("appointments.calendarView.today")}</Button>
          <h2 aria-live="polite" className="type-section-title ml-1 capitalize">{title}</h2>
        </div>
        <Tabs onValueChange={(value) => { setView(value as CalendarView); setAnchor(selectedDay); }} value={view}>
          <TabsList>
            <TabsTrigger value="week">{t("appointments.calendarView.week")}</TabsTrigger>
            <TabsTrigger value="month">{t("appointments.calendarView.month")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <div className="grid min-w-[42rem] grid-cols-7" role="grid">
          {days.slice(0, 7).map((key) => (
            <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground capitalize" key={`head-${key}`} role="columnheader">
              {label(key, { weekday: "short" })}
            </div>
          ))}
          {days.map((key, index) => {
            const dayAppointments = byDay.get(key) ?? [];
            const outside = view === "month" && key.slice(0, 7) !== month;
            const past = key < today;
            return (
              <button
                aria-label={`${label(key, { weekday: "long", month: "long", day: "numeric" })}, ${t("appointments.calendarView.count", { count: dayAppointments.length })}`}
                aria-pressed={key === selectedDay}
                className={cn(
                  "flex min-w-0 flex-col gap-1.5 border-b p-2 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset",
                  index % 7 !== 6 && "border-r",
                  index >= days.length - 7 && "border-b-0",
                  view === "week" ? "min-h-48" : "min-h-24",
                  key === selectedDay && "bg-muted",
                  (outside || past) && "text-muted-foreground",
                )}
                key={key}
                onClick={() => select(key)}
                role="gridcell"
                type="button"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("inline-flex size-7 items-center justify-center rounded-full text-sm tabular-nums", key === today && "bg-primary font-medium text-primary-foreground")}>
                    {label(key, { day: "numeric" })}
                  </span>
                  {view === "month" && dayAppointments.length ? (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-foreground tabular-nums">{dayAppointments.length}</span>
                  ) : null}
                </span>
                {view === "week" ? (
                  <span className="flex min-w-0 flex-col gap-1">
                    {dayAppointments.slice(0, WEEK_PREVIEW).map((appointment) => (
                      <span className="min-w-0 truncate rounded-md bg-muted px-1.5 py-1 text-xs" key={appointment.id}>
                        <span className="font-medium tabular-nums">{formatDateTime(appointment.startsAt, i18n.language, { hour: "numeric", minute: "2-digit", timeZone })}</span>{" "}
                        <span className="ph-mask text-muted-foreground">{contactName(appointment)}</span>
                      </span>
                    ))}
                    {dayAppointments.length > WEEK_PREVIEW ? <span className="px-1.5 text-xs text-muted-foreground">{t("appointments.calendarView.more", { count: dayAppointments.length - WEEK_PREVIEW })}</span> : null}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
