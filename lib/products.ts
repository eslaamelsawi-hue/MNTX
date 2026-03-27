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
      "Full courses lessons (Volume Profile & MNTX Theory), 50+ video lessons, passing funded acc challenge strategy, private Discord & Telegram communities, trading playbook & templates, weekly 1-on-1 zoom sessions for 6 months. One-time payment, lifetime access.",
    priceInCents: 159900, // $1,599.00
  },
  {
    id: "extend-1m",
    name: "Extend Mentorship – 1 Month",
    description: "Extend your 1-on-1 online mentorship for 1 additional month. Includes weekly zoom sessions, Discord & Telegram access, and continued personalized guidance.",
    priceInCents: 19900, // $199.00
  },
  {
    id: "extend-2m",
    name: "Extend Mentorship – 2 Months",
    description: "Extend your 1-on-1 online mentorship for 2 additional months. Includes weekly zoom sessions, Discord & Telegram access, and continued personalized guidance.",
    priceInCents: 37900, // $379.00
  },
  {
    id: "extend-3m",
    name: "Extend Mentorship – 3 Months",
    description: "Extend your 1-on-1 online mentorship for 3 additional months. Includes weekly zoom sessions, Discord & Telegram access, and continued personalized guidance.",
    priceInCents: 69900, // $699.00
  },
  {
    id: "extend-6m",
    name: "Extend Mentorship – 6 Months",
    description: "Extend your 1-on-1 online mentorship for 6 additional months. Includes weekly zoom sessions, Discord & Telegram access, and continued personalized guidance. Best value.",
    priceInCents: 149900, // $1,499.00
  },
]
