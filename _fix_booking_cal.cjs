const fs = require("fs");
let c = fs.readFileSync("components/booking-calendar.tsx", "utf8");

// 1. Add new state variables after the existing formData state
const stateNeedle = "const currentStepIndex = STEPS.indexOf(step)";
const newStates = [
  "const [emailChecked, setEmailChecked] = useState(false)",
  "  const [emailAllowed, setEmailAllowed] = useState(false)",
  "  const [remainingHours, setRemainingHours] = useState(0)",
  "  const [verifyingEmail, setVerifyingEmail] = useState(false)",
  "",
  "  const currentStepIndex = STEPS.indexOf(step)",
].join("\n");
c = c.replace(stateNeedle, newStates);

// 2. Add verifyEmail function before fetchMonthSlots
const fetchNeedle = "const fetchMonthSlots = useCallback";
const verifyFn = [
  'const verifyEmail = async (email: string) => {',
  '    if (!email || !email.includes("@")) { setEmailChecked(false); setEmailAllowed(false); return }',
  "    setVerifyingEmail(true)",
  "    try {",
  '      const res = await fetch("/api/check-hours", {',
  '        method: "POST",',
  '        headers: { "Content-Type": "application/json" },',
  "        body: JSON.stringify({ email: email.trim() }),",
  "      })",
  "      const data = await res.json()",
  "      setEmailChecked(true)",
  "      setEmailAllowed(!!data.allowed)",
  "      setRemainingHours(data.remaining_hours || 0)",
  "    } catch {",
  "      setEmailChecked(true)",
  "      setEmailAllowed(false)",
  "      setRemainingHours(0)",
  "    }",
  "    setVerifyingEmail(false)",
  "  }",
  "",
  "  const fetchMonthSlots = useCallback",
].join("\n");
c = c.replace(fetchNeedle, verifyFn);

// 3. Add onBlur handler to the email input
const emailInputNeedle = 'onChange={(e) => setFormData((p) => ({ ...p, client_email: e.target.value }))}';
const emailInputRepl = [
  'onChange={(e) => { setFormData((p) => ({ ...p, client_email: e.target.value })); setEmailChecked(false); setEmailAllowed(false) }}',
  '                          onBlur={(e) => verifyEmail(e.target.value)}',
].join("\n");
c = c.replace(emailInputNeedle, emailInputRepl);

// 4. Add hours status message before phone section
const phoneNeedle = '{/* Phone */}';
const hoursStatus = [
  '{/* Hours verification status */}',
  '                  {verifyingEmail && (',
  '                    <div className="flex items-center gap-2 text-sm text-muted-foreground">',
  '                      <Loader2 className="h-3.5 w-3.5 animate-spin" />',
  '                      {t("verifyingEmail")}',
  '                    </div>',
  '                  )}',
  '                  {emailChecked && !verifyingEmail && emailAllowed && (',
  '                    <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3">',
  '                      <CheckCircle2 className="h-4 w-4 text-green-500" />',
  '                      <p className="text-sm text-green-600 dark:text-green-400">{t("hoursAvailable", { hours: remainingHours })}</p>',
  '                    </div>',
  '                  )}',
  '                  {emailChecked && !verifyingEmail && !emailAllowed && (',
  '                    <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">',
  '                      <p className="text-sm text-destructive">{t("noHoursError")}</p>',
  '                    </div>',
  '                  )}',
  '',
  '                  {/* Phone */}',
].join("\n");
c = c.replace(phoneNeedle, hoursStatus);

// 5. Block form submission if not allowed
c = c.replace("if (!selectedSlot) return", "if (!selectedSlot || !emailAllowed) return");

// 6. Disable submit button if not allowed
c = c.replace("disabled={submitting}", "disabled={submitting || !emailAllowed || verifyingEmail}");

// 7. Reset email states in resetBooking
c = c.replace(
  'setConfirmationData(null)',
  'setConfirmationData(null)\n    setEmailChecked(false)\n    setEmailAllowed(false)\n    setRemainingHours(0)'
);

// 8. Handle server-side error response
c = c.replace(
  'setError(data.error || t("errorBooking"))',
  'setError(data.error === "noHoursRemaining" ? t("noHoursError") : (data.error || t("errorBooking")))'
);

fs.writeFileSync("components/booking-calendar.tsx", c);
console.log("Patched booking-calendar.tsx, size:", fs.statSync("components/booking-calendar.tsx").size);

// Verify
const final = fs.readFileSync("components/booking-calendar.tsx", "utf8");
console.log("Has verifyEmail:", final.includes("verifyEmail"));
console.log("Has emailAllowed:", final.includes("emailAllowed"));
console.log("Has onBlur:", final.includes("onBlur"));
console.log("Has noHoursError:", final.includes("noHoursError"));
console.log("Has hoursAvailable:", final.includes("hoursAvailable"));
