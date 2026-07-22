/**
 * Academy-wide constants. Course *content* now lives in the store
 * (lib/course-store.ts); this file only holds access-plan constants shared by
 * client and server.
 */

/** The plan admins grant to give someone academy access. */
export const COURSE_GRANT_PLAN = "mntx-elite"

/** Any of these plans (as an admin grant or paid order) unlocks the academy. */
export const ACADEMY_ACCESS_PLANS = ["mntx-elite", "starter", "coaching"]
