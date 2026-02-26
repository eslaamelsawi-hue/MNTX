const fs = require("fs");
const p = "components/gold-page.tsx";
let c = fs.readFileSync(p, "utf8");

// Fix type errors: add 'as' casts and null checks
// 1. Fix priceMap indexing in calcResults
c = c.replace(
  "    const priceMap = { 24: data.gram24, 21: data.gram21, 18: data.gram18 }\r\n    const pricePerGram = priceMap[selectedKarat]",
  "    const priceMap: Record<number, number | null> = { 24: data.gram24, 21: data.gram21, 18: data.gram18 }\r\n    const pricePerGram = priceMap[selectedKarat] ?? 0"
);

// 2. Fix usdToEgp null checks in calcResults
c = c.replace(
  "    const totalUSD = data.usdToEgp > 0 ? totalEGP / data.usdToEgp : 0\r\n    const pricePerGramUSD = data.usdToEgp > 0 ? pricePerGram / data.usdToEgp : 0",
  "    const totalUSD = (data.usdToEgp ?? 0) > 0 ? totalEGP / data.usdToEgp! : 0\r\n    const pricePerGramUSD = (data.usdToEgp ?? 0) > 0 ? pricePerGram / data.usdToEgp! : 0"
);

// 3. Fix priceMap indexing in comparisonRows
c = c.replace(
  "      const priceMap = { 24: data.gram24, 21: data.gram21, 18: data.gram18 }\r\n      const ppg = priceMap[k]",
  "      const priceMap: Record<number, number | null> = { 24: data.gram24, 21: data.gram21, 18: data.gram18 }\r\n      const ppg = priceMap[k] ?? 0"
);

// 4. Fix usdToEgp null check in comparisonRows
c = c.replace(
  "      const totalUSD = data.usdToEgp > 0 ? total / data.usdToEgp : 0",
  "      const totalUSD = (data.usdToEgp ?? 0) > 0 ? total / data.usdToEgp! : 0"
);

fs.writeFileSync(p, c, "utf8");
console.log("TypeScript fixes applied.");
