"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Receipt, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/status-pill"
import { PayInstallmentModal } from "@/components/pay-installment-modal"

type Installment = { id: string; amount: number; due_date: string; status: string; paid_at: string | null }
type Invoice = {
  id: string; title: string; total_amount: number; currency: string
  status: string; notes: string | null; created_at: string
  invoice_installments: Installment[]
}

const installmentIcon: Record<string, React.ReactNode> = {
  paid: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  overdue: <AlertCircle className="h-3.5 w-3.5 text-red-400" />,
}

export function DashboardInvoices({ email }: { email: string }) {
  const t = useTranslations("invoices")
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [payingInstallment, setPayingInstallment] = useState<string | null>(null)

  const refresh = () => {
    fetch("/api/invoices")
      .then((r) => (r.ok ? r.json() : { invoices: [] }))
      .then((d) => setInvoices(d.invoices ?? []))
      .catch(() => setInvoices([]))
  }

  useEffect(() => {
    refresh()
    // email is used only to key the fetch effect if it changes after login
  }, [email])

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t("pending"),
      partially_paid: t("partiallyPaid"),
      paid: t("paid"),
      overdue: t("overdue"),
      cancelled: t("cancelled"),
    }
    return map[status] || status
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Receipt className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {invoices === null ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("loading")}</p>
      ) : invoices.length === 0 ? (
        <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground">{t("empty")}</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => (
            <Card key={inv.id} className="border-border bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{inv.title}</CardTitle>
                  <StatusPill status={inv.status} label={statusLabel(inv.status)} />
                </div>
                <p className="font-mono text-2xl font-bold tabular-nums text-foreground">{inv.currency} {inv.total_amount}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t("installments")}</p>
                <div className="space-y-1.5">
                  {inv.invoice_installments.map((i) => (
                    <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        {installmentIcon[i.status] || installmentIcon.pending}
                        <span className="font-mono text-muted-foreground">{t("due")}: {new Date(i.due_date).toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono font-medium tabular-nums">{inv.currency} {i.amount}</span>
                        {i.status !== "paid" && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPayingInstallment(i.id)}>
                            {t("payNow")}
                          </Button>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {payingInstallment && (
        <PayInstallmentModal
          installmentId={payingInstallment}
          onClose={() => setPayingInstallment(null)}
          onPaid={refresh}
        />
      )}
    </div>
  )
}
