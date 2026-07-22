import { createServerClient } from '@supabase/ssr'
import { type NextRequest, type NextResponse } from 'next/server'

/**
 * Refreshes the Supabase auth session and attaches any updated auth cookies to
 * the provided response (which is produced by the next-intl middleware). This
 * keeps locale routing and Supabase sessions working together.
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Touch getUser() so Supabase can rotate the access/refresh tokens.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}
