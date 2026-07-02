import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { RiskSystemBuilder } from "@/components/tools/risk-system-builder"

export default function RiskSystemBuilderPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <RiskSystemBuilder />
      <Footer />
    </main>
  )
}
