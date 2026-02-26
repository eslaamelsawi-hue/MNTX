const fs = require("fs");

// Fix en.json
const enPath = "messages/en.json";
let en = fs.readFileSync(enPath, "utf8");
en = en.replace(/Troy Ounce/g, "Ounce");
en = en.replace(/Karat/g, "Kerat");
en = en.replace(/karat/g, "kerat");
fs.writeFileSync(enPath, en, "utf8");
console.log("en.json: Troy Ounce count:", (en.match(/Troy Ounce/g)||[]).length, "Karat count:", (en.match(/Karat/gi)||[]).length);

// Fix ar.json
const arPath = "messages/ar.json";
let ar = fs.readFileSync(arPath, "utf8");
ar = ar.replace(/Troy Ounce/g, "Ounce");
ar = ar.replace(/Karat/g, "Kerat");
ar = ar.replace(/karat/g, "kerat");
fs.writeFileSync(arPath, ar, "utf8");
console.log("ar.json: Troy Ounce count:", (ar.match(/Troy Ounce/g)||[]).length, "Karat count:", (ar.match(/Karat/gi)||[]).length);

// Verify
console.log("en has Ounce:", en.includes('"Ounce"'));
console.log("en has Kerat:", en.includes('Kerat'));
