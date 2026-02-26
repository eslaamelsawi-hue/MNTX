const fs = require("fs");
const path = "components/gold-page.tsx";
let c = fs.readFileSync(path, "utf8");

// Fix imports
c = c.replace(
  'import { useState, useEffect } from "react"',
  'import { useState, useEffect, useMemo } from "react"'
);
c = c.replace(
  "  Info,\n} from \"lucide-react\"",
  "  Info,\n  Calculator,\n  ArrowRightLeft,\n} from \"lucide-react\""
);
c = c.replace(
  'import { useTranslations } from "next-intl"',
  'import { useTranslations } from "next-intl"\nimport { Input } from "@/components/ui/input"\nimport { Label } from "@/components/ui/label"'
);
c = c.replace(
  'const t = useTranslations("gold")',
  'const t = useTranslations("gold")\n  const tc = useTranslations("ingotCalc")'
);

fs.writeFileSync(path, c, "utf8");
console.log("Step 1 done. Has Calculator:", c.includes("Calculator"));
console.log("Has tc:", c.includes('tc = useTranslations'));
