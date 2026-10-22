/** The mentor's own prop-firm certificates and payout proofs, newest first.
 *  Shared by the home-page studio and the /profitable funnel so the two can't
 *  drift apart as certificates are added. */
export type Certificate = { id: number; src: string; alt: string }

export const CERTIFICATES: Certificate[] = [
  { id: 19, src: "/certs/cert-19.png", alt: "Certificate - 2026" },
  { id: 17, src: "/certs/cert-17.png", alt: "Certificate - 2026" },
  { id: 18, src: "/certs/cert-18.png", alt: "Certificate - 2026" },
  { id: 15, src: "/certs/cert-15.png", alt: "Alpha Capital - Lifetime Payout $22,213.00 - Mar 2026" },
  { id: 16, src: "/certs/cert-16.jpg", alt: "Lucid Trading - Payout Certificate - May 2026" },
  { id: 14, src: "/certs/cert-14.png", alt: "Certificate - Apr 2026" },
  { id: 13, src: "/certs/cert-13.png", alt: "My Funded Futures - Flex 25K Challenge Passed - Mar 2026" },
  { id: 1, src: "/certs/cert-1.png", alt: "Alpha Capital Group - Stage 1 Passed - Apr 2025" },
  { id: 2, src: "/certs/cert-6.png", alt: "Alpha Capital Group - Certified Funded Trader - Apr 2025" },
  { id: 3, src: "/certs/cert-2.png", alt: "Alpha Capital - Payout $1,026 - May 2025" },
  { id: 4, src: "/certs/cert-4.png", alt: "Alpha Capital - Payout $1,110 - May 2025" },
  { id: 5, src: "/certs/cert-3.png", alt: "Alpha Capital - Payout $8,810 - Dec 2025" },
  { id: 6, src: "/certs/cert-5.png", alt: "Alpha Capital - Passed Verification - Jan 2026" },
  { id: 9, src: "/certs/cert-9.png", alt: "Maven Trading Group - Certificate of Completion" },
  { id: 10, src: "/certs/cert-10.png", alt: "Maven Trading Group - Funded Trader Certificate" },
  { id: 11, src: "/certs/cert-11.png", alt: "Alpha Capital - Payout $1,604 - Jun 2025" },
  { id: 12, src: "/certs/cert-12.png", alt: "Alpha Capital - Phase 2 Achievement - Apr 2025" },
]
