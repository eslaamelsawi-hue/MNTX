const fs = require("fs");
const path = "components/gold-page.tsx";
let c = fs.readFileSync(path, "utf8");
const NL = "\r\n";

c = c.replace(
  "  Info," + NL + "} from \"lucide-react\"",
  "  Info," + NL + "  Calculator," + NL + "  ArrowRightLeft," + NL + "} from \"lucide-react\""
);

c = c.replace(
  "import { useTranslations } from \"next-intl\"",
  "import { useTranslations } from \"next-intl\"" + NL + "import { Input } from \"@/components/ui/input\"" + NL + "import { Label } from \"@/components/ui/label\""
);

c = c.replace(
  "import { useState, useEffect } from \"react\"",
  "import { useState, useEffect, useMemo } from \"react\""
);

fs.writeFileSync(path, c, "utf8");
console.log("Done. Has Calculator:", c.includes("Calculator"));
console.log("Has Input:", c.includes("@/components/ui/input"));
console.log("Has useMemo:", c.includes("useMemo"));

