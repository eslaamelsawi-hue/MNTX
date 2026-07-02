"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { ArrowLeft, Info, type LucideIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/* ---------- formatting helpers ---------- */
export function fmt(n: number, d = 2) {
  if (!Number.isFinite(n)) return "—"
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })
}
export function fmtInt(n: number) {
  if (!Number.isFinite(n)) return "—"
  return Math.round(n).toLocaleString("en-US")
}
export function money(n: number) {
  if (!Number.isFinite(n)) return "—"
  const sign = n < 0 ? "-" : ""
  return `${sign}$${fmt(Math.abs(n))}`
}
export function pct(n: number, d = 1) {
  if (!Number.isFinite(n)) return "—"
  return `${fmt(n, d)}%`
}

/* ---------- centered tool hero ---------- */
export function ToolHero({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
}: {
  eyebrow: string
  title: string
  subtitle: string
  icon: LucideIcon
}) {
  const t = useTranslations("tools.common")
  return (
    <div className="mb-10">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("allTools")}
      </Link>
      <div className="mt-8 text-center">
        <p className="inline-flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.2em] text-primary">
          <Icon className="h-4 w-4" />
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">{subtitle}</p>
      </div>
    </div>
  )
}

/* ---------- about-the-tool section ---------- */
export function AboutSection({ text }: { text: string }) {
  const t = useTranslations("tools.common")
  return (
    <div className="mx-auto mt-14 max-w-3xl border-t border-border pt-8 text-center">
      <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-foreground">
        <Info className="h-4 w-4 text-primary" />
        {t("about")}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}

/* ---------- section card wrapper ---------- */
export function ResultCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <Card className="border-border bg-card">
      {title && (
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? "" : "pt-6"}>{children}</CardContent>
    </Card>
  )
}

/* ---------- chip option type ---------- */
export type ChipOption = { value: number | string; label: string }

/**
 * A labeled row of selectable chips, with an optional "Manual" chip that
 * reveals a number input. Controlled via value / onChange.
 */
export function ChipGroup({
  label,
  options,
  value,
  onChange,
  allowManual = true,
  manualPlaceholder,
}: {
  label: string
  options: ChipOption[]
  value: number | string
  onChange: (v: number | string) => void
  allowManual?: boolean
  manualPlaceholder?: string
}) {
  const t = useTranslations("tools.common")
  const isPreset = options.some((o) => o.value === value)
  const [manual, setManual] = useState(!isPreset && value !== "" && value != null)

  const chipCls = (active: boolean) =>
    `rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-transparent text-foreground hover:border-primary/40 hover:bg-primary/5"
    }`

  return (
    <div className="space-y-2">
      <Label className="block">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            type="button"
            key={String(o.value)}
            className={chipCls(!manual && value === o.value)}
            onClick={() => {
              setManual(false)
              onChange(o.value)
            }}
          >
            {o.label}
          </button>
        ))}
        {allowManual && (
          <button type="button" className={chipCls(manual)} onClick={() => setManual(true)}>
            {t("manual")}
          </button>
        )}
      </div>
      {manual && allowManual && (
        <Input
          type="number"
          autoFocus
          placeholder={manualPlaceholder}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="mt-1 max-w-[220px]"
        />
      )}
    </div>
  )
}

/* ---------- plain number field ---------- */
export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  placeholder,
  helper,
}: {
  label: string
  value: number | ""
  onChange: (n: number) => void
  step?: number
  placeholder?: string
  helper?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
      />
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}

/* ---------- two-way toggle (segmented) ---------- */
export function SegToggle({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ChipOption[]
  value: number | string
  onChange: (v: number | string) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="block">{label}</Label>
      <div className="inline-flex rounded-lg border border-border p-1">
        {options.map((o) => (
          <button
            type="button"
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- switch field ---------- */
export function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (b: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
      <Label className="cursor-pointer">{label}</Label>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            checked ? "left-0.5" : "left-[22px]"
          }`}
        />
      </button>
    </div>
  )
}

/* ---------- result metric tile ---------- */
export function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: "good" | "bad" | "primary"
}) {
  const color =
    accent === "good"
      ? "text-green-400"
      : accent === "bad"
      ? "text-red-400"
      : accent === "primary"
      ? "text-primary"
      : "text-foreground"
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

/* ---------- status pill ---------- */
export function StatusPill({ text, tone }: { text: string; tone: "good" | "warn" | "bad" }) {
  const cls =
    tone === "good"
      ? "border-green-500/30 bg-green-500/10 text-green-400"
      : tone === "warn"
      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
      : "border-red-500/30 bg-red-500/10 text-red-400"
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${cls}`}>{text}</span>
  )
}
