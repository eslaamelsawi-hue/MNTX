const fs = require("fs");

let en = fs.readFileSync("messages/en.json", "utf8");
let ar = fs.readFileSync("messages/ar.json", "utf8");

// Add 3 new keys to EN after errorBooking
en = en.replace(
  '"errorBooking": "Failed to book the session. Please try again."',
  '"errorBooking": "Failed to book the session. Please try again.",\n    "verifyingEmail": "Verifying your subscription...",\n    "hoursAvailable": "You have {hours} mentorship hours remaining.",\n    "noHoursError": "You don\u0027t have mentorship hours. Please purchase a plan to book sessions."'
);

// Add 3 new keys to AR after errorBooking
const arOld = '"errorBooking": "\u0641\u0634\u0644 \u0641\u064a \u062d\u062c\u0632 \u0627\u0644\u062c\u0644\u0633\u0629. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649."';
const arNew = '"errorBooking": "\u0641\u0634\u0644 \u0641\u064a \u062d\u062c\u0632 \u0627\u0644\u062c\u0644\u0633\u0629. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.",\n    "verifyingEmail": "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0634\u062a\u0631\u0627\u0643\u0643...",\n    "hoursAvailable": "\u0644\u062f\u064a\u0643 {hours} \u0633\u0627\u0639\u0627\u062a \u0625\u0631\u0634\u0627\u062f \u0645\u062a\u0628\u0642\u064a\u0629.",\n    "noHoursError": "\u0644\u064a\u0633 \u0644\u062f\u064a\u0643 \u0633\u0627\u0639\u0627\u062a \u0625\u0631\u0634\u0627\u062f. \u064a\u0631\u062c\u0649 \u0634\u0631\u0627\u0621 \u062e\u0637\u0629 \u0644\u062d\u062c\u0632 \u0627\u0644\u062c\u0644\u0633\u0627\u062a."';
ar = ar.replace(arOld, arNew);

fs.writeFileSync("messages/en.json", en);
fs.writeFileSync("messages/ar.json", ar);
console.log("en:", fs.statSync("messages/en.json").size);
console.log("ar:", fs.statSync("messages/ar.json").size);
console.log("en ok:", en.includes("hoursAvailable"));
console.log("ar ok:", ar.includes("hoursAvailable"));