// Central place for "the app lives on the app subdomain in production".
// On https://bebetter.websters.at (apex, landing only) auth links point at
// https://app.bebetter.websters.at. Everywhere else (dev, preview, the app
// domain itself) relative links keep working.
const APEX_PROD_HOST = 'bebetter.websters.at'
const APP_PROD_HOST = 'app.bebetter.websters.at'

export function isApexProd() {
  return typeof window !== 'undefined' && window.location.hostname === APEX_PROD_HOST
}

export function isAppProd() {
  return typeof window !== 'undefined' && window.location.hostname === APP_PROD_HOST
}

// Routes that live on the apex host. Everything else belongs to the app.
const APEX_ROUTES = ['/', '/landing', '/privacy', '/terms', '/imprint']

export function needsAppHost(path) {
  return !APEX_ROUTES.includes(path)
}

export function appUrl(path = '/') {
  const p = path.startsWith('/') ? path : `/${path}`
  if (isApexProd()) return `https://${APP_PROD_HOST}${p}`
  return p
}

export { APP_PROD_HOST }
