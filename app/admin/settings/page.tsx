"use client";

import { Megaphone, DollarSign, Send, Home, Save } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";

export default function AdminSettings() {
  return (
    <>
      <PageHeader kicker="ADMIN SETTINGS" title="Customize the platform." desc="Pricing, homepage, announcements, CTAs, and integrations." />

      {/* Pricing management */}
      <section className="panel p-6">
        <p className="text-[11px] tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <DollarSign className="h-3 w-3" /> PRICING MANAGEMENT
        </p>
        <div className="grid md:grid-cols-2 gap-5 mt-5">
          <Field label="Monthly price (USD)" value="49" />
          <Field label="Yearly price (USD/mo)" value="39" />
          <Field label="Free plan label" value="Observer" />
          <Field label="Premium plan label" value="Hano Insiders Inner Circle" />
        </div>
        <SaveButton />
      </section>

      {/* Homepage text */}
      <section className="panel p-6">
        <p className="text-[11px] tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <Home className="h-3 w-3" /> HOMEPAGE TEXT
        </p>
        <div className="grid md:grid-cols-2 gap-5 mt-5">
          <Field label="Kicker" value="EXCLUSIVE INVESTOR INTELLIGENCE" />
          <Field label="Headline" value="See before the move." />
          <Field label="Subhead" value="A private intelligence platform for serious crypto investors." span />
          <Field label="Primary CTA" value="Join Hano Insiders" />
          <Field label="Secondary CTA" value="View Pricing" />
        </div>
        <SaveButton />
      </section>

      {/* Announcement banner */}
      <section className="panel p-6">
        <p className="text-[11px] tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <Megaphone className="h-3 w-3" /> ANNOUNCEMENT BANNER
        </p>
        <div className="mt-5 flex items-center gap-3">
          <input type="checkbox" defaultChecked className="h-4 w-4" />
          <span className="text-sm">Show banner site-wide</span>
        </div>
        <div className="grid md:grid-cols-2 gap-5 mt-4">
          <Field label="Banner text" value="Limited seats open Â· 50 spots this month." span />
          <Field label="CTA URL" value="/pricing" />
          <Field label="CTA label" value="Claim a seat" />
        </div>
        <SaveButton />
      </section>


    </>
  );
}

function Field({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "md:col-span-2" : ""}>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input defaultValue={value} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm" />
    </div>
  );
}

function SaveButton() {
  return (
    <div className="mt-5 flex justify-end">
      <button className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-5 py-2.5 text-sm">
        <Save className="h-3.5 w-3.5" /> Save changes
      </button>
    </div>
  );
}
