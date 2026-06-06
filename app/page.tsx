"use client"

import dynamic from "next/dynamic"

const Navbar = dynamic(() => import("@/components/navbar").then(m => ({ default: m.Navbar })), { ssr: false })
const Hero = dynamic(() => import("@/components/hero").then(m => ({ default: m.Hero })), { ssr: false })
const CertificateStudio = dynamic(() => import("@/components/certificate-studio").then(m => ({ default: m.CertificateStudio })), { ssr: false })
const Curriculum = dynamic(() => import("@/components/curriculum").then(m => ({ default: m.Curriculum })), { ssr: false })
const WhatsIncluded = dynamic(() => import("@/components/whats-included").then(m => ({ default: m.WhatsIncluded })), { ssr: false })
const Faq = dynamic(() => import("@/components/faq").then(m => ({ default: m.Faq })), { ssr: false })
const Footer = dynamic(() => import("@/components/footer").then(m => ({ default: m.Footer })), { ssr: false })

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
