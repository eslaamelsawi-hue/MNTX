const fs = require("fs");
const FILE = "components/payment-buttons.tsx";
let c = fs.readFileSync(FILE, "utf8");

const tFunc = `
const t = (locale, key) => {
  const ar = {
    payWithOKX: "\u0627\u0644\u062F\u0641\u0639 \u0639\u0628\u0631 OKX",
    payWithCrypto: "\u0627\u0644\u062F\u0641\u0639 \u0628\u0627\u0644\u0639\u0645\u0644\u0627\u062A \u0627\u0644\u0631\u0642\u0645\u064A\u0629",
    loadingPayment: "\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062F\u0641\u0639\u2026",
    enterEmail: "\u0623\u062F\u062E\u0644 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062F\u0641\u0639",
    getPaymentDetails: "\u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062F\u0641\u0639",
    cancel: "\u0625\u0644\u063A\u0627\u0621",
    close: "\u0625\u063A\u0644\u0627\u0642",
    paymentConfirmed: "\u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062F\u0641\u0639!",
    network: "\u0627\u0644\u0634\u0628\u0643\u0629",
    sendExactly: "\u0623\u0631\u0633\u0644 \u0628\u0627\u0644\u0636\u0628\u0637",
    to: "\u0625\u0644\u0649",
    orderRef: "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628",
    networkFeesNotice: "\u064A\u0631\u062C\u0649 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0645\u0628\u0644\u063A + \u0631\u0633\u0648\u0645 \u0627\u0644\u0634\u0628\u0643\u0629 \u0644\u0636\u0645\u0627\u0646 \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u062F\u0641\u0639\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644.",
    sendOnlyUSDT: "\u0623\u0631\u0633\u0644 \u0641\u0642\u0637 USDT \u0639\u0644\u0649",
    wrongNetwork: "\u0634\u0628\u0643\u0629 \u062E\u0627\u0637\u0626\u0629 = \u062E\u0633\u0627\u0631\u0629 \u0627\u0644\u0623\u0645\u0648\u0627\u0644.",
    verifyPayment: "\u0644\u0642\u062F \u062F\u0641\u0639\u062A \u2014 \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062F\u0641\u0639",
    checking: "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0642\u0642\u2026",
    copied: "\u062A\u0645 \u0627\u0644\u0646\u0633\u062E!",
    copy: "\u0646\u0633\u062E",
    enterEmailContinue: "\u0623\u062F\u062E\u0644 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629",
    continueToPayment: "\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u062F\u0641\u0639",
    loading: "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644\u2026",
  };
  const en = {
    payWithOKX: "Pay with OKX",
    payWithCrypto: "Pay with Crypto",
    loadingPayment: "Loading payment details\u2026",
    enterEmail: "Enter your email to get the payment address",
    getPaymentDetails: "Get Payment Details",
    cancel: "Cancel",
    close: "Close",
    paymentConfirmed: "Payment Confirmed!",
    network: "Network",
    sendExactly: "Send exactly",
    to: "to:",
    orderRef: "Order ref",
    networkFeesNotice: "Please send the amount + network fees to ensure the full payment is received.",
    sendOnlyUSDT: "Send only USDT on",
    wrongNetwork: "Wrong network = lost funds.",
    verifyPayment: "I\u2019ve Paid \u2014 Verify Payment",
    checking: "Checking\u2026",
    copied: "Copied!",
    copy: "Copy",
    enterEmailContinue: "Enter your email to continue",
    continueToPayment: "Continue to Payment",
    loading: "Loading\u2026",
  };
  return (locale === "ar" ? ar[key] : en[key]) || en[key] || key;
};
`;

if (!c.includes("const t =")) {
  c = c.replace('import { Loader2 } from "lucide-react"', 'import { Loader2 } from "lucide-react"\n' + tFunc);
}

if (!c.includes("useLocale")) {
  c = c.replace('import { useState } from "react"', 'import { useState } from "react"\nimport { useLocale } from "next-intl"');
}

// OKX Modal strings
c = c.replace('>Pay with OKX</h3>', '>{t(locale, "payWithOKX")}</h3>');
c = c.replace(/Loading payment details\u2026/g, '{t(locale, "loadingPayment")}');
c = c.replace('>Enter your email to get the payment address</p>', '>{t(locale, "enterEmail")}</p>');
c = c.replace('>Get Payment Details<', '>{t(locale, "getPaymentDetails")}<');
c = c.replace('>Cancel</button>', '>{t(locale, "cancel")}</button>');
c = c.replace('>Payment Confirmed!</p>', '>{t(locale, "paymentConfirmed")}</p>');
c = c.replace('>Close</button>', '>{t(locale, "close")}</button>');
c = c.replace('Network: {payInfo.chain}', '{t(locale, "network")}: {payInfo.chain}');
c = c.replace('Send exactly {payInfo.amount} USDT to:', '{t(locale, "sendExactly")} {payInfo.amount} USDT {t(locale, "to")}');
c = c.replace('{copied ? "Copied!" : "Copy"}', '{copied ? t(locale, "copied") : t(locale, "copy")}');
c = c.replace('Order ref:', '{t(locale, "orderRef")}:');

// Network fees notice
c = c.replace(
  /\{locale === "ar" \? "[^"]*" : "Please send the amount \+ network fees[^"]*"\}/,
  '{t(locale, "networkFeesNotice")}'
);
c = c.replace('Please send the amount + network fees to ensure the full payment is received.', '{t(locale, "networkFeesNotice")}');

// Warning line
c = c.replace(/Send only USDT on \{payInfo\.chain\}\. Wrong network = lost funds\./g, '{t(locale, "sendOnlyUSDT")} {payInfo.chain}. {t(locale, "wrongNetwork")}');

// Verify button
c = c.replace('Checking\u2026', '{t(locale, "checking")}');
c = c.replace(/"I've Paid \u2014 Verify Payment"/g, 't(locale, "verifyPayment")');

// Second close button
c = c.replace('>Close</button>', '>{t(locale, "close")}</button>');
// Second cancel (NowPayments)
c = c.replace('>Cancel</button>', '>{t(locale, "cancel")}</button>');

// OKX button label  
c = c.replace(/>(\s*)Pay with OKX(\s*)<\/Button>/g, '>{t(locale, "payWithOKX")}</Button>');

// NowPayments modal
c = c.replace('>Pay with Crypto</h3>', '>{t(locale, "payWithCrypto")}</h3>');
c = c.replace('>Enter your email to continue</p>', '>{t(locale, "enterEmailContinue")}</p>');
c = c.replace(/"Continue to Payment"/g, 't(locale, "continueToPayment")');
c = c.replace(/"Loading\u2026"/g, 't(locale, "loading")');

// NowPayments button text
c = c.replace(/>\s*Pay with Crypto\s*<\//g, '>{t(locale, "payWithCrypto")}</');

// Add locale = useLocale() in OKXPayButton if missing
if (c.includes("export function OKXPayButton")) {
  var okxBtn = c.indexOf("export function OKXPayButton");
  var after = c.substring(okxBtn, okxBtn + 300);
  if (!after.includes("useLocale")) {
    c = c.replace(
      /export function OKXPayButton\([^)]*\)\s*\{[\s\n]*const \[open, setOpen\]/,
      function(m) { return m.replace("const [open, setOpen]", "const locale = useLocale()\n  const [open, setOpen]"); }
    );
  }
}

// Add useLocale in NowPaymentsButton if missing
if (c.includes("export function NowPaymentsButton")) {
  var npBtn = c.indexOf("export function NowPaymentsButton");
  var afterNp = c.substring(npBtn, npBtn + 300);
  if (!afterNp.includes("useLocale")) {
    c = c.replace(
      /export function NowPaymentsButton\([^)]*\)\s*\{[\s\n]*const \[open, setOpen\]/,
      function(m) { return m.replace("const [open, setOpen]", "const locale = useLocale()\n  const [open, setOpen]"); }
    );
  }
}

// Add locale in OKXPayModal if missing  
if (c.includes("function OKXPayModal")) {
  var modal = c.indexOf("function OKXPayModal");
  var afterM = c.substring(modal, modal + 500);
  if (!afterM.includes("useLocale")) {
    c = c.replace(
      /function OKXPayModal\([^)]*\)\s*\{[\s\n]*const \[email/,
      function(m) { return m.replace("const [email", "const locale = useLocale()\n  const [email"); }
    );
  }
}

// Write
fs.writeFileSync(FILE, c, "utf8");
var v = fs.readFileSync(FILE, "utf8");
console.log("DONE LEN:" + v.length);
console.log("HAS_T:" + v.includes("const t ="));
console.log("HAS_HARD:" + v.includes(">Pay with OKX<"));
console.log("T_CALLS:" + (v.match(/t\(locale/g)||[]).length);
