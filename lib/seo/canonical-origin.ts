/**
 * The one public address of the site, used in the files crawlers read
 * (sitemap.xml, robots.txt). passionseed.org redirects to www, so listing the
 * bare domain sent search engines through a redirect for every page.
 *
 * Deliberately not NEXT_PUBLIC_SITE_URL: that variable also points at
 * localhost in CI and dev, and crawler files must always name production.
 */
export const CANONICAL_ORIGIN = "https://www.passionseed.org";
