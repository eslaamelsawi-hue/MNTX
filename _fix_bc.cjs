const fs = require("fs");
let c = fs.readFileSync("components/booking-calendar.tsx", "utf8");

const old2 = "const fetchMonthSlots = useCallback";
const fn2 = `const verifyEmail = async (email: string) => {
    if (!email || !email.includes("@")) { setEmailChecked(false); setEmailAllowed(false); return }
    setVerifyingEmail(true)
    try {
      const res = await fetch("/api/check-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      setEmailChecked(true)
      setEmailAllowed(!!data.allowed)
      setRemainingHours(data.remaining_hours || 0)
    } catch {
      setEmailChecked(true)
      setEmailAllowed(false)
      setRemainingHours(0)
    }
    setVerifyingEmail(false)
  }

  const fetchMonthSlots = useCallback`;
c = c.replace(old2, fn2);

const old3 = 'onChange={(e) => setFormData((p) => ({ ...p, client_email: e.target.value }))}';
const rep3 = 'onChange={(e) => { setFormData((p) => ({ ...p, client_email: e.target.value })); setEmailChecked(false); setEmailAllowed(false) }}\n                          onBlur={(e) => verifyEmail(e.target.value)}';
c = c.replace(old3, rep3);

const old4 = "{/* Phone */}";
const rep4 = `{/* Hours verification */}
                  {verifyingEmail && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />{t("verifyingEmail")}</div>}
                  {emailChecked && !verifyingEmail && emailAllowed && <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3"><CheckCircle2 className="h-4 w-4 text-green-500" /><p className="text-sm text-green-600 dark:text-green-400">{t("hoursAvailable", { hours: remainingHours })}</p></div>}
                  {emailChecked && !verifyingEmail && !emailAllowed && <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3"><p className="text-sm text-destructive">{t("noHoursError")}</p></div>}

                  {/* Phone */}`;
c = c.replace(old4, rep4);

c = c.replace("if (!selectedSlot) return", "if (!selectedSlot || !emailAllowed) return");
c = c.replace("disabled={submitting}", "disabled={submitting || !emailAllowed || verifyingEmail}");
c = c.replace("setConfirmationData(null)", "setConfirmationData(null)\n    setEmailChecked(false)\n    setEmailAllowed(false)\n    setRemainingHours(0)");
c = c.replace('setError(data.error || t("errorBooking"))', 'setError(data.error === "noHoursRemaining" ? t("noHoursError") : (data.error || t("errorBooking")))');

fs.writeFileSync("components/booking-calendar.tsx", c);
console.log("Done, size:", fs.statSync("components/booking-calendar.tsx").size);
const f = fs.readFileSync("components/booking-calendar.tsx", "utf8");
["verifyEmail","emailAllowed","onBlur","noHoursError"].forEach(k => console.log(k+":", f.includes(k)));