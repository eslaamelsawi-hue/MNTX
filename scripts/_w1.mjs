import { writeFileSync } from "fs";
const target = "C:\\Users\\ikloo\\OneDrive\\Desktop\\mentixz\\components\\payment-buttons.tsx";
const content = "use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

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
}
;
writeFileSync(target, content, "utf8");
console.log("DONE - part 1");