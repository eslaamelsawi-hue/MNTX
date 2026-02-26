const fs = require("fs");

// Update en.json
const enPath = "messages/en.json";
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
en.ingotCalc.onePound = "1 Pound (8g)";
en.ingotCalc.halfPound = "1/2 Pound (4g)";
en.ingotCalc.quarterPound = "1/4 Pound (2g)";
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
console.log("en.json updated:", en.ingotCalc.onePound);

// Update ar.json
const arPath = "messages/ar.json";
const ar = JSON.parse(fs.readFileSync(arPath, "utf8"));
ar.ingotCalc.onePound = "\u062C\u0646\u064A\u0647 (8\u062C)";
ar.ingotCalc.halfPound = "\u0646\u0635 \u062C\u0646\u064A\u0647 (4\u062C)";
ar.ingotCalc.quarterPound = "\u0631\u0628\u0639 \u062C\u0646\u064A\u0647 (2\u062C)";
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2) + "\n", "utf8");
console.log("ar.json updated:", ar.ingotCalc.onePound);
