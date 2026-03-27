const fs = require('fs');
let f = fs.readFileSync('components/gold-pro-page.tsx', 'utf8');

classify = function replaceAll(f, old, newS) { while (f.includes(old)) f = f.replace(old, newS); return f; }

// 1. Import
if (!f.includes('IngotCalculator')) {
  f = f.replace('"use client"\r\n', '"use client"\r\nimport { IngotCalculator } from "@/components/ingot-calculator"\r\n');
  console.log('added import');
}

// 2. Remove useMemo
f = f.replace('import { useState, useEffect, useMemo } from "react"', 'import { useState, useEffect } from "react"');

// 3. Remove Calculator from lucide
f = f.replace('  ChevronsUpDown,\r\n  Calculator,\r\n} from "lucide-react"', '  ChevronsUpDown,\r\n} from "lucide-react"');

// 4. Remove calc state vars
f = f.replace('  const [calcKarat, setCalcKarat] = useState(21)\r\n  const [calcWeight, setCalcWeight] = useState(8)\r\n  const [calcCustom, setCalcCustom] = useState("")\r\n  const [currency', '  const [currency');

// 5. Refine - remove standardWeights + calcResults
// Find them dynamically
const swStart = f.indexOf('  const standardWeights = [');
const swEnd = f.indexOf('], [data, calcKarat, calcWeight]);\r\n') + '], [data, calcKarat, calcWeight]);\r\n'.length;
if (swStart !== -1 && swEnd > swStart) {
  f = f.slice(0, swStart) + f.slice(swEnd);
  console.log('removed standardWeights+results');
} else {
  console.log('standardWeights not found at', swStart);
}

// 6. Replace JSX block
const MSTART = '          {/* Gold Calculator - Free Access */}';
const MEND = '          </div>\r\n          {!hasAccess ?';
const s = f.indexOf(MSTART);
const e = f.indexOf(MEND);
console.log('JSX s', s, 'e', e);
if (s === -1 || e === -1) { console.error('markers missing'); process.exit(1); }
f = f.slice(0, s) + '          <IngotCalculator />\r\n\r\n          {!hasAccess ?' + f.slice(e + MEND.length);

fs.writeFileSync('components/gold-pro-page.tsx', f, 'utf8');
console.log('Done! len:', f.length);
