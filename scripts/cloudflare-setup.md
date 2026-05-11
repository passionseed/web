# Cloudflare Free Tier Setup for PassionSeed

This documents the Cloudflare configuration needed alongside Vercel hosting to reduce costs
via CDN caching, free Web Analytics, and optimized asset delivery.

## Prerequisites

- Cloudflare account with `passionseed.org` zone added
- DNS proxied through Cloudflare (orange cloud)
- Cloudflare API token with Zone.Cache Rules, Zone.Web Analytics permissions

## 1. Cloudflare Web Analytics (Free)

1. Go to [Cloudflare Dashboard → Web Analytics](https://dash.cloudflare.com/?to=/:account/web-analytics)
2. **Add a site** → enter `passionseed.org` hostname
3. Copy the JS beacon token
4. Add to Vercel environment: `NEXT_PUBLIC_CF_BEACON_TOKEN=<token>`
5. The beacon is auto-injected by `app/layout.tsx`

## 2. Cache Rules (Free tier: up to 10 rules)

Go to [Cloudflare Dashboard → Cache → Cache Rules](https://dash.cloudflare.com/?to=/:account/:zone/cache/rules)

### Rule 1: Static Assets (immutable)
- **When**: URI path matches `/_next/static/*`
- **Cache status**: Eligible for cache
- **Edge Cache TTL**: Override to 1 year (`31536000`)
- **Browser Cache TTL**: Override to 1 year (`31536000`)

### Rule 2: API GET Requests
- **When**: URI path starts with `/api/` AND request method is `GET`
- **Cache status**: Eligible for cache
- **Edge Cache TTL**: Override to 1 hour (`3600`)
- **Bypass cache on cookie**: Enabled (respects auth cookies)

### Rule 3: CDN Images
- **When**: Hostname equals `cdn.passionseed.org`
- **Cache status**: Eligible for cache
- **Edge Cache TTL**: Override to 1 year (`31536000`)
- **Browser Cache TTL**: Override to 1 year (`31536000`)

### Rule 4: Font Files
- **When**: URI path ends with `.woff` or `.woff2`
- **Cache status**: Eligible for cache
- **Edge Cache TTL**: Override to 1 year (`31536000`)
- **Browser Cache TTL**: Override to 1 year (`31536000`)

### Rule 5: Image Assets
- **When**: URI path ends with `.png`, `.jpg`, `.webp`, `.svg`, `.avif` (excluding `/api/` and `/_next/`)
- **Cache status**: Eligible for cache
- **Edge Cache TTL**: Override to 30 days (`2592000`)
- **Browser Cache TTL**: Override to 7 days (`604800`)

## 3. Cloudflare Settings

### Speed Optimization
Go to [Speed → Optimization](https://dash.cloudflare.com/?to=/:account/:zone/speed/optimization)

- **Auto Minify**: Enable for JavaScript, CSS, HTML
- **Brotli**: Enabled
- **Early Hints**: Enabled
- **Rocket Loader**: OFF (breaks Next.js)

### Caching → Configuration
Go to [Caching → Configuration](https://dash.cloudflare.com/?to=/:account/:zone/caching/configuration)

- **Caching Level**: Standard
- **Browser Cache TTL**: Respect Existing Headers

### Network
Go to [Network](https://dash.cloudflare.com/?to=/:account/:zone/network)

- **HTTP/2**: Enabled
- **HTTP/3 (with QUIC)**: Enabled
- **0-RTT Connection Resumption**: Enabled
- **IPv6 Compatibility**: Enabled
- **gRPC**: Enabled
- **WebSockets**: Enabled
- **Onion Routing**: Enabled
- **IP Geolocation**: Enabled

## 4. DNS Records

Ensure the following DNS records are proxied (orange cloud):

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `@` | `cname.vercel-dns.com` | Proxied |
| CNAME | `www` | `cname.vercel-dns.com` | Proxied |
| CNAME | `cdn` | `f005.backblazeb2.com` | Proxied |

## 5. SSL/TLS

Go to [SSL/TLS → Overview](https://dash.cloudflare.com/?to=/:account/:zone/ssl-tls)

- **SSL/TLS Encryption Mode**: Full (strict)
- **Always Use HTTPS**: Enabled
- **Minimum TLS Version**: 1.2

## 6. Verification

After setup, verify with:

```bash
# Check cache headers
curl -sI https://passionseed.org/api/version | grep -i cf-cache-status

# Check static asset caching
curl -sI https://passionseed.org/_next/static/chunks/main.js | grep -i cf-cache-status

# Check CDN image caching
curl -sI https://cdn.passionseed.org/file/pseed-dev/some-image.webp | grep -i cf-cache-status
```

Expected: `cf-cache-status: HIT` on second request.
