// Vercel Edge Middleware — pre-launch password gate.
//
// Protects the WHOLE site with HTTP Basic Auth, but ONLY when a `SITE_PASSWORD`
// environment variable is set. This makes launch a one-click switch:
//   • Pre-launch  → set SITE_PASSWORD on the env → site is gated.
//   • Go live     → delete SITE_PASSWORD from the Production scope → prod is public.
//                   (Keep it on the Preview scope to keep staging private.)
//
// Username defaults to "airluxo" and can be overridden with SITE_USER.
// Runs at the edge, before any page/asset is served, so the app bundle stays hidden.

export const config = {
  // Gate every path EXCEPT Vercel internals and the favicon.
  matcher: ['/((?!_vercel|favicon.ico).*)'],
}

export default function middleware(request) {
  const password = process.env.SITE_PASSWORD
  // No password configured → site is public (this is the launch state).
  if (!password) return

  const user = process.env.SITE_USER || 'airluxo'
  const expected = 'Basic ' + btoa(`${user}:${password}`)
  const provided = request.headers.get('authorization')

  if (provided === expected) return // authorised → continue to the app

  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="AIRLUXO — private preview", charset="UTF-8"',
    },
  })
}
