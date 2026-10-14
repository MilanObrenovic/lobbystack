"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveBusiness } from "@/hooks/use-active-business";
import { requestJson } from "@/lib/request-json";
import { intlLocale, normalizeBookingMode, type AppointmentChangePolicy, type BookingMode, type RuntimeLocale } from "@lobbystack/shared";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { Combobox, ComboboxCollection, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxLabel, ComboboxList, ComboboxTrigger, ComboboxValue } from "@/components/ui/combobox";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Surface } from "@/components/ui/surface";
import { Switch } from "@/components/ui/switch";
import { useTelemetry } from "@/components/product-analytics";
import { BookingWithoutHoursAlert, BusinessHoursSection, needsHoursForBooking, useBusinessHours } from "@/components/business-hours-section";
import { availableTimeZones, groupTimeZones, isTimeZoneRegion, type TimeZoneOption } from "@/lib/time-zones";
import { cn } from "@/lib/utils";

type AgentBasicSettingsPageProps = {
  businessId: string;
  canManageTenant: boolean;
};

type TimeZoneItemGroup = { value: string; label: string; items: TimeZoneOption[] };

// Always rendered and only faded in, so a save never shifts the row.
function SavingSpinner({ label, saving }: { label: string; saving: boolean }) {
  return <Spinner aria-hidden={!saving} aria-label={label} className={cn("text-muted-foreground transition-opacity", saving ? "opacity-100" : "opacity-0")} />;
}

const RUNTIME_LOCALE_OPTIONS = [
  { value: "en", labelKey: "common:language.english" },
  { value: "fr", labelKey: "common:language.french" },
  { value: "es", labelKey: "common:language.spanish" },
  { value: "sr", labelKey: "common:language.serbian" },
] as const satisfies ReadonlyArray<{ value: RuntimeLocale; labelKey: string }>;

// Matches SelectTrigger, so the searchable timezone picker looks like the selects beside it.
const COMBOBOX_TRIGGER_CLASS = "flex h-9 w-full min-w-0 items-center justify-between gap-1.5 rounded-4xl border border-input bg-input/30 px-3 py-2 text-sm whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-input/50 sm:w-56";

export function resolveTransferNumberForSave({
  rawInputValue,
  validTransferNumber,
}: {
  rawInputValue: string;
  validTransferNumber: string;
}):
  | { ok: true; value: string | null }
  | { ok: false; errorKey: "agent:fields.transferNumber.errors.invalid" } {
  const trimmedVisibleTransferNumber = rawInputValue.trim();
  if (trimmedVisibleTransferNumber.length === 0) {
    return { ok: true, value: null };
  }

  const trimmedTransferNumber = validTransferNumber.trim();
  if (trimmedTransferNumber.length > 0) {
    return { ok: true, value: trimmedTransferNumber };
  }

  return {
    ok: false,
    errorKey: "agent:fields.transferNumber.errors.invalid",
  };
}

export function buildAppointmentChangePolicyForSave({
  allowCancel,
  allowReschedule,
  requireOtp,
}: {
  allowCancel: boolean;
  allowReschedule: boolean;
  requireOtp: boolean;
}): AppointmentChangePolicy {
  return {
    enabled: allowCancel || allowReschedule,
    allowCancel,
    allowReschedule,
    verificationMode: requireOtp ? "otp_required" : "phone_match_and_facts",
  };
}

export function AgentBasicSettingsPage({
  businessId,
  canManageTenant,
}: AgentBasicSettingsPageProps) {
  const { i18n, t } = useTranslation(["agent", "common", "settings"]);
  const telemetry = useTelemetry();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["agent-settings", businessId],
    queryFn: () => requestJson<{ business: { defaultLocale: RuntimeLocale; timezone: string } | null; profile: { greeting: string; summary: string; summarySource: "placeholder" | "generated" | "operator"; transferNumber: string | null; transferMode: string; appointmentChangePolicy: AppointmentChangePolicy | null; bookingMode: BookingMode } | null }>(`/api/agent?businessId=${encodeURIComponent(businessId)}`),
    enabled: Boolean(businessId),
  });
  const configuration = query.data;
  const hours = useBusinessHours(businessId);
  const isLoadingConfiguration = !businessId || query.isLoading;
  async function saveProfile({ defaultLocale: locale, ...patch }: { businessId: string; defaultLocale?: RuntimeLocale; timezone?: string; greeting?: string; summary?: string; regenerateSummary?: true; transferNumber?: string | null; transferMode?: string; appointmentChangePolicy?: AppointmentChangePolicy; bookingMode?: BookingMode }, refetchType: "active" | "none" = "active") {
    await requestJson(`/api/agent?businessId=${encodeURIComponent(businessId)}`, { method: "PATCH", body: JSON.stringify({ ...patch, ...(locale ? { locale } : {}) }) });
    await queryClient.invalidateQueries({ queryKey: ["agent-settings", businessId], refetchType });
  }
  const persistedProfile = configuration?.profile;
  // The sign-up placeholder isn't a summary, so it shows as empty.
  const savedSummary = persistedProfile && persistedProfile.summarySource !== "placeholder" ? persistedProfile.summary : "";
  const savedTimezone = configuration?.business?.timezone ?? "";
  // Built once the business's zone loads, so the server render and hydration agree.
  const timeZoneGroups = useMemo(() => savedTimezone ? groupTimeZones(availableTimeZones(savedTimezone), intlLocale(i18n.language)) : [], [savedTimezone, i18n.language]);
  const timeZoneItems = useMemo<TimeZoneItemGroup[]>(() => timeZoneGroups.map((group) => ({
    value: group.region ?? "",
    label: group.region === null ? "" : isTimeZoneRegion(group.region) ? t(`agent:fields.timezone.regions.${group.region.toLowerCase()}`) : group.region,
    items: group.zones,
  })), [t, timeZoneGroups]);

  const [greeting, setGreeting] = useState("");
  const [summary, setSummary] = useState("");
  const [summaryStatus, setSummaryStatus] = useState<string | null>(null);
  const [isSummarySaving, setIsSummarySaving] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [defaultLocale, setDefaultLocale] = useState<RuntimeLocale>("en");
  const [timezone, setTimezone] = useState("");
  const [isTimezoneSaving, setIsTimezoneSaving] = useState(false);
  const [transferNumber, setTransferNumber] = useState("");
  const [transferNumberInputValue, setTransferNumberInputValue] = useState("");
  const [allowAppointmentCancel, setAllowAppointmentCancel] = useState(true);
  const [allowAppointmentReschedule, setAllowAppointmentReschedule] = useState(true);
  const [requireAppointmentChangeOtp, setRequireAppointmentChangeOtp] = useState(false);
  const [bookingMode, setBookingMode] = useState<BookingMode>("instant");
  const [isBookingModeSaving, setIsBookingModeSaving] = useState(false);
  const [transferStatus, setTransferStatus] = useState<string | null>(null);
  const [isGreetingSaving, setIsGreetingSaving] = useState(false);
  const [isGreetingOpen, setIsGreetingOpen] = useState(false);
  const [isLocaleSaving, setIsLocaleSaving] = useState(false);
  const [isTransferSaving, setIsTransferSaving] = useState(false);
  const [isAppointmentChangeSaving, setIsAppointmentChangeSaving] = useState(false);
  useEffect(() => {
    setTimezone(configuration?.business?.timezone ?? "");
    const profile = configuration?.profile;
    if (!profile) {
      return;
    }
    setGreeting(profile.greeting);
    // The sign-up placeholder isn't a summary, so the field starts empty.
    setSummary(profile.summarySource === "placeholder" ? "" : profile.summary);
    setDefaultLocale(configuration.business?.defaultLocale ?? "en");
    setTransferNumber(profile.transferNumber ?? "");
    setTransferNumberInputValue(profile.transferNumber ?? "");
    setBookingMode(normalizeBookingMode(profile.bookingMode));
    const appointmentChangePolicy = profile.appointmentChangePolicy as AppointmentChangePolicy | null;
    setAllowAppointmentCancel(appointmentChangePolicy?.allowCancel ?? true);
    setAllowAppointmentReschedule(appointmentChangePolicy?.allowReschedule ?? true);
    setRequireAppointmentChangeOtp(
      appointmentChangePolicy?.verificationMode === "otp_required",
    );
  }, [configuration]);

  useEffect(() => {
    if (!transferStatus) return;
    const timeoutId = window.setTimeout(() => setTransferStatus(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [transferStatus]);

  async function saveGreeting(): Promise<void> {
    if (!canManageTenant || !persistedProfile) {
      return;
    }

    setIsGreetingSaving(true);
    try {
      // Only the greeting: the dialog hides the other fields, so their drafts stay unsaved.
      await saveProfile({ businessId, greeting });
      telemetry.track("web.agent.settings_saved", { businessId, setting: "greeting" });
      toast.success(t("agent:actions.saved"));
      setIsGreetingOpen(false);
    } catch {
      toast.error(t("agent:actions.saveFailed"));
    } finally {
      setIsGreetingSaving(false);
    }
  }

  async function saveSummary(regenerate: boolean): Promise<void> {
    if (!canManageTenant || !persistedProfile || (!regenerate && !summary.trim())) {
      return;
    }
    setIsSummarySaving(true);
    setSummaryStatus(null);
    try {
      await saveProfile(regenerate ? { businessId, regenerateSummary: true } : { businessId, summary: summary.trim() });
      telemetry.track("web.agent.settings_saved", { businessId, setting: regenerate ? "summary_regenerated" : "summary" });
      setSummaryStatus(regenerate ? t("agent:fields.summary.regenerating") : null);
      if (!regenerate) toast.success(t("agent:actions.saved"));
      setIsSummaryOpen(false);
    } catch {
      toast.error(t("agent:actions.saveFailed"));
    } finally {
      setIsSummarySaving(false);
    }
  }

  async function saveTransferNumber(): Promise<void> {
    if (!canManageTenant || !persistedProfile) {
      return;
    }

    const transferNumberResolution = resolveTransferNumberForSave({
      rawInputValue: transferNumberInputValue,
      validTransferNumber: transferNumber,
    });
    if (!transferNumberResolution.ok) {
      setTransferStatus(t(transferNumberResolution.errorKey));
      return;
    }

    setIsTransferSaving(true);
    setTransferStatus(null);
    try {
      await saveProfile({ businessId, transferNumber: transferNumberResolution.value });
      telemetry.track("web.agent.settings_saved", { businessId, setting: "transfer_number" });
      toast.success(t("agent:actions.saved"));
    } catch {
      toast.error(t("agent:actions.saveFailed"));
    } finally {
      setIsTransferSaving(false);
    }
  }

  async function saveAppointmentChangePolicy({
    allowCancel = allowAppointmentCancel,
    allowReschedule = allowAppointmentReschedule,
    requireOtp = requireAppointmentChangeOtp,
  }: {
    allowCancel?: boolean;
    allowReschedule?: boolean;
    requireOtp?: boolean;
  } = {}): Promise<void> {
    if (!canManageTenant || !persistedProfile) {
      return;
    }

    setIsAppointmentChangeSaving(true);
    try {
      await saveProfile({
        businessId,
        appointmentChangePolicy: buildAppointmentChangePolicyForSave({
          allowCancel,
          allowReschedule,
          requireOtp,
        }),
      });
      telemetry.track("web.agent.settings_saved", { businessId, setting: "appointment_change_policy" });
      toast.success(t("agent:actions.saved"));
    } catch {
      toast.error(t("agent:actions.saveFailed"));
    } finally {
      setIsAppointmentChangeSaving(false);
    }
  }

  async function saveTimezone(nextTimezone: string): Promise<void> {
    if (!canManageTenant) return;
    const previous = timezone;
    setTimezone(nextTimezone);
    setIsTimezoneSaving(true);
    try {
      // A refetch resets every unsaved draft on this page, so the saved settings only go stale.
      await saveProfile({ businessId, timezone: nextTimezone }, "none");
      telemetry.track("web.agent.settings_saved", { businessId, setting: "timezone" });
      toast.success(t("agent:actions.saved"));
    } catch {
      setTimezone(previous);
      toast.error(t("agent:actions.saveFailed"));
    } finally {
      setIsTimezoneSaving(false);
    }
  }

  async function saveBookingMode(nextMode: BookingMode): Promise<void> {
    if (!canManageTenant || !persistedProfile) return;
    setIsBookingModeSaving(true);
    try {
      await saveProfile({ businessId, bookingMode: nextMode });
      telemetry.track("web.agent.settings_saved", { businessId, setting: "booking_mode" });
      toast.success(t("agent:actions.saved"));
    } catch {
      toast.error(t("agent:actions.saveFailed"));
    } finally {
      setIsBookingModeSaving(false);
    }
  }

  return (
    <div className="w-full overflow-y-auto pb-12">
      <div className="flex w-full flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-sm leading-snug font-medium">
            {t("agent:fields.defaults.title")}
          </h2>
          <Surface className="flex flex-col">
            <Item
              className="rounded-none border-x-0 border-t-0 border-b border-border last:border-b-0"
              variant="default"
            >
              <ItemContent>
                <ItemTitle>{t("agent:fields.greeting.label")}</ItemTitle>
                <ItemDescription>{t("agent:fields.greeting.hint")}</ItemDescription>
              </ItemContent>
              <ItemActions className="w-full justify-end self-center sm:w-auto">
                <Button
                  aria-label={t("agent:actions.editField", { field: t("agent:fields.greeting.label") })}
                  disabled={isLoadingConfiguration || !persistedProfile || !canManageTenant}
                  onClick={() => {
                    setGreeting(persistedProfile?.greeting ?? "");
                    setIsGreetingOpen(true);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t("agent:actions.edit")}
                </Button>
              </ItemActions>
              <Dialog onOpenChange={(open) => { if (!open && !isGreetingSaving) setIsGreetingOpen(false); }} open={isGreetingOpen}>
                <DialogContent className="flex flex-col gap-4 sm:max-w-lg">
                  <DialogHeader><DialogTitle>{t("agent:fields.greeting.label")}</DialogTitle></DialogHeader>
                  <Textarea
                    autoFocus
                    disabled={!canManageTenant || isGreetingSaving}
                    id="agent-greeting"
                    onChange={(event) => setGreeting(event.target.value)}
                    placeholder={t("agent:fields.greeting.placeholder")}
                    rows={3}
                    value={greeting}
                  />
                  <DialogFooter>
                    <Button disabled={isGreetingSaving} onClick={() => setIsGreetingOpen(false)} type="button" variant="outline">{t("agent:actions.cancel")}</Button>
                    <Button disabled={isGreetingSaving || !canManageTenant || !greeting.trim()} onClick={() => void saveGreeting()} type="button">
                      {isGreetingSaving ? t("agent:actions.saving") : t("agent:actions.save")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Item>

            <Item
              className="rounded-none border-x-0 border-t-0 border-b border-border last:border-b-0"
              variant="default"
            >
              <ItemContent>
                <ItemTitle>{t("agent:fields.summary.label")}</ItemTitle>
                <ItemDescription>{t("agent:fields.summary.hint")}</ItemDescription>
                {summaryStatus ? <ItemDescription>{summaryStatus}</ItemDescription> : null}
              </ItemContent>
              <ItemActions className="w-full justify-end self-center sm:w-auto">
                <Button
                  aria-label={t("agent:actions.editField", { field: t("agent:fields.summary.label") })}
                  disabled={isLoadingConfiguration || !persistedProfile || !canManageTenant}
                  onClick={() => {
                    setSummary(savedSummary);
                    setSummaryStatus(null);
                    setIsSummaryOpen(true);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {t("agent:actions.edit")}
                </Button>
              </ItemActions>
              <Dialog onOpenChange={(open) => { if (!open && !isSummarySaving) setIsSummaryOpen(false); }} open={isSummaryOpen}>
                <DialogContent className="flex flex-col gap-4 sm:max-w-lg">
                  <DialogHeader><DialogTitle>{t("agent:fields.summary.label")}</DialogTitle></DialogHeader>
                  <Textarea
                    autoFocus
                    disabled={!canManageTenant || isSummarySaving}
                    id="agent-summary"
                    maxLength={2000}
                    onChange={(event) => setSummary(event.target.value)}
                    placeholder={t("agent:fields.summary.placeholder")}
                    rows={6}
                    value={summary}
                  />
                  <DialogFooter className="sm:justify-between">
                    {persistedProfile?.summarySource === "operator" ? (
                      <Button disabled={isSummarySaving || !canManageTenant} onClick={() => void saveSummary(true)} type="button" variant="ghost">
                        {t("agent:fields.summary.regenerate")}
                      </Button>
                    ) : <span />}
                    <div className="flex gap-2">
                      <Button disabled={isSummarySaving} onClick={() => setIsSummaryOpen(false)} type="button" variant="outline">{t("agent:actions.cancel")}</Button>
                      <Button disabled={isSummarySaving || !canManageTenant || !summary.trim()} onClick={() => void saveSummary(false)} type="button">
                        {isSummarySaving ? t("agent:actions.saving") : t("agent:actions.save")}
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Item>

            <Item
              className="rounded-none border-x-0 border-t-0 border-b border-border last:border-b-0"
              variant="default"
            >
              <ItemContent>
                <ItemTitle>{t("agent:fields.defaultLocale.label")}</ItemTitle>
                <ItemDescription>{t("agent:fields.defaultLocale.hint")}</ItemDescription>
              </ItemContent>
              <ItemActions className="w-full sm:w-auto">
                <SavingSpinner label={t("agent:actions.saving")} saving={isLocaleSaving} />
                {isLoadingConfiguration ? (
                  <Skeleton className="h-10 w-full rounded-md sm:w-36" />
                ) : (
                  <Select
                    disabled={!canManageTenant}
                    items={RUNTIME_LOCALE_OPTIONS.map(({ value, labelKey }) => ({ value, label: t(labelKey) }))}
                    onValueChange={(value) => {
                      const nextLocale = ((value as RuntimeLocale | null) || "en");
                      setDefaultLocale(nextLocale);
                      void (async () => {
                        if (!canManageTenant || !persistedProfile) {
                          return;
                        }

                        setIsLocaleSaving(true);
                        try {
                          await saveProfile({ businessId, defaultLocale: nextLocale });
                          telemetry.track("web.agent.settings_saved", { businessId, setting: "default_locale" });
                          toast.success(t("agent:actions.saved"));
                        } catch {
                          toast.error(t("agent:actions.saveFailed"));
                        } finally {
                          setIsLocaleSaving(false);
                        }
                      })();
                    }}
                    value={defaultLocale}
                  >
                    <SelectTrigger aria-label={t("agent:fields.defaultLocale.label")} className="w-full sm:w-36" id="agent-default-language"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {RUNTIME_LOCALE_OPTIONS.map(({ value, labelKey }) => <SelectItem key={value} value={value}>{t(labelKey)}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </ItemActions>
            </Item>

            <Item
              className="rounded-none border-x-0 border-t-0 border-b border-border last:border-b-0"
              variant="default"
            >
              <ItemContent>
                <ItemTitle>{t("agent:fields.timezone.label")}</ItemTitle>
                <ItemDescription>{t("agent:fields.timezone.hint")}</ItemDescription>
              </ItemContent>
              <ItemActions className="w-full min-w-0 sm:w-auto">
                <SavingSpinner label={t("agent:actions.saving")} saving={isTimezoneSaving} />
                {isLoadingConfiguration ? (
                  <Skeleton className="h-10 w-full rounded-md sm:w-56" />
                ) : (
                  <Combobox
                    disabled={isTimezoneSaving || !timezone || !canManageTenant}
                    isItemEqualToValue={(item: TimeZoneOption, value: TimeZoneOption) => item.id === value.id}
                    items={timeZoneItems}
                    itemToStringLabel={(zone: TimeZoneOption) => zone.label}
                    onValueChange={(zone: TimeZoneOption | null) => { if (zone && zone.id !== timezone) void saveTimezone(zone.id); }}
                    value={timeZoneGroups.flatMap((group) => group.zones).find((zone) => zone.id === timezone) ?? null}
                  >
                    <ComboboxTrigger aria-label={t("agent:fields.timezone.label")} className={COMBOBOX_TRIGGER_CLASS} id="agent-timezone">
                      <span className="min-w-0 flex-1 truncate text-left"><ComboboxValue /></span>
                    </ComboboxTrigger>
                    <ComboboxContent className="min-w-(--anchor-width)">
                      {/* Above the list, so the list doesn't paint over the input's focus ring. */}
                      <ComboboxInput className="relative z-10" placeholder={t("agent:fields.timezone.search")} showTrigger={false} />
                      <ComboboxEmpty>{t("agent:fields.timezone.noResults")}</ComboboxEmpty>
                      <ComboboxList>
                        {(group: TimeZoneItemGroup) => (
                          <ComboboxGroup items={group.items} key={group.value}>
                            {group.label ? <ComboboxLabel>{group.label}</ComboboxLabel> : null}
                            <ComboboxCollection>{(zone: TimeZoneOption) => <ComboboxItem key={zone.id} value={zone}>{zone.label}</ComboboxItem>}</ComboboxCollection>
                          </ComboboxGroup>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                )}
              </ItemActions>
            </Item>

            <Item
              className="rounded-none border-x-0 border-t-0 border-b border-border last:border-b-0"
              variant="default"
            >
              <ItemContent>
                <ItemTitle>{t("agent:fields.transferNumber.label")}</ItemTitle>
                <ItemDescription>{t("agent:fields.transferNumber.hint")}</ItemDescription>
                <div className="pt-2">
                  {isLoadingConfiguration ? (
                    <Skeleton className="h-10 w-full rounded-md sm:w-72" />
                  ) : (
                    <PhoneInput
                      className="w-full min-w-0 sm:w-40"
                      containerClassName="w-full sm:w-fit"
                      disabled={!canManageTenant}
                      id="agent-transfer-number"
                      locale={i18n.language}
                      maxLength={18}
                      onChange={(nextValue) => {
                        setTransferNumber(nextValue ?? "");
                        setTransferStatus(null);
                      }}
                      onRawValueChange={(nextRawValue) => {
                        setTransferNumberInputValue(nextRawValue);
                        setTransferStatus(null);
                      }}
                      {...(transferNumber ? { value: transferNumber } : {})}
                    />
                  )}
                </div>
                {transferStatus ? <ItemDescription className="text-destructive">{transferStatus}</ItemDescription> : null}
              </ItemContent>
              <ItemActions className="w-full justify-end self-center sm:w-auto">
                <Button
                  disabled={
                    isLoadingConfiguration ||
                    isTransferSaving ||
                    !persistedProfile ||
                    !canManageTenant
                  }
                  onClick={() => void saveTransferNumber()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {isTransferSaving ? t("agent:actions.saving") : t("agent:actions.save")}
                </Button>
              </ItemActions>
            </Item>
          </Surface>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-sm leading-snug font-medium">
            {t("agent:booking.title")}
          </h2>
          <Surface className="flex flex-col">
            <Item
              className="rounded-none border-x-0 border-t-0 border-b border-border last:border-b-0"
              variant="default"
            >
              <ItemContent>
                <ItemTitle>{t("agent:booking.mode.label")}</ItemTitle>
                <ItemDescription>{t(`agent:booking.mode.descriptions.${bookingMode}`)}</ItemDescription>
              </ItemContent>
              <ItemActions className="w-full sm:w-auto">
                <SavingSpinner label={t("agent:actions.saving")} saving={isBookingModeSaving} />
                {isLoadingConfiguration ? (
                  <Skeleton className="h-10 w-full rounded-md sm:w-48" />
                ) : (
                  <Select
                    disabled={isBookingModeSaving || !persistedProfile || !canManageTenant}
                    items={(["instant", "request", "off"] as const).map((mode) => ({ value: mode, label: t(`agent:booking.mode.options.${mode}`) }))}
                    onValueChange={(value) => {
                      const nextMode = normalizeBookingMode(value);
                      setBookingMode(nextMode);
                      void saveBookingMode(nextMode);
                    }}
                    value={bookingMode}
                  >
                    <SelectTrigger aria-label={t("agent:booking.mode.label")} className="w-full sm:w-48" id="agent-booking-mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="instant">{t("agent:booking.mode.options.instant")}</SelectItem>
                        <SelectItem value="request">{t("agent:booking.mode.options.request")}</SelectItem>
                        <SelectItem value="off">{t("agent:booking.mode.options.off")}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </ItemActions>
            </Item>
          </Surface>
          {!isLoadingConfiguration && hours.data && needsHoursForBooking({ ...hours.data, bookingMode }) ? <BookingWithoutHoursAlert /> : null}
        </section>

        <BusinessHoursSection businessId={businessId} canManage={canManageTenant} />

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-sm leading-snug font-medium">
            {t("agent:appointmentChanges.title")}
          </h2>
          <Surface className="flex flex-col">
            <Item
              className="rounded-none border-x-0 border-t-0 border-b border-border last:border-b-0"
              variant="default"
            >
              <ItemContent>
                <ItemTitle>{t("agent:appointmentChanges.allowCancel.label")}</ItemTitle>
                <ItemDescription>
                  {t("agent:appointmentChanges.allowCancel.hint")}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                {isLoadingConfiguration ? (
                  <Skeleton className="h-5 w-8 rounded-full" />
                ) : (
                  <Switch
                    aria-label={t("agent:appointmentChanges.allowCancel.label")}
                    checked={allowAppointmentCancel}
                    disabled={isAppointmentChangeSaving || !persistedProfile || !canManageTenant}
                    onCheckedChange={(checked) => {
                      setAllowAppointmentCancel(checked);
                      void saveAppointmentChangePolicy({ allowCancel: checked });
                    }}
                  />
                )}
              </ItemActions>
            </Item>

            <Item
              className="rounded-none border-x-0 border-t-0 border-b border-border last:border-b-0"
              variant="default"
            >
              <ItemContent>
                <ItemTitle>{t("agent:appointmentChanges.allowReschedule.label")}</ItemTitle>
                <ItemDescription>
                  {t("agent:appointmentChanges.allowReschedule.hint")}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                {isLoadingConfiguration ? (
                  <Skeleton className="h-5 w-8 rounded-full" />
                ) : (
                  <Switch
                    aria-label={t("agent:appointmentChanges.allowReschedule.label")}
                    checked={allowAppointmentReschedule}
                    disabled={isAppointmentChangeSaving || !persistedProfile || !canManageTenant}
                    onCheckedChange={(checked) => {
                      setAllowAppointmentReschedule(checked);
                      void saveAppointmentChangePolicy({ allowReschedule: checked });
                    }}
                  />
                )}
              </ItemActions>
            </Item>

            <Item
              className="rounded-none border-x-0 border-t-0 border-b border-border last:border-b-0"
              variant="default"
            >
              <ItemContent>
                <ItemTitle>{t("agent:appointmentChanges.requireOtp.label")}</ItemTitle>
                <ItemDescription>
                  {t("agent:appointmentChanges.requireOtp.hint")}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                {isLoadingConfiguration ? (
                  <Skeleton className="h-5 w-8 rounded-full" />
                ) : (
                  <Switch
                    aria-label={t("agent:appointmentChanges.requireOtp.label")}
                    checked={requireAppointmentChangeOtp}
                    disabled={isAppointmentChangeSaving || !persistedProfile || !canManageTenant}
                    onCheckedChange={(checked) => {
                      setRequireAppointmentChangeOtp(checked);
                      void saveAppointmentChangePolicy({ requireOtp: checked });
                    }}
                  />
                )}
              </ItemActions>
            </Item>
          </Surface>
        </section>
      </div>
    </div>
  );
}

export function LiveAgentBasicSettingsSurface() {
  const { business } = useActiveBusiness();
  return <AgentBasicSettingsPage businessId={business?.businessId ?? ""} canManageTenant={Boolean(business && ["business_owner", "business_admin"].includes(business.role))} />;
}
