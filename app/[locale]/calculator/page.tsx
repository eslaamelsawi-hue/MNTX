import { Navbar } from "@/components/navbar"
import { IngotCalculator } from "@/components/ingot-calculator"
import { Footer } from "@/components/footer"

export default function CalculatorPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <IngotCalculator />
      <Footer />
    </main>
  )
}