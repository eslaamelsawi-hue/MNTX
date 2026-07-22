"use client"

import { useState } from "react"
import { Menu, X, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { NavAuth } from "@/components/auth/nav-auth"
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export function Navbar() {
  const [open, setOpen] = useState(false)
  const t = useTranslations('navbar')

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-4 sm:px-10 lg:px-16 md:grid md:grid-cols-[1fr_auto_1fr]">
        {/* Left: logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-foreground tracking-tight md:justify-self-start">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t('brand')}
        </Link>

        {/* Center: nav links */}
        <div className="hidden items-center justify-center gap-6 md:flex">
          <Link href="/tools" className="text-sm font-medium text-foreground transition-colors hover:text-primary">
            {t('tools')}
          </Link>
          <Link href="/crypto" className="text-sm font-medium text-foreground transition-colors hover:text-primary">
            {t('crypto')}
          </Link>
          <Link href="/funded-challenge" className="text-sm font-medium text-foreground transition-colors hover:text-primary">
            {t('fundedChallenge')}
          </Link>
        </div>

        {/* Right: auth + language + join discord */}
        <div className="hidden items-center gap-4 md:flex md:justify-self-end">
          <NavAuth />
          <LanguageSwitcher />
          <Button asChild size="sm">
            <a href="https://discord.gg/MKysYbcnYW" target="_blank" rel="noopener noreferrer">{t('joinDiscord')}</a>
          </Button>
        </div>

        <button
          type="button"
          className="text-foreground md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-3 pt-3">
            <Link href="/tools"
              className="text-sm font-medium text-foreground transition-colors hover:text-primary"
              onClick={() => setOpen(false)}
            >
              {t('tools')}
            </Link>
            <Link href="/crypto"
              className="text-sm font-medium text-foreground transition-colors hover:text-primary"
              onClick={() => setOpen(false)}
            >
              {t('crypto')}
            </Link>
            <Link
              href="/funded-challenge"
              className="text-sm font-medium text-foreground transition-colors hover:text-primary"
              onClick={() => setOpen(false)}
            >
              {t('fundedChallenge')}
            </Link>
            <NavAuth onNavigate={() => setOpen(false)} />
            <LanguageSwitcher />
            <Button asChild size="sm" className="w-full">
              <a href="https://discord.gg/MKysYbcnYW" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>{t('joinDiscord')}</a>
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}