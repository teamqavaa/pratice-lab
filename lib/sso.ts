// Both apps share the localhost host, so the auth cookies set by the SSO
// portal reach pratice-lab even though it runs on a different port.
export const SSO_BASE_URL = process.env.SSO_BASE_URL ?? "http://localhost:3000"

// Client-available copy of the portal origin. The portal (qi-sso-front) owns
// the student shell pages (Home, Dashboard, My Labs), so breadcrumbs link to
// it as absolute URLs. It must be a NEXT_PUBLIC_ var to be inlined client-side.
export const NEXT_PUBLIC_SSO_BASE_URL =
  process.env.NEXT_PUBLIC_SSO_BASE_URL ?? "http://localhost:3001"
