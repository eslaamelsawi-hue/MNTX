import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PerformanceAnalyzer } from "@/components/tools/performance-analyzer"

export default function PerformanceAnalyzerPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <PerformanceAnalyzer />
      <Footer />
    </main>
  )
}
