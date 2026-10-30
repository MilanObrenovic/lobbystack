"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { AccountSecurityForms } from "./account-security-forms";
import { SmallButtonSkeleton } from "./loading-skeletons";
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from "./ui/item";
import { PageSurface } from "./page-surface";
import { Skeleton } from "./ui/skeleton";

type Account = { user: { id: string; name?: string | null; email?: string | null }; session: { id: string; expiresAt: string }; businesses: Array<{ businessId: string; name: string; role: string; active: boolean }> };

async function getAccount(): Promise<Account> {
  const response = await fetch("/api/account", { credentials: "include" });
  if (!response.ok) throw new Error("Account data is unavailable.");
  return await response.json() as Account;
}

export function LiveAccountSurface() {
  const { t } = useTranslation("settings");
  const account = useQuery({ queryKey: ["account"], queryFn: getAccount });
  return <PageSurface title={t("account.title")}><div className="w-full">{account.isLoading ? <AccountSkeleton t={t} /> : account.isError || !account.data ? <p className="text-sm text-destructive">Account data is unavailable.</p> : <AccountSecurityForms currentEmail={account.data.user.email} />}</div></PageSurface>;
}

/** Hidden text keeps a placeholder as wide and tall as the text it stands in for. */
function HiddenText({ children, className }: { children: string; className?: string }) {
  return <div aria-hidden="true" className={className}><Skeleton className="w-fit max-w-full"><span className="invisible">{children}</span></Skeleton></div>;
}

/** The change email and change password cards. Only the current email waits for data, but the cards turn real together. */
function AccountSkeleton({ t }: { t: (key: string) => string }) {
  const cards = [
    { key: "changeEmail", value: <Skeleton className="h-6 w-64 max-w-full" /> },
    { key: "changePassword", value: <Skeleton className="h-6 w-24" /> },
  ];
  return (
    <ItemGroup aria-busy="true" spacing="section">
      {cards.map(({ key, value }) => (
        <Item key={key} variant="outline">
          <ItemContent>
            <ItemTitle aria-hidden="true"><Skeleton className="w-fit"><span className="invisible">{t(`account.${key}.title`)}</span></Skeleton></ItemTitle>
            <HiddenText className="text-sm">{t(`account.${key}.description`)}</HiddenText>
            {value}
          </ItemContent>
          <ItemActions><SmallButtonSkeleton label={t("account.actions.change")} /></ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}
