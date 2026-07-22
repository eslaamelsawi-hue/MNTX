export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
}

export const PRODUCTS: Product[] = [
  {
    id: "starter",
    name: "ADVANCED SMC Course - Starter Plan",
    description:
      "Full SMC Course with 20+ video lessons, private Discord community (limited access), and one zoom meeting with group of 10 people. One-time payment, lifetime access.",
    priceInCents: 37900, // $379.00
  },
  {
    id: "coaching",
    name: "1-on-1 Coaching Plan",
    description:
      "Full courses lessons (MNTX Theory), 50+ video lessons, passing funded acc challenge strategy, private Discord & Telegram communities, trading playbook & templates, weekly 1-on-1 zoom sessions (4 months, 10 sessions total). One-time payment, lifetime access.",
    priceInCents: 90000, // $900.00
  },
  {
    id: "extend-1m",
    name: "Extend Mentorship – 1 Month",
    description: "Extend your 1-on-1 online mentorship for 1 additional month. Includes weekly zoom sessions, Discord & Telegram access, and continued personalized guidance.",
    priceInCents: 25000, // $250.00
  },
  {
    id: "extend-2m",
    name: "Extend Mentorship – 2 Months",
    description: "Extend your 1-on-1 online mentorship for 2 additional months. Includes weekly zoom sessions, Discord & Telegram access, and continued personalized guidance.",
    priceInCents: 44900, // $449.00
  },
  {
    id: "extend-3m",
    name: "Extend Mentorship – 3 Months",
    description: "Extend your 1-on-1 online mentorship for 3 additional months. Includes weekly zoom sessions, Discord & Telegram access, and continued personalized guidance.",
    priceInCents: 90000, // $900.00
  },
  {
    id: "extend-6m",
    name: "Extend Mentorship – 6 Months",
    description: "Extend your 1-on-1 online mentorship for 6 additional months. Includes weekly zoom sessions, Discord & Telegram access, and continued personalized guidance. Best value.",
    priceInCents: 149900, // $1,499.00
  },
  {
    id: "mntx-elite",
    name: "MNTX ELITE",
    description:
      "MNTX ELITE membership — full lifetime access to the ADVANCED SMC Course, streamed on-site with all lessons and future updates.",
    priceInCents: 49900, // $499.00
  },
  {
    id: "funded-challenge",
    name: "PropFirm Mastery Course",
    description: "A complete mastery program to pass any prop firm challenge and manage funded accounts like a professional — live sessions, daily analysis, expert risk management, and certified results.",
    priceInCents: 50000, // $500.00/month
  },
]
