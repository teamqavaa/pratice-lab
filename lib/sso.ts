// Both apps share the localhost host, so the auth cookies set by the SSO
// portal reach pratice-lab even though it runs on a different port.
export const SSO_BASE_URL = process.env.SSO_BASE_URL ?? "http://localhost:3000"
