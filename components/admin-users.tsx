"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Copy, ExternalLink, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusPill } from "@/components/status-pill"

type User = {
  id: string
  email: string | null
  createdAt: string | null
  lastSignInAt: string | null
  confirmed: boolean
  plans: string[]
  activePlans: string[]
  hoursLeft: number
  bookings: number
  unpaidInvoices: number
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—"

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/users")
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to load users."); return }
      setUsers(data.users ?? [])
    } catch {
      setError("Failed to load users.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => (u.email ?? "").toLowerCase().includes(q))
  }, [users, query])

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  /** Opens the client dashboard as this person — read-only impersonation,
   *  scoped to the admin session that authorised it. */
  const openAs = (email: string) => {
    window.open(`/en/dashboard?as=${encodeURIComponent(email)}`, "_blank", "noopener")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Loading...
      </div>
    )
  }

  const active = users.filter((u) => u.activePlans.length > 0).length
  const neverSignedIn = users.filter((u) => !u.lastSignInAt).length

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Everyone who has signed up for the client area. {users.length} accounts · {active} with an active plan ·{" "}
              {neverSignedIn} never signed in.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 pl-9"
            />
          </div>

          {shown.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {users.length === 0 ? "No accounts yet." : "No account matches that search."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Signed up</TableHead>
                    <TableHead>Last sign-in</TableHead>
                    <TableHead>Plans</TableHead>
                    <TableHead>Hours left</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Invoices</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="max-w-[200px] truncate text-sm" dir="ltr">{u.email}</span>
                          <button
                            onClick={() => copy(u.email ?? "", u.id)}
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          {copied === u.id && <span className="text-xs text-green-400">Copied</span>}
                        </div>
                        {!u.confirmed && <span className="text-xs text-amber-400">email unconfirmed</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmt(u.createdAt)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {u.lastSignInAt ? fmt(u.lastSignInAt) : <span className="text-amber-400">never</span>}
                      </TableCell>
                      <TableCell>
                        {u.plans.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.plans.map((p, i) => (
                              <span
                                key={`${u.id}-${p}-${i}`}
                                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                                  u.activePlans.includes(p)
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {p.replace(/-/g, " ")}
                              </span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">{u.hoursLeft || "—"}</TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">{u.bookings || "—"}</TableCell>
                      <TableCell>
                        {u.unpaidInvoices > 0 ? (
                          <StatusPill status="pending" label={`${u.unpaidInvoices} unpaid`} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={!u.email}
                          onClick={() => openAs(u.email!)}
                        >
                          <ExternalLink className="mr-1 h-3 w-3" /> Open as user
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
