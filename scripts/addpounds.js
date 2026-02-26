const fs = require("fs");
const p = "components/gold-page.tsx";
let c = fs.readFileSync(p, "utf8");
const NL = "\r\n";

// 1. Replace standardWeights with a structured array that includes pound info
c = c.replace(
  "  const standardWeights = [1, 2.5, 5, 10, 20, 31.1035, 50, 100, 500]",
  [
    "  const standardWeights = [",
    "    { grams: 2, label: tc(\"quarterPound\"), isPound: true },",
    "    { grams: 4, label: tc(\"halfPound\"), isPound: true },",
    "    { grams: 8, label: tc(\"onePound\"), isPound: true },",
    "    { grams: 1, label: \"1g\", isPound: false },",
    "    { grams: 2.5, label: \"2.5g\", isPound: false },",
    "    { grams: 5, label: \"5g\", isPound: false },",
    "    { grams: 10, label: \"10g\", isPound: false },",
    "    { grams: 20, label: \"20g\", isPound: false },",
    "    { grams: 31.1035, label: \"1 oz\", isPound: false },",
    "    { grams: 50, label: \"50g\", isPound: false },",
    "    { grams: 100, label: \"100g\", isPound: false },",
    "    { grams: 500, label: \"500g\", isPound: false },",
    "  ]"
  ].join(NL)
);

// 2. Replace the weight button rendering to use the new structure
c = c.replace(
  [
    "                <div className=\"flex flex-wrap gap-2\">",
    "                  {standardWeights.map((w) => (",
    "                    <Button",
    "                      key={w}",
    "                      size=\"sm\"",
    "                      variant={selectedWeight === w && !customWeight ? \"default\" : \"outline\"}",
    "                      className={selectedWeight === w && !customWeight ? \"bg-yellow-500 text-black hover:bg-yellow-600\" : \"border-yellow-500/30 hover:bg-yellow-500/10\"}",
    "                      onClick={() => { setSelectedWeight(w); setCustomWeight(\"\"); }}",
    "                    >",
    "                      {w === 31.1035 ? \"1 oz\" : w + \"g\"}",
    "                    </Button>",
    "                  ))}",
    "                </div>",
  ].join(NL),
  [
    "                <div className=\"flex flex-wrap gap-2\">",
    "                  {standardWeights.map((w) => (",
    "                    <Button",
    "                      key={w.label}",
    "                      size=\"sm\"",
    "                      variant={selectedWeight === w.grams && !customWeight ? \"default\" : \"outline\"}",
    "                      className={selectedWeight === w.grams && !customWeight",
    "                        ? w.isPound ? \"bg-amber-600 text-white hover:bg-amber-700\" : \"bg-yellow-500 text-black hover:bg-yellow-600\"",
    "                        : \"border-yellow-500/30 hover:bg-yellow-500/10\"}",
    "                      onClick={() => { setSelectedWeight(w.grams); setCustomWeight(\"\"); if (w.isPound) setSelectedKarat(21); }}",
    "                    >",
    "                      {w.label}",
    "                    </Button>",
    "                  ))}",
    "                </div>",
  ].join(NL)
);

fs.writeFileSync(p, c, "utf8");
console.log("Done. Has quarterPound:", c.includes("quarterPound"));
console.log("Has isPound:", c.includes("isPound"));
