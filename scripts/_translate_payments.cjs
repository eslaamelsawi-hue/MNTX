// Script to add Arabic translations to payment-buttons.tsx
// Uses Unicode escapes so no Arabic chars need to pass through PowerShell
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "components", "payment-buttons.tsx");
let c = fs.readFileSync(FILE, "utf8");

// Step 1: Insert the t() function after the Loader2 import if not already there
if (!c.includes("const t =")) {
  const tFunc = `

const t = (locale: string, key: string) => {
  const ar: Record<string, string> = {
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
  }
  const en: Record<string, string> = {
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
    verifyPayment: "I've Paid \u2014 Verify Payment",
    checking: "Checking\u2026",
    copied: "Copied!",
    copy: "Copy",
    enterEmailContinue: "Enter your email to continue",
    continueToPayment: "Continue to Payment",
    loading: "Loading\u2026",
  }
  return (locale === "ar" ? ar[key] : en[key]) || en[key] || key
}`;
  c = c.replace(
    'import { Loader2 } from "lucide-react"',
    'import { Loader2 } from "lucide-react"' + tFunc
  );
}

// Step 2: Add useLocale import if not present
if (!c.includes("useLocale")) {
  c = c.replace(
    'import { useState } from "react"',
    'import { useState } from "react"\nimport { useLocale } from "next-intl"'
  );
}

// Step 3: Add locale variable in OKXPayButton if not there
if (!c.includes("const locale = useLocale()") || c.split("const locale = useLocale()").length < 3) {
  // Make sure OKXPayButton has locale
  c = c.replace(
    /export function OKXPayButton\([\s\S]*?\{\s*\n\s*const \[open, setOpen\]/,
    (match) => {
      if (!match.includes("useLocale")) {
        return match.replace(
          "const [open, setOpen]",
          "const locale = useLocale()\n  const [open, setOpen]"
        );
      }
      return match;
    }
  );
}

// Step 4: Add locale in NowPaymentsButton if not there
if (c.includes("export function NowPaymentsButton")) {
  const nowPayIdx = c.indexOf("export function NowPaymentsButton");
  const afterNow = c.substring(nowPayIdx);
  if (!afterNow.substring(0, 500).includes("useLocale")) {
    c = c.replace(
      /export function NowPaymentsButton\([\s\S]*?\{\s*\n\s*const \[open, setOpen\]/,
      (match) => match.replace(
        "const [open, setOpen]",
        "const locale = useLocale()\n  const [open, setOpen]"
      )
    );
  }
}

// Step 5: Replace OKX Modal hardcoded strings
// Title
c = c.replace('>Pay with OKX</h3>', '>{t(locale, "payWithOKX")}</h3>');
// Loading text
c = c.replace(/Loading payment details\u2026/g, '{t(locale, "loadingPayment")}');
c = c.replace('Loading payment details…', '{t(locale, "loadingPayment")}');
// Replace remaining inline text in the modal - need to handle various patterns
c = c.replace(
  /<Loader2 className="mr-2 h-5 w-5 animate-spin" \/> \{t\(locale, "loadingPayment"\)\}/,
  '<Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t(locale, "loadingPayment")}'
);

// Enter email text  
c = c.replace(
  '>Enter your email to get the payment address</p>',
  '>{t(locale, "enterEmail")}</p>'
);
c = c.replace(
  /Enter your email to get the payment address/g,
  '{t(locale, "enterEmail")}'
);

// Get Payment Details button
c = c.replace(
  />(\s*)Get Payment Details(\s*)<\/Button>/,
  '>{t(locale, "getPaymentDetails")}</Button>'
);
c = c.replace('Get Payment Details', '{t(locale, "getPaymentDetails")}');

// Cancel buttons
c = c.replace(/>Cancel<\/button>/g, '>{t(locale, "cancel")}</button>');

// Close buttons
c = c.replace(/>Close<\/button>/g, '>{t(locale, "close")}</button>');

// Payment Confirmed
c = c.replace('>Payment Confirmed!</p>', '>{t(locale, "paymentConfirmed")}</p>');

// Network label
c = c.replace('Network: {payInfo.chain}', '{t(locale, "network")}: {payInfo.chain}');

// Send exactly ... to:
c = c.replace(
  'Send exactly {payInfo.amount} USDT to:',
  '{t(locale, "sendExactly")} {payInfo.amount} USDT {t(locale, "to")}'
);

// Copy/Copied buttons
c = c.replace(
  '{copied ? "Copied!" : "Copy"}',
  '{copied ? t(locale, "copied") : t(locale, "copy")}'
);

// Order ref
c = c.replace('Order ref:', '{t(locale, "orderRef")}:');

// Network fees notice - handle both the old inline conditional and plain text
c = c.replace(
  /\{locale === "ar" \? "[^"]*" : "Please send the amount \+ network fees[^"]*"\}/,
  '{t(locale, "networkFeesNotice")}'
);
c = c.replace(
  'Please send the amount + network fees to ensure the full payment is received.',
  '{t(locale, "networkFeesNotice")}'
);

// Send only USDT warning
c = c.replace(
  /Send only USDT on \{payInfo\.chain\}\. Wrong network = lost funds\./,
  '{t(locale, "sendOnlyUSDT")} {payInfo.chain}. {t(locale, "wrongNetwork")}'
);

// Verify payment button
c = c.replace(
  'Checking…',
  '{t(locale, "checking")}'
);
c = c.replace(
  '"I\'ve Paid — Verify Payment"',
  't(locale, "verifyPayment")'
);
c = c.replace(
  `"I've Paid \\u2014 Verify Payment"`,
  't(locale, "verifyPayment")'
);

// OKX Pay Button label
c = c.replace(
  />\s*Pay with OKX\s*<\/Button>/,
  '>{t(locale, "payWithOKX")}</Button>'
);

// NowPayments modal strings
c = c.replace('>Pay with Crypto</h3>', '>{t(locale, "payWithCrypto")}</h3>');
c = c.replace('>Enter your email to continue</p>', '>{t(locale, "enterEmailContinue")}</p>');
c = c.replace(
  '"Continue to Payment"',
  't(locale, "continueToPayment")'
);
c = c.replace(
  '"Loading…"',
  't(locale, "loading")'
);

// NowPayments button label
c = c.replace(
  />\s*Pay with Crypto\s*<\/>/,
  '>{t(locale, "payWithCrypto")}</>'
);
// Alternative pattern for button text
if (c.includes("Pay with Crypto")) {
  c = c.replace(/Pay with Crypto/g, '{t(locale, "payWithCrypto")}');
}

// Loading… in NowPayments
if (c.includes("Loading…") || c.includes("Loading\u2026")) {
  c = c.replace(/Loading\u2026/g, '{t(locale, "loading")}');
  c = c.replace(/Loading…/g, '{t(locale, "loading")}');
}

// Write result
fs.writeFileSync(FILE, c, "utf8");

// Verify
const v = fs.readFileSync(FILE, "utf8");
console.log("File written, length:", v.length);
console.log("Has t():", v.includes("const t ="));
console.log("Has hardcoded 'Pay with OKX':", v.includes(">Pay with OKX<"));
console.log("Has hardcoded 'Cancel':", v.includes(">Cancel<"));
console.log("Has t(locale calls:", (v.match(/t\(locale/g) || []).length);
