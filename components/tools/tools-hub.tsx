"use client"

import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowRight,
  BarChart3,
  Activity,
  ShieldCheck,
  Target,
  Coins,
  Wrench,
  type LucideIcon,
} from "lucide-react"

type Tool = { href: string; icon: LucideIcon; key: string }

const tools: Tool[] = [
  { href: "/tools/performance-analyzer", icon: BarChart3, key: "performance" },
  { href: "/tools/recovery-engine", icon: Activity, key: "recovery" },
  { href: "/tools/risk-system-builder", icon: ShieldCheck, key: "risk" },
  { href: "/tools/trading-plan-builder", icon: Target, key: "plan" },
  { href: "/calculator", icon: Coins, key: "calculator" },
]

export function ToolsHub() {
  const t = useTranslations("tools.hub")

  return (
    <div>
      {/* Hero */}
      <section className="relative px-4 pb-6 pt-10 text-center md:pt-16">
        <div className="mx-auto max-w-3xl">
          <Badge
            variant="outline"
            className="mb-6 rounded-full border-primary/30 bg-primary/10 px-5 py-2.5 text-sm font-semibold tracking-[0.2em] text-primary"
          >
            <Wrench className="mr-2 h-4 w-4" />
            {t("eyebrow")}
          </Badge>
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground text-balance md:text-6xl">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg text-pretty">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* Tools grid */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => {
              const Icon = tool.icon
              return (
                <Link key={tool.href} href={tool.href} className="group">
                  <Card className="relative flex h-full flex-col border-border bg-card transition-colors hover:border-primary/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <Icon className="h-6 w-6" />
                        </div>
                        <Badge variant="outline" className="border-border text-xs text-muted-foreground">
                          {t(`${tool.key}Tag`)}
                        </Badge>
                      </div>
                      <CardTitle className="mt-4 text-xl text-foreground">{t(`${tool.key}Name`)}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col">
                      <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{t(`${tool.key}Desc`)}</p>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                        {t("open")}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}

            {/* Coming soon */}
            <Card className="flex h-full flex-col items-center justify-center border-dashed border-border bg-card/40 py-10 text-center">
              <p className="text-sm font-medium text-foreground">{t("comingSoonTitle")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("comingSoonSubtitle")}</p>
            </Card>
          </div>

          <p className="mt-10 text-center text-sm text-muted-foreground">{t("disclaimer")}</p>
        </div>
      </section>
    </div>
  )
}
