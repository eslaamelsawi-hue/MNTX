const fs = require('fs');
let c = fs.readFileSync('components/gold-pro-page.tsx', 'utf8');

// 1. Change default currency from USD to KWD
c = c.replace(
  'const [currency, setCurrency] = useState<Currency>("USD")',
  'const [currency, setCurrency] = useState<Currency>("KWD")'
);

// 2. Add Calculator import  
c = c.replace(
  "import { useTranslations } from \"next-intl\"",
  "import { useTranslations } from \"next-intl\"\nimport { Label } from \"@/components/ui/label\""
);

console.log('Step 1 done: default currency + Label import');
fs.writeFileSync('components/gold-pro-page.tsx', c, 'utf8');
console.log('Saved');
