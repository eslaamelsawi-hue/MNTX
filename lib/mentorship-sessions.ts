/**
 * Live 1-on-1 sessions in the mentorship sold through the /apply funnel.
 * The apply page and checkout show this number, and paying grants exactly
 * this many session hours, so the promise and the grant can't drift apart.
 */
export const MENTORSHIP_SESSIONS = 7

/** An admin may grant more or fewer when approving, within this range. */
export const MENTORSHIP_SESSIONS_MAX = 24
