import { Alexandria } from "next/font/google"

/** Shared with app/[locale]/layout.tsx's instance — Next dedupes identical
 *  next/font/google configs, so this doesn't double-load the font. Exported
 *  separately so client components (like the /apply funnel) can force the
 *  Arabic display face regardless of which locale segment they're mounted
 *  under. */
export const alexandria = Alexandria({ subsets: ["arabic", "latin"] })
