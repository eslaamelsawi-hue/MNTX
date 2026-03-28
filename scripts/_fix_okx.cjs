const fs = require("fs");
const content = `import { createAdminClient } from "@/lib/supabase/admin"

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

export async function createOrder(order: OKXOrder): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from("okx_orders").insert({
    order_id: order.orderId,
    plan: order.plan,
    amount: order.amount,
    email: order.email,
    address: order.address,
    chain: order.chain,
    status: order.status,
    created_at: order.createdAt,
  })
  if (error) throw new Error(`Failed to create order: ${error.message}`)
}

export async function getOrder(orderId: string): Promise<OKXOrder | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("okx_orders")
    .select("*")
    .eq("order_id", orderId)
    .single()
  if (error || !data) return null
  return {
    orderId: data.order_id,
    plan: data.plan,
    amount: data.amount,
    email: data.email,
    address: data.address,
    chain: data.chain,
    status: data.status,
    createdAt: data.created_at,
    paidAt: data.paid_at || undefined,
    txId: data.tx_id || undefined,
  }
}

export async function updateOrder(orderId: string, updates: Partial<OKXOrder>): Promise<void> {
  const supabase = createAdminClient()
  const mapped: Record<string, unknown> = {}
  if (updates.status) mapped.status = updates.status
  if (updates.paidAt) mapped.paid_at = updates.paidAt
  if (updates.txId) mapped.tx_id = updates.txId
  const { error } = await supabase
    .from("okx_orders")
    .update(mapped)
    .eq("order_id", orderId)
  if (error) throw new Error(`Failed to update order: ${error.message}`)
}

export async function getPendingOrders(): Promise<OKXOrder[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("okx_orders")
    .select("*")
    .eq("status", "pending")
  if (error || !data) return []
  return data.map((d) => ({
    orderId: d.order_id,
    plan: d.plan,
    amount: d.amount,
    email: d.email,
    address: d.address,
    chain: d.chain,
    status: d.status,
    createdAt: d.created_at,
    paidAt: d.paid_at || undefined,
    txId: d.tx_id || undefined,
  }))
}
`;
fs.writeFileSync("C:\\Users\\ikloo\\OneDrive\\Desktop\\mentixz\\lib\\okx-orders.ts", content, "utf8");
console.log("DONE", content.length);