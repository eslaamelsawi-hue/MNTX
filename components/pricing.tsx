"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Loader2 } from "lucide-react"

function BinancePayButton({
  plan,
  className,
}: {
  plan: "starter" | "coaching"
  className?: string
}) {
  const [loading, setLoading] = useState(false)

  const handleBinancePay = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/binance-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await response.json()

      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer")
      } else if (data.error) {
        alert(data.error)
      }
    } catch {
      alert("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      className={className}
      size="lg"
      onClick={handleBinancePay}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <svg
            className="mr-2 h-5 w-5"
            viewBox="0 0 126.61 126.61"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M38.73 53.2l24.59-24.58 24.6 24.6 14.3-14.31L63.32 0l-38.9 38.9zM0 63.31l14.3-14.31 14.31 14.31-14.31 14.3zM38.73 73.41l24.59 24.59 24.6-24.6 14.31 14.29-38.9 38.91-38.91-38.88zM98 63.31l14.3-14.31 14.31 14.3-14.31 14.31z" />
            <path d="M77.83 63.3l-14.51-14.52-10.73 10.73-1.24 1.23-2.54 2.54 14.51 14.53 14.51-14.51z" />
          </svg>
          Pay with Binance
        </>
      )}
    </Button>
  )
}

const essentialFeatures = [
  "Full SMC Course",
  "20+ Video Lessons",
  "Private Discord Community (limited access)",
  "One zoom meeting with Group of 10 people",
]

const completeFeatures = [
  { text: "Full Courses Lessons (Volume Profile & MNTX Theory)", highlight: false },
  { text: "50+ Video Lessons", highlight: false },
  { text: "Passing Funded Acc Challenge Strategy", highlight: false },
  { text: "Private Discord Community", highlight: false },
  { text: "Private Telegram Community", highlight: false },
  { text: "Trading Playbook & Templates", highlight: false },
  { text: "Weekly 1-on-1 Zoom Sessions (for 6 Months)", highlight: true },
  { text: "Lifetime Access & Updates", highlight: false },
]

export function Pricing() {
  return (
    <section id="pricing" className="px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 whitespace-nowrap text-3xl font-bold text-foreground md:text-4xl">
            Invest in Your <span className="text-primary">Trading Future</span>
          </h2>
        </div>

        <div className="grid items-stretch gap-6 md:grid-cols-2">
          <Card className="relative flex flex-col border-[hsl(210,60%,50%)]/30 bg-card">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[hsl(210,60%,50%)] px-4 py-1 text-xs font-bold text-foreground">
              STARTER
            </div>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-foreground">ADVANCED SMC Course</CardTitle>
              <div className="mt-4 flex items-baseline justify-center gap-2">
                <span className="text-lg text-muted-foreground line-through">$500</span>
                <span className="text-5xl font-bold text-[hsl(210,60%,50%)]">$379</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">One-time payment, lifetime access</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {essentialFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                    <Check className="h-4 w-4 shrink-0 text-[hsl(210,60%,50%)]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="mt-auto flex flex-col gap-3">
              <a href="https://whop.com/checkout/plan_bAvnJpC9SmIIa" target="_blank" rel="noopener noreferrer" className="w-full">
                <Button className="w-full text-base bg-[hsl(210,60%,50%)] text-foreground hover:bg-[hsl(210,60%,40%)]" size="lg">
                  <svg className="mr-2 h-5 w-8" viewBox="0 0 780 500" fill="currentColor" aria-hidden="true">
                    <path d="M293.2 348.73l33.36-195.76h53.35l-33.38 195.76zm246.11-191.54c-10.57-3.97-27.16-8.21-47.89-8.21-52.78 0-89.94 26.6-90.18 64.76-.47 28.16 26.48 43.87 46.73 53.24 20.72 9.6 27.68 15.74 27.68 24.32-.24 13.12-16.59 19.12-31.93 19.12-21.37 0-32.69-2.96-50.21-10.25l-6.88-3.12-7.49 43.89c12.46 5.47 35.52 10.21 59.47 10.45 56.13 0 92.58-26.24 92.82-67.04.24-22.36-14.06-39.34-44.94-53.36-18.71-9.08-30.19-15.14-30.19-24.32.24-8.33 9.72-16.89 30.67-16.89 17.53-.24 30.19 3.56 40.06 7.53l4.83 2.26 7.33-42.38h-.01zm137.31-4.22h-41.27c-12.77 0-22.33 3.49-27.92 16.26l-79.27 179.5h56.13l11.21-29.35 68.45.08c1.58 6.85 6.48 29.27 6.48 29.27h49.62l-43.31-195.76h-.12zm-65.25 126.41c4.43-11.32 21.37-54.96 21.37-54.96-.24.47 4.39-11.36 7.13-18.72l3.64 16.89 12.38 56.79h-44.52zm-382.79-126.41l-52.31 133.37-5.56-27.22c-9.72-31.24-39.94-65.12-73.78-82.01l47.89 171.62 56.6-.08 84.22-195.68h-56.6l-.46-.01z" />
                    <path d="M51.71 152.97l-.82 4.96c21.37 5.16 40.53 12.63 57.3 22.51l48.38 173.22 57.08-.08 84.94-200.61h-57.08l-52.78 136.14-5.72-27.57c-9.72-13.12-17.77-23.7-28.68-32.89-22.83-19.14-48.03-30.87-66.53-37.43l-36.09-38.25z" fill="#F7A600" />
                  </svg>
                  Pay with Visa
                </Button>
              </a>
              <BinancePayButton
                plan="starter"
                className="w-full text-base bg-transparent border border-[hsl(210,60%,50%)]/30 text-foreground hover:bg-[hsl(210,60%,50%)] hover:text-foreground active:bg-[hsl(210,60%,40%)]"
              />
            </CardFooter>
          </Card>

          <Card className="relative flex flex-col border-primary/30 bg-card">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
              MOST POPULAR
            </div>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-foreground">1-on-1 Coaching</CardTitle>
              <div className="mt-4 flex items-baseline justify-center gap-2">
                <span className="text-lg text-muted-foreground line-through">$2499</span>
                <span className="text-5xl font-bold text-primary">$1599</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">One-time payment, lifetime access</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
              {completeFeatures.map((feature) => (
                <li
                  key={feature.text}
                  className={`flex items-center gap-3 text-sm ${feature.highlight ? "animate-pulse font-bold text-primary" : "text-foreground"}`}
                >
                  <Check className={`h-4 w-4 shrink-0 text-primary`} />
                  {feature.text}
                </li>
              ))}
              </ul>
            </CardContent>
            <CardFooter className="mt-auto flex flex-col gap-3">
              <a href="https://whop.com/checkout/plan_WyMVBllfatAYa" target="_blank" rel="noopener noreferrer" className="w-full">
                <Button className="w-full text-base" size="lg">
                  <svg className="mr-2 h-5 w-8" viewBox="0 0 780 500" fill="currentColor" aria-hidden="true">
                    <path d="M293.2 348.73l33.36-195.76h53.35l-33.38 195.76zm246.11-191.54c-10.57-3.97-27.16-8.21-47.89-8.21-52.78 0-89.94 26.6-90.18 64.76-.47 28.16 26.48 43.87 46.73 53.24 20.72 9.6 27.68 15.74 27.68 24.32-.24 13.12-16.59 19.12-31.93 19.12-21.37 0-32.69-2.96-50.21-10.25l-6.88-3.12-7.49 43.89c12.46 5.47 35.52 10.21 59.47 10.45 56.13 0 92.58-26.24 92.82-67.04.24-22.36-14.06-39.34-44.94-53.36-18.71-9.08-30.19-15.14-30.19-24.32.24-8.33 9.72-16.89 30.67-16.89 17.53-.24 30.19 3.56 40.06 7.53l4.83 2.26 7.33-42.38h-.01zm137.31-4.22h-41.27c-12.77 0-22.33 3.49-27.92 16.26l-79.27 179.5h56.13l11.21-29.35 68.45.08c1.58 6.85 6.48 29.27 6.48 29.27h49.62l-43.31-195.76h-.12zm-65.25 126.41c4.43-11.32 21.37-54.96 21.37-54.96-.24.47 4.39-11.36 7.13-18.72l3.64 16.89 12.38 56.79h-44.52zm-382.79-126.41l-52.31 133.37-5.56-27.22c-9.72-31.24-39.94-65.12-73.78-82.01l47.89 171.62 56.6-.08 84.22-195.68h-56.6l-.46-.01z" />
                    <path d="M51.71 152.97l-.82 4.96c21.37 5.16 40.53 12.63 57.3 22.51l48.38 173.22 57.08-.08 84.94-200.61h-57.08l-52.78 136.14-5.72-27.57c-9.72-13.12-17.77-23.7-28.68-32.89-22.83-19.14-48.03-30.87-66.53-37.43l-36.09-38.25z" fill="#F7A600" />
                  </svg>
                  Pay with Visa
                </Button>
              </a>
              <BinancePayButton
                plan="coaching"
                className="w-full text-base bg-transparent border border-primary/30 text-foreground hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-primary-foreground"
              />
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  )
}

