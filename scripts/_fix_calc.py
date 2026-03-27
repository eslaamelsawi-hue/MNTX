import re

f = open("components/ingot-calculator.tsx", encoding="utf-8").read()

# 1. Add GoldProPriceData interface before GoldPriceData
f = f.replace(
    "interface GoldPriceData {",
    'interface GoldProPriceData {\n  gram24USD: number; gram24KWD: number\n  gram21USD: number; gram21KWD: number\n  gram18USD: number; gram18KWD: number\n  usdToKwd: number; lastUpdated: string; source: string\n}\n\ninterface GoldPriceData {'
)

# 2. Change function signature
f = f.replace(
    "export function IngotCalculator() {",
    'export function IngotCalculator({ currency = "EGP", embedded = false }: { currency?: "EGP" | "KWD"; embedded?: boolean } = {}) {'
)

# 3. Change useSWR endpoint
f = f.replace(
    '  const { data, error, isLoading, mutate } = useSWR<GoldPriceData>("/api/gold", fetcher, {',
    '  const ep = currency === "KWD" ? "/api/gold-pro" : "/api/gold"\n  const { data: rawData, error, isLoading, mutate } = useSWR<GoldPriceData|GoldProPriceData>(ep, fetcher, {'
)

# 4. Add data normalization after useSWR
f = f.replace(
    "    revalidateOnFocus: false,\n  })\n\n  const standardWeights",
    '    revalidateOnFocus: false,\n  })\n\n  const data = rawData ? (currency === "KWD"\n    ? (() => { const d = rawData as GoldProPriceData; return { gram24: d.gram24KWD, gram21: d.gram21KWD, gram18: d.gram18KWD, gram24USD: d.gram24USD, gram21USD: d.gram21USD, gram18USD: d.gram18USD, usdToKwd: d.usdToKwd, usdToEgp: null } })()\n    : rawData as GoldPriceData) : null\n\n  const standardWeights'
)

# 5. Fix calcResults to handle KWD
old_calc = """  const calcResults = useMemo(() => {
    if (!data) return null
    const priceMap: Record<number, number | null> = {
      24: data.gram24,
      21: data.gram21,
      18: data.gram18,
    }
    const pricePerGram = priceMap[selectedKerat] ?? 0
    const totalEGP = pricePerGram * activeWeight
    const totalUSD = (data.usdToEgp ?? 0) > 0 ? totalEGP / data.usdToEgp! : 0
    const pricePerGramUSD = (data.usdToEgp ?? 0) > 0 ? pricePerGram / data.usdToEgp! : 0
    return { pricePerGram, pricePerGramUSD, totalEGP, totalUSD }
  }, [data, selectedKerat, activeWeight])"""
new_calc = """  const calcResults = useMemo(() => {
    if (!data) return null
    const d = data as any
    const pricePerGram = (selectedKerat === 24 ? d.gram24 : selectedKerat === 21 ? d.gram21 : d.gram18) ?? 0
    const pricePerGramUSD = currency === "KWD"
      ? (selectedKerat === 24 ? d.gram24USD : selectedKerat === 21 ? d.gram21USD : d.gram18USD) ?? 0
      : (d.usdToEgp ?? 0) > 0 ? pricePerGram / d.usdToEgp : 0
    const total = pricePerGram * activeWeight
    const totalUSD = currency === "KWD" ? pricePerGramUSD * activeWeight : (d.usdToEgp ?? 0) > 0 ? total / d.usdToEgp : 0
    return { pricePerGram, pricePerGramUSD, totalEGP: total, totalUSD }
  }, [data, selectedKerat, activeWeight, currency])"""
f = f.replace(old_calc, new_calc)

# 6. Fix price display labels
f = f.replace(
    '                    <p className="text-lg font-bold text-foreground">{formatEGP(calcResults.pricePerGram)} EGP</p>',
    '                    <p className="text-lg font-bold text-foreground">{formatEGP(calcResults.pricePerGram)} {currency === "KWD" ? "KWD" : "EGP"}</p>'
)
f = f.replace(
    '                    <p className="text-2xl font-bold text-yellow-500">{formatEGP(calcResults.totalEGP)} EGP</p>',
    '                    <p className="text-2xl font-bold text-yellow-500">{formatEGP(calcResults.totalEGP)} {currency === "KWD" ? "KWD" : "EGP"}</p>'
)
f = f.replace(
    '                    <p className="text-xs text-muted-foreground">{t("totalPriceEGP")} ({activeWeight}g)</p>',
    '                    <p className="text-xs text-muted-foreground">{currency === "KWD" ? "Total" : t("totalPriceEGP")} ({activeWeight}g)</p>'
)
f = f.replace(
    '                    <p className="text-xs text-muted-foreground">{t("pricePerGram")}</p>',
    '                    <p className="text-xs text-muted-foreground">{currency === "KWD" ? "Price / gram" : t("pricePerGram")}</p>'
)

# 7. Fix comparison table
f = f.replace(
    '                      <th className="p-3 text-right font-medium text-muted-foreground">{t("priceEGP")} ({activeWeight}g)</th>',
    '                      <th className="p-3 text-right font-medium text-muted-foreground">{currency === "KWD" ? "KWD" : t("priceEGP")} ({activeWeight}g)</th>'
)
f = f.replace(
    """                    {([24, 21, 18] as const).map((k) => {
                      const priceMap: Record<number, number | null> = {
                        24: data.gram24,
                        21: data.gram21,
                        18: data.gram18,
                      }
                      const totalEGP = (priceMap[k] ?? 0) * activeWeight
                      const totalUSD = (data.usdToEgp ?? 0) > 0 ? totalEGP / data.usdToEgp! : 0""",
    """                    {([24, 21, 18] as const).map((k) => {
                      const d2 = data as any
                      const main = (k === 24 ? d2.gram24 : k === 21 ? d2.gram21 : d2.gram18) ?? 0
                      const usdPg = currency === "KWD" ? (k === 24 ? d2.gram24USD : k === 21 ? d2.gram21USD : d2.gram18USD) ?? 0 : 0
                      const totalEGP = main * activeWeight
                      const totalUSD = currency === "KWD" ? usdPg * activeWeight : (d2.usdToEgp ?? 0) > 0 ? totalEGP / d2.usdToEgp : 0"""
)
f = f.replace(
    '                          <td className="p-3 text-right text-foreground">{formatEGP(totalEGP)} EGP</td>',
    '                          <td className="p-3 text-right text-foreground">{formatEGP(totalEGP)} {currency === "KWD" ? "KWD" : "EGP"}</td>'
)

# 8. Make outer wrapper conditional for embedded mode
f = f.replace(
    '  return (\n    <div className="mx-auto max-w-3xl px-4 py-12">\n      <div className="mb-10 text-center">',
    '  const title = !embedded && (\n      <div className="mb-10 text-center">'
)
# Close the title block
f = f.replace(
    '        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t("subtitle")}</p>\n        </div>\n\n      {isLoading',
    '        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t("subtitle")}</p>\n        </div>\n  )\n  return (\n    <div className={embedded ? "" : "mx-auto max-w-3xl px-4 py-12"}>\n      {title}\n\n      {isLoading'
)

open("components/ingot-calculator.tsx", "w", encoding="utf-8").write(f)
print("Done len:", len(f))