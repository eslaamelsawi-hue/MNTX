import fs from "fs"
import path from "path"

export type OKXOrder = {
  orderId: string
  plan: string
  amount: string
  email: string
  address: string
  chain: string
  status: "pending" | "paid" | "expired"
  createdAt: string
  paidAt?: string
  txId?: string
}

const DATA_FILE = path.join(process.cwd(), "data", "okx-orders.json")

function readOrders(): OKXOrder[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return []
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"))
  } catch {
    return []
  }
}

function writeOrders(orders: OKXOrder[]): void {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2))
}

export function createOrder(order: OKXOrder): void {
  const orders = readOrders()
  orders.push(order)
  writeOrders(orders)
}

export function getOrder(orderId: string): OKXOrder | null {
  return readOrders().find((o) => o.orderId === orderId) || null
}

export function updateOrder(orderId: string, updates: Partial<OKXOrder>): void {
  const orders = readOrders()
  const idx = orders.findIndex((o) => o.orderId === orderId)
  if (idx !== -1) {
    orders[idx] = { ...orders[idx], ...updates }
    writeOrders(orders)
  }
}

export function getPendingOrders(): OKXOrder[] {
  return readOrders().filter((o) => o.status === "pending")
}
