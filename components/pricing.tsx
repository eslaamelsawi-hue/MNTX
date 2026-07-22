"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, ShoppingCart } from "lucide-react"
import { OKXPayButton, NowPaymentsButton } from "@/components/payment-buttons"
import Link from "next/link"
import { useLocale } from "next-intl"

const essentialFeatures = [
  "Full SMC Course",
  "20+ Video Lessons",
  "Private Discord Community (limited access)",
  "One zoom meeting with Group of 10 people",
]

const completeFeatures = [
  { text: "Full Courses Lessons (MNTX Theory)", highlight: false },
  { text: "50+ Video Lessons", highlight: false },
  { text: "Passing Funded Acc Challenge Strategy", highlight: false },
  { text: "Private Discord Community", highlight: false },
  { text: "Private Telegram Community", highlight: false },
  { text: "Trading Playbook & Templates", highlight: false },
  { text: "Weekly 1-on-1 Zoom Sessions (4 Months — 10 Sessions)", highlight: true },
  { text: "Lifetime Access & Updates", highlight: false },
]

export function Pricing() {
  const locale = useLocale()

  return (
    <section id="pricing" className="px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 whitespace-nowrap text-3xl font-bold text-foreground md:text-4xl">
            Invest in Your <span className="text-primary">Trading Future</span>
          </h2>
        </div>

        {/* Test Plan */}
        <div className="mb-8">
          <Card className="relative flex flex-col border-[hsl(210,60%,50%)]/30 bg-card mx-auto max-w-sm">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[hsl(210,60%,50%)] px-4 py-1 text-xs font-bold text-foreground">
              TEST
            </div>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-foreground">Test Plan</CardTitle>
              <div className="mt-4 flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold text-[hsl(210,60%,50%)]">$1</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Test payment integration</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-foreground">
                  <Check className="h-4 w-4 shrink-0 text-[hsl(210,60%,50%)]" />
                  Test transaction
                </li>
              </ul>
            </CardContent>
            <CardFooter className="mt-auto flex flex-col gap-3">
              <Link href={`/${locale}/checkout?plan=test`} className="w-full">
                <Button className="w-full text-base bg-[hsl(210,60%,50%)] text-foreground hover:bg-[hsl(210,60%,40%)]" size="lg">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Checkout
                </Button>
              </Link>
              <NowPaymentsButton plan="test" className="w-full text-base bg-transparent border border-[hsl(210,60%,50%)]/30 text-foreground hover:bg-[hsl(210,60%,50%)] hover:text-foreground" />
              <OKXPayButton plan="test" className="w-full text-base bg-transparent border border-[hsl(210,60%,50%)]/30 text-foreground hover:bg-[hsl(210,60%,50%)] hover:text-foreground" />
            </CardFooter>
          </Card>
        </div>

        <div className="grid items-stretch gap-6 md:grid-cols-2">
          {/* Starter Plan */}
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
              <Link href={`/${locale}/checkout?plan=starter`} className="w-full">
                <Button className="w-full text-base bg-[hsl(210,60%,50%)] text-foreground hover:bg-[hsl(210,60%,40%)]" size="lg">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Checkout
                </Button>
              </Link>
              <NowPaymentsButton plan="starter" className="w-full text-base bg-transparent border border-[hsl(210,60%,50%)]/30 text-foreground hover:bg-[hsl(210,60%,50%)] hover:text-foreground" />
              <OKXPayButton plan="starter" className="w-full text-base bg-transparent border border-[hsl(210,60%,50%)]/30 text-foreground hover:bg-[hsl(210,60%,50%)] hover:text-foreground" />
            </CardFooter>
          </Card>

          {/* Coaching Plan */}
          <Card className="relative flex flex-col border-primary/30 bg-card">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
              MOST POPULAR
            </div>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-foreground">1-on-1 Coaching</CardTitle>
              <div className="mt-4 flex items-baseline justify-center gap-2">
                <span className="text-lg text-muted-foreground line-through">$1599</span>
                <span className="text-5xl font-bold text-primary">$900</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">One-time payment, lifetime access</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {completeFeatures.map((feature) => (
                  <li key={feature.text} className={`flex items-center gap-3 text-sm ${feature.highlight ? "animate-pulse font-bold text-primary" : "text-foreground"}`}>
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {feature.text}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="mt-auto flex flex-col gap-3">
              <Link href={`/${locale}/checkout?plan=coaching`} className="w-full">
                <Button className="w-full text-base" size="lg">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Checkout
                </Button>
              </Link>
              <NowPaymentsButton plan="coaching" className="w-full text-base bg-transparent border border-primary/30 text-foreground hover:bg-primary hover:text-primary-foreground" />
              <OKXPayButton plan="coaching" className="w-full text-base bg-transparent border border-primary/30 text-foreground hover:bg-primary hover:text-primary-foreground" />
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  )
}
