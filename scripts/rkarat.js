const fs = require("fs");
const p = "components/gold-page.tsx";
let c = fs.readFileSync(p, "utf8");

// Rename all variable/comment occurrences
c = c.replace(/selectedKarat/g, "selectedKerat");
c = c.replace(/setSelectedKarat/g, "setSelectedKerat");
c = c.replace(/selectKarat/g, "selectKerat");
c = c.replace(/Karat Selection/g, "Kerat Selection");

fs.writeFileSync(p, c, "utf8");
console.log("Karat remaining:", (c.match(/[Kk]arat/gi)||[]).length);
console.log("Kerat count:", (c.match(/[Kk]erat/gi)||[]).length);

