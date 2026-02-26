const fs = require('fs');
const path = 'components/gold-page.tsx';
let c = fs.readFileSync(path, 'utf8');

// 1. Fix imports
c = c.replace(
  'import { useState, useEffect } from "react"',
  'import { useState, useEffect, useMemo } from "react"'
);

c = c.replace(
  '  Info,\n} from "lucide-react"',
  '  Info,\n  Calculator,\n  ArrowRightLeft,\n} from "lucide-react"'
);

c = c.replace(
  'import { useTranslations } from "next-intl"',
  'import { useTranslations } from "next-intl"\nimport { Input } from "@/components/ui/input"\nimport { Label } from "@/components/ui/label"'
);

// 2. Add tc translations + state
c = c.replace(
  'const t = useTranslations("gold")',
  'const t = useTranslations("gold")\n  const tc = useTranslations("ingotCalc")'
);

// 3. Add calculator state after isPositive
const calcState = 
  // Ingot calculator state
  type Karat = "24" | "21" | "18"
  const STANDARD_WEIGHTS = [1, 2.5, 5, 10, 20, 50, 100, 500, 1000]
  const KARAT_CONFIG: Record<Karat, { purity: number; color: string; bgColor: string; borderColor: string }> = {
    "24": { purity: 1, color: "text-yellow-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
    "21": { purity: 0.875, color: "text-yellow-400", bgColor: "bg-yellow-400/10", borderColor: "border-yellow-400/30" },
    "18": { purity: 0.75, color: "text-yellow-300", bgColor: "bg-yellow-300/10", borderColor: "border-yellow-300/30" },
  }
  const [selectedKarat, setSelectedKarat] = useState<Karat>("24")
  const [selectedWeight, setSelectedWeight] = useState<number | null>(10)
  const [customWeight, setCustomWeight] = useState<string>("")
  const [isCustom, setIsCustom] = useState(false)

  const activeWeight = isCustom ? parseFloat(customWeight) || 0 : (selectedWeight ?? 0)

  const gramPrice = useMemo(() => {
    if (!data) return 0
    switch (selectedKarat) {
      case "24": return data.gram24 ?? 0
      case "21": return data.gram21 ?? 0
      case "18": return data.gram18 ?? 0
    }
  }, [selectedKarat, data])

  const gramPriceUSD = useMemo(() => {
    if (!data?.usdToEgp || data.usdToEgp === 0) return 0
    return gramPrice / data.usdToEgp
  }, [gramPrice, data?.usdToEgp])

  const totalEGP = gramPrice * activeWeight
  const totalUSD = gramPriceUSD * activeWeight
  const karatConfig = KARAT_CONFIG[selectedKarat]

  const handleWeightSelect = (w: number) => {
    setSelectedWeight(w)
    setIsCustom(false)
    setCustomWeight("")
  }

  const handleCustomInput = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "")
    setCustomWeight(sanitized)
    setIsCustom(true)
    setSelectedWeight(null)
  };

c = c.replace(
  '  const isPositive = (data?.change24h ?? 0) >= 0',
  '  const isPositive = (data?.change24h ?? 0) >= 0\n' + calcState
);

console.log('Modifications applied, writing...');
console.log('New size:', c.length, 'bytes');
console.log('Has Calculator:', c.includes('Calculator'));
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');
