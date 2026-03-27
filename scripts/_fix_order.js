const fs = require("fs");
let f = fs.readFileSync("components/gold-pro-page.tsx", "utf8");

// Remove standardWeights + calcResults block from current position (lines 93-103)
const removeBlock = `\r\n  const standardWeights = [\r\n    { label: "0.5g", grams: 0.5 }, { label: "1g", grams: 1 }, { label: "2g", grams: 2 },\r\n    { label: "5g", grams: 5 }, { label: "10g", grams: 10 }, { label: "25g", grams: 25 },\r\n    { label: "1/4 Pound (17.5g)", grams: 17.5 }, { label: "Half Pound (35g)", grams: 35 }, { label: "Pound (70g)", grams: 70 },\r\n  ];\r\n  const calcResults = useMemo(() => {\r\n    if (!data || calcWeight <= 0) return { usd: 0, kwd: 0 };\r\n    const usdPg = calcKarat === 24 ? data.gram24USD : calcKarat === 21 ? data.gram21USD : data.gram18USD;\r\n    const kwdPg = calcKarat === 24 ? data.gram24KWD : calcKarat === 21 ? data.gram21KWD : data.gram18KWD;\r\n    return { usd: calcWeight * usdPg, kwd: calcWeight * kwdPg };\r\n  }, [data, calcKarat, calcWeight]);`;

if (!f.includes(removeBlock)) {
  console.error("REMOVE BLOCK NOT FOUND");
  process.exit(1);
}

f = f.replace(removeBlock, "");

// Insert after: const isPositive = (data?.change24h ?? 0) >= 0
const anchor = `  const isPositive = (data?.change24h ?? 0) >= 0\r\n`;
const insertAfter = anchor + `\r\n  const standardWeights = [\r\n    { label: "0.5g", grams: 0.5 }, { label: "1g", grams: 1 }, { label: "2g", grams: 2 },\r\n    { label: "5g", grams: 5 }, { label: "10g", grams: 10 }, { label: "25g", grams: 25 },\r\n    { label: "1/4 Pound (17.5g)", grams: 17.5 }, { label: "Half Pound (35g)", grams: 35 }, { label: "Pound (70g)", grams: 70 },\r\n  ];\r\n  const calcResults = useMemo(() => {\r\n    if (!data || calcWeight <= 0) return { usd: 0, kwd: 0 };\r\n    const usdPg = calcKarat === 24 ? data.gram24USD : calcKarat === 21 ? data.gram21USD : data.gram18USD;\r\n    const kwdPg = calcKarat === 24 ? data.gram24KWD : calcKarat === 21 ? data.gram21KWD : data.gram18KWD;\r\n    return { usd: calcWeight * usdPg, kwd: calcWeight * kwdPg };\r\n  }, [data, calcKarat, calcWeight]);\r\n`;

if (!f.includes(anchor)) {
  console.error("ANCHOR NOT FOUND");
  process.exit(1);
}

f = f.replace(anchor, insertAfter);

fs.writeFileSync("components/gold-pro-page.tsx", f, "utf8");
console.log("Done! len:", f.length);