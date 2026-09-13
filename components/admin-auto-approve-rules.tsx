"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShieldCheck, Trash2, Plus, Loader2 } from "lucide-react"

type Rule = {
  id: string
  client_email: string
  day_of_week: number | null
  start_time: string | null
  end_time: string | null
}

const DAYS = [
  { value: "any", label: "Any day" },
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
]

function describeRule(r: Rule): string {
  const day = r.day_of_week === null ? "any day" : DAYS.find((d) => d.value === String(r.day_of_week))?.label ?? "any day"
  const time = r.start_time && r.end_time ? `${r.start_time.slice(0, 5)}–${r.end_time.slice(0, 5)} Cairo` : "any time"
  return `${day}, ${time}`
}

export function AdminAutoApproveRules() {
  const [open, setOpen] = useState(false)
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState("")
  const [day, setDay] = useState("any")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/booking-rules")
      const data = await res.json()
      setRules(data.rules ?? [])
    } catch (e) {
      console.error("Failed to load auto-approve rules:", e)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  const addRule = async () => {
    if (!email.trim()) return
    setSaving(true)
    try {
      await fetch("/api/admin/booking-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_email: email.trim(),
          day_of_week: day === "any" ? null : Number(day),
          start_time: startTime || null,
          end_time: endTime || null,
        }),
      })
      setEmail("")
      setDay("any")
      setStartTime("")
      setEndTime("")
      await load()
    } catch (e) {
      console.error("Failed to add rule:", e)
    }
    setSaving(false)
  }

  const deleteRule = async (id: string) => {
    if (!confirm("Remove this auto-approve rule?")) return
    await fetch(`/api/admin/booking-rules?id=${id}`, { method: "DELETE" })
    load()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ShieldCheck className="h-4 w-4" /> Auto-Approve Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Auto-Approve Rules</DialogTitle>
          <DialogDescription>
            Custom time requests matching one of these rules skip your approval and confirm instantly. Leave day/time blank to match any date or time for that client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <div>
            <Label className="text-xs">Client email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@email.com" className="h-8" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From (Cairo)</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-8" />
            </div>
            <div>
              <Label className="text-xs">To (Cairo)</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-8" />
            </div>
          </div>
          <Button size="sm" onClick={addRule} disabled={saving || !email.trim()} className="w-full gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Rule
          </Button>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : rules.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No auto-approve rules yet.</p>
          ) : (
            rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">{r.client_email}</p>
                  <p className="text-xs text-muted-foreground">{describeRule(r)}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => deleteRule(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
