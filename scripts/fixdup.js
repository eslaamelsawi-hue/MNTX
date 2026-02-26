const fs = require("fs");
const p = "components/gold-page.tsx";
let c = fs.readFileSync(p, "utf8");
const NL = "\r\n";

// Remove duplicate Input/Label imports (keep first occurrence)
const inputImport = 'import { Input } from "@/components/ui/input"';
const labelImport = 'import { Label } from "@/components/ui/label"';

// Find first occurrence position, then remove all subsequent ones
let firstInput = c.indexOf(inputImport);
let firstLabel = c.indexOf(labelImport);

// Remove all occurrences after the first
let pos = firstInput + inputImport.length;
while (true) {
  let next = c.indexOf(inputImport, pos);
  if (next === -1) break;
  // Remove this occurrence and trailing newline
  let end = next + inputImport.length;
  if (c.substring(end, end + 2) === NL) end += 2;
  else if (c[end] === "\n") end += 1;
  c = c.substring(0, next) + c.substring(end);
}

pos = firstLabel + labelImport.length;
while (true) {
  let next = c.indexOf(labelImport, pos);
  if (next === -1) break;
  let end = next + labelImport.length;
  if (c.substring(end, end + 2) === NL) end += 2;
  else if (c[end] === "\n") end += 1;
  c = c.substring(0, next) + c.substring(end);
}

fs.writeFileSync(p, c, "utf8");
console.log("Done. Input count:", (c.match(/import { Input }/g) || []).length);
console.log("Label count:", (c.match(/import { Label }/g) || []).length);
