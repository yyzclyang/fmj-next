export function isDev(): boolean {
  return import.meta.env.DEV;
}

export function getRootDomain(): string {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return hostname;
  const parts = hostname.split('.');
  return parts.slice(-2).join('.');
}

export const ROOT_DOMAIN = getRootDomain();
export const BASE_URL = isDev() ? '' : `https://api.${ROOT_DOMAIN}`;
export const R2_STATIC_BASE_URL = `https://static.r2.oss.${ROOT_DOMAIN}`;
