// On Render, requests pass through Cloudflare and then Render's load balancer.
// Cloudflare appends the client address to X-Forwarded-For and the load
// balancer appends Cloudflare's edge address, so the client is two hops back.
// Trusting exactly two hops keeps a client-supplied X-Forwarded-For from
// choosing the address that rate limits are keyed on.
export const TRUSTED_PROXY_HOPS = 2;
