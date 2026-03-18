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
]
