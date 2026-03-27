const fs = require("fs");
let f = fs.readFileSync("components/gold-pro-page.tsx", "utf8");

f = f.replace('import { useState, useEffect } from "react"', 'import { useState, useEffect, useMemo } from "react"');
f = f.replace("  ChevronsUpDown,\r\n} from \"lucide-react\"", "  ChevronsUpDown,\r\n  Calculator,\r\n} from \"lucide-react\"");
f = f.replace('  const t = useTranslations("goldPro")\r\n  const [currency', '  const t = useTranslations("goldPro")\r\n  const [calcKarat, setCalcKarat] = useState(21)\r\n  const [calcWeight, setCalcWeight] = useState(8)\r\n  const [calcCustom, setCalcCustom] = useState("")\r\n  const [currency');
f = f.replace('  const analysis = useAnalysis()', '  const standardWeights = [\r\n    { label: "0.5g", grams: 0.5 }, { label: "1g", grams: 1 }, { label: "2g", grams: 2 },\r\n    { label: "5g", grams: 5 }, { label: "10g", grams: 10 }, { label: "25g", grams: 25 },\r\n    { label: "1/4 Pound (17.5g)", grams: 17.5 }, { label: "Half Pound (35g)", grams: 35 }, { label: "Pound (70g)", grams: 70 },\r\n  ];\r\n  const calcResults = useMemo(() => {\r\n    if (!data || calcWeight <= 0) return { usd: 0, kwd: 0 };\r\n    const usdPg = calcKarat === 24 ? data.gram24USD : calcKarat === 21 ? data.gram21USD : data.gram18USD;\r\n    const kwdPg = calcKarat === 24 ? data.gram24KWD : calcKarat === 21 ? data.gram21KWD : data.gram18KWD;\r\n    return { usd: calcWeight * usdPg, kwd: calcWeight * kwdPg };\r\n  }, [data, calcKarat, calcWeight]);\r\n  const analysis = useAnalysis()');

const lines = [
  '          {/* Gold Calculator - Free Access */}',
  '          <div className="mb-10">',
  '            <Card className="bg-zinc-900/70 border-yellow-500/20">',
  '              <CardContent className="p-6">',
  '                <div className="flex items-center gap-2 mb-6">',
  '                  <Calculator className="text-yellow-400 h-6 w-6" />',
  '                  <h2 className="text-xl font-bold text-yellow-400">Gold Weight Calculator</h2>',
  '                </div>',
  '                <p className="text-zinc-400 text-sm mb-4">Free for everyone - calculate gold value by weight and karat.</p>',
  '                <div className="flex gap-2 mb-4">',
  '                  {([24, 21, 18] as const).map((k) => (',
  '                    <button',
  '                      key={k}',
  '                      onClick={() => setCalcKarat(k)}',
  '                      className={calcKarat === k ? "px-4 py-2 rounded-md font-semibold text-sm bg-yellow-500 text-black" : "px-4 py-2 rounded-md font-semibold text-sm bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}',
  '                    >',
  '                      {k}K',
  '                    </button>',
  '                  ))}',
  '                </div>',
  '                <div className="flex flex-wrap gap-2 mb-4">',
  '                  {standardWeights.map((w) => (',
  '                    <button',
  '                      key={w.label}',
  '                      onClick={() => { setCalcWeight(w.grams); setCalcCustom("") }}',
  '                      className={calcWeight === w.grams && calcCustom === "" ? "px-3 py-1 rounded text-xs font-medium bg-yellow-500 text-black" : "px-3 py-1 rounded text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}',
  '                    >',
  '                      {w.label}',
  '                    </button>',
  '                  ))}',
  '                </div>',
  '                <div className="flex items-center gap-3 mb-6">',
  '                  <Input',
  '                    type="number"',
  '                    placeholder="Custom grams..."',
  '                    value={calcCustom}',
  '                    onChange={(e) => { setCalcCustom(e.target.value); setCalcWeight(parseFloat(e.target.value) || 0) }}',
  '                    className="w-40 bg-zinc-800 border-zinc-700 text-white"',
  '                  />',
  '                  <span className="text-zinc-400 text-sm">grams</span>',
  '                </div>',
  '                {data && calcWeight > 0 && (',
  '                  <div className="bg-zinc-800/50 rounded-lg p-4">',
  '                    <p className="text-zinc-400 text-sm mb-1">{calcWeight}g x {calcKarat}K</p>',
  '                    <p className="text-2xl font-bold text-yellow-400">{getPrice(calcResults.usd, calcResults.kwd)}</p>',
  '                    <p className="text-xs text-zinc-500 mt-1">USD: {calcResults.usd.toFixed(2)} / KWD: {calcResults.kwd.toFixed(3)}</p>',
  '                  </div>',
  '                )}',
  '              </CardContent>',
  '            </Card>',
  '          </div>',
  '',
];
const calcCard = lines.join('\r\n');
f = f.replace('\r\n\r\n          {!hasAccess ?', '\r\n\r\n' + calcCard + '          {!hasAccess ?');

fs.writeFileSync("components/gold-pro-page.tsx", f, "utf8");
console.log("Done! New length:", f.length);