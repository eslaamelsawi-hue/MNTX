import dynamic from "next/dynamic"

const DashboardPage = dynamic(() => import("@/components/client-dashboard").then(mod => ({ default: mod.ClientDashboard })), {
  ssr: false,
})

export const revalidate = 0

export default function RootPage() {
  return (
    <main>
      <DashboardPage />
    </main>
  )
}
