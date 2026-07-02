import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { TradingPlanBuilder } from "@/components/tools/trading-plan-builder"

export default function TradingPlanBuilderPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <TradingPlanBuilder />
      <Footer />
    </main>
  )
}
