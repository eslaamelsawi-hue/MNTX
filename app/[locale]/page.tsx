import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { CertificateStudio } from "@/components/certificate-studio"
import { Curriculum } from "@/components/curriculum"
import { WhatsIncluded } from "@/components/whats-included"
import { Faq } from "@/components/faq"
import { Footer } from "@/components/footer"

export default function Page() {
  return (
    <main>
      <Navbar />
      <Hero />
      <CertificateStudio />
      <Curriculum />
      <WhatsIncluded />
      <Faq />
      <Footer />
    </main>
  )
}
