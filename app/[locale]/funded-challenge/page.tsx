import { Navbar } from "@/components/navbar"
import { FundedChallengePage } from "@/components/funded-challenge-page"
import { Footer } from "@/components/footer"

export default function FundedChallengeRoute() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <FundedChallengePage />
      <Footer />
    </main>
  )
}
