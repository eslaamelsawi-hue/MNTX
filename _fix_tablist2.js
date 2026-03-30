const fs = require("fs");
let c = fs.readFileSync("components/admin-dashboard.tsx", "utf8");
const oldTab = '<TabsList className="bg-muted">';
const newTab = '<TabsList className="bg-muted flex flex-wrap h-auto gap-1">';
if (c.includes(oldTab)) {
  c = c.replace(oldTab, newTab);
  fs.writeFileSync("components/admin-dashboard.tsx", c, "utf8");
  console.log("Replaced. New size:", fs.statSync("components/admin-dashboard.tsx").size);
} else if (c.includes(newTab)) {
  console.log("Already fixed.");
} else {
  console.log("Pattern not found. Searching...");
  const m = c.match(/TabsList className="[^"]*"/);
  console.log("Found:", m ? m[0] : "none");
}
