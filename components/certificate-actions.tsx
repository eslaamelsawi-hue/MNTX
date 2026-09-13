"use client"

import { Button } from "@/components/ui/button"
import { Download, Printer } from "lucide-react"

export function CertificateActions({ svg, fileName }: { svg: string; fileName: string }) {
  const download = () => {
    const blob = new Blob([svg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2 print:hidden">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={download}>
        <Download className="h-4 w-4" /> Download
      </Button>
      <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Print / Save as PDF
      </Button>
    </div>
  )
}
