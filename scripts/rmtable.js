const fs = require("fs");
const p = "components/gold-page.tsx";
let c = fs.readFileSync(p, "utf8");
const NL = "\r\n";

// 1. Remove the comparison table JSX (lines 296-325)
c = c.replace(
  NL + "              {/* Comparison Table */}" + NL +
  "              {comparisonRows.length > 0 && (" + NL +
  "                <div>" + NL +
  "                  <div className=\"flex items-center gap-2 mb-2\">" + NL +
  "                    <ArrowRightLeft className=\"h-4 w-4 text-yellow-500\" />" + NL +
  "                    <span className=\"text-sm font-medium\">{tc(\"gold\")} {activeWeight}g</span>" + NL +
  "                  </div>" + NL +
  "                  <div className=\"rounded-lg border border-border overflow-hidden\">" + NL +
  "                    <table className=\"w-full text-sm\">" + NL +
  "                      <thead>" + NL +
  "                        <tr className=\"border-b border-border bg-muted/50\">" + NL +
  "                          <th className=\"px-4 py-2 text-left font-medium\">{tc(\"karat\")}</th>" + NL +
  "                          <th className=\"px-4 py-2 text-right font-medium\">{tc(\"priceEGP\")}</th>" + NL +
  "                          <th className=\"px-4 py-2 text-right font-medium\">{tc(\"priceUSD\")}</th>" + NL +
  "                        </tr>" + NL +
  "                      </thead>" + NL +
  "                      <tbody>" + NL +
  "                        {comparisonRows.map((row) => (" + NL +
  "                          <tr key={row.karat} className={`border-b border-border last:border-0 ${row.karat === selectedKarat ? \"bg-yellow-500/10\" : \"\"}`}>" + NL +
  "                            <td className=\"px-4 py-2 font-medium\">{row.karat}K</td>" + NL +
  "                            <td className=\"px-4 py-2 text-right\">{formatEGP(row.priceEGP)} EGP</td>" + NL +
  "                            <td className=\"px-4 py-2 text-right\">{formatUSD(row.priceUSD)}</td>" + NL +
  "                          </tr>" + NL +
  "                        ))}" + NL +
  "                      </tbody>" + NL +
  "                    </table>" + NL +
  "                  </div>" + NL +
  "                </div>" + NL +
  "              )}",
  ""
);

// 2. Remove comparisonRows useMemo
c = c.replace(
  NL + "  const comparisonRows = useMemo(() => {" + NL +
  "    if (!data) return []" + NL +
  "    return [24, 21, 18].map(k => {" + NL +
  "      const priceMap: Record<number, number | null> = { 24: data.gram24, 21: data.gram21, 18: data.gram18 }" + NL +
  "      const ppg = priceMap[k] ?? 0" + NL +
  "      const total = ppg * activeWeight" + NL +
  "      const totalUSD = (data.usdToEgp ?? 0) > 0 ? total / data.usdToEgp! : 0" + NL +
  "      return { karat: k, priceEGP: total, priceUSD: totalUSD }" + NL +
  "    })" + NL +
  "  }, [data, activeWeight])",
  ""
);

// 3. Remove ArrowRightLeft from lucide imports
c = c.replace("  ArrowRightLeft," + NL, "");

fs.writeFileSync(p, c, "utf8");
console.log("Done. Lines:", c.split(NL).length);
console.log("Has comparisonRows:", c.includes("comparisonRows"));
console.log("Has ArrowRightLeft:", c.includes("ArrowRightLeft"));
