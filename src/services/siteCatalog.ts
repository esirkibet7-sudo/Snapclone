import sites from '../../assets/snaptube/full_sites.json';

export type SnapTubeSite = { title: string; url: string; largeIconUrl?: string; smallIconUrl?: string };
export const supportedSites = sites as SnapTubeSite[];
export function findSupportedSite(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return supportedSites.find(site => new URL(site.url).hostname.replace(/^www\./, '').toLowerCase() === host);
  } catch { return undefined; }
}
