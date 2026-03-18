"use client"

import { useTranslations } from 'next-intl'

export function Footer() {
  const t = useTranslations('footer')

  return (
    <footer className="border-t border-border px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">
        Mentix Trading &copy; {new Date().getFullYear()} {t('rights')}
      </p>
    </footer>
  )
}
