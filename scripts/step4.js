const fs = require("fs");

// Add ingotCalc to en.json
const enPath = "messages/en.json";
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
en.ingotCalc = {
  title: "Gold Ingot Calculator",
  subtitle: "Calculate the price of gold ingots by karat and weight",
  selectKarat: "Select Karat",
  pure: "(Pure)",
  selectWeight: "Select Weight",
  customWeightPlaceholder: "Custom weight",
  gold: "Gold",
  pricePerGram: "Price per gram",
  pricePerGramUSD: "Price per gram (USD)",
  totalPriceEGP: "Total Price (EGP)",
  totalPriceUSD: "Total Price (USD)",
  karat: "Karat",
  priceEGP: "Price (EGP)",
  priceUSD: "Price (USD)"
};
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
console.log("en.json updated. Has ingotCalc:", JSON.parse(fs.readFileSync(enPath, "utf8")).ingotCalc !== undefined);

// Add ingotCalc to ar.json
const arPath = "messages/ar.json";
const ar = JSON.parse(fs.readFileSync(arPath, "utf8"));
ar.ingotCalc = {
  title: "\u062D\u0627\u0633\u0628\u0629 \u0633\u0628\u0627\u0626\u0643 \u0627\u0644\u0630\u0647\u0628",
  subtitle: "\u0627\u062D\u0633\u0628 \u0633\u0639\u0631 \u0633\u0628\u0627\u0626\u0643 \u0627\u0644\u0630\u0647\u0628 \u062D\u0633\u0628 \u0627\u0644\u0639\u064A\u0627\u0631 \u0648\u0627\u0644\u0648\u0632\u0646",
  selectKarat: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0639\u064A\u0627\u0631",
  pure: "(\u0646\u0642\u064A)",
  selectWeight: "\u0627\u062E\u062A\u0631 \u0627\u0644\u0648\u0632\u0646",
  customWeightPlaceholder: "\u0648\u0632\u0646 \u0645\u062E\u0635\u0635",
  gold: "\u0630\u0647\u0628",
  pricePerGram: "\u0633\u0639\u0631 \u0627\u0644\u062C\u0631\u0627\u0645",
  pricePerGramUSD: "\u0633\u0639\u0631 \u0627\u0644\u062C\u0631\u0627\u0645 (\u062F\u0648\u0644\u0627\u0631)",
  totalPriceEGP: "\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A (\u062C\u0646\u064A\u0647)",
  totalPriceUSD: "\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A (\u062F\u0648\u0644\u0627\u0631)",
  karat: "\u0627\u0644\u0639\u064A\u0627\u0631",
  priceEGP: "\u0627\u0644\u0633\u0639\u0631 (\u062C\u0646\u064A\u0647)",
  priceUSD: "\u0627\u0644\u0633\u0639\u0631 (\u062F\u0648\u0644\u0627\u0631)"
};
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2) + "\n", "utf8");
console.log("ar.json updated. Has ingotCalc:", JSON.parse(fs.readFileSync(arPath, "utf8")).ingotCalc !== undefined);
