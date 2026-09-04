// Central place for "the app lives on the app subdomain in production".
// On https://bebetter.websters.at (apex, landing only) auth links point at
// https://app.bebetter.websters.at. Everywhere else (dev, preview, the app
// domain itself) relative links keep working.
const APEX_PROD_HOST = 'bebetter.websters.at'
const APP_PROD_HOST = 'app.bebetter.websters.at'

export function isApexProd() {
  return typeof window !== 'undefined' && window.location.hostname === APEX_PROD_HOST
}

export function appUrl(path = '/') {
  const p = path.startsWith('/') ? path : `/${path}`
  if (isApexProd()) return `https://${APP_PROD_HOST}${p}`
  return p
}
