import { lookup as dnsLookup } from 'node:dns';
import { isIP } from 'node:net';
import { Agent, fetch as undiciFetch } from 'undici';

export class UnsafeUrlError extends Error { }

const ALLOWED_PORTS = new Set(['', '80', '443']);
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;

function ipv4ToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function inV4Range(ip: string, base: string, bits: number): boolean {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

const PRIVATE_V4: [string, number][] = [
    ['0.0.0.0', 8],        // "this" network
    ['10.0.0.0', 8],       // private
    ['100.64.0.0', 10],    // carrier-grade NAT
    ['127.0.0.0', 8],      // loopback
    ['169.254.0.0', 16],   // link-local, incl. the 169.254.169.254 cloud metadata server
    ['172.16.0.0', 12],    // private
    ['192.0.0.0', 24],     // IETF protocol assignments
    ['192.168.0.0', 16],   // private
    ['198.18.0.0', 15],    // benchmarking
    ['224.0.0.0', 3],      // multicast + reserved, up to 255.255.255.255
];

/** True for any address the audit must never connect to: loopback, private, link-local, metadata, etc. */
export function isPrivateAddress(ip: string): boolean {
    const version = isIP(ip);
    if (version === 4) {
        return PRIVATE_V4.some(([base, bits]) => inV4Range(ip, base, bits));
    }
    if (version === 6) {
        const lower = ip.toLowerCase();
        const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
        if (mapped) return isPrivateAddress(mapped[1]);
        if (lower === '::' || lower === '::1') return true;
        const firstHextet = parseInt(lower.split(':')[0] || '0', 16);
        if ((firstHextet & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
        if ((firstHextet & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
        if ((firstHextet & 0xff00) === 0xff00) return true; // ff00::/8 multicast
        return false;
    }
    return true; // not a parseable IP at all: refuse rather than guess
}

type Resolver = (hostname: string) => Promise<string[]>;

const defaultResolve: Resolver = (hostname) =>
    new Promise((resolve, reject) =>
        dnsLookup(hostname, { all: true }, (err, addresses) =>
            err ? reject(err) : resolve(addresses.map((a) => a.address))));

/** Throws unless `url` is plain http(s) on a standard port and every address it resolves to is public. */
export async function assertPublicUrl(url: string, resolve: Resolver = defaultResolve): Promise<URL> {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new UnsafeUrlError(`Not a valid URL: ${url}`);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new UnsafeUrlError(`Only http(s) URLs can be audited, got ${parsed.protocol}`);
    }
    if (parsed.username || parsed.password) {
        throw new UnsafeUrlError('URLs with embedded credentials are not audited');
    }
    if (!ALLOWED_PORTS.has(parsed.port)) {
        throw new UnsafeUrlError(`Port ${parsed.port} is not audited`);
    }

    const host = parsed.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(host) ? [host] : await resolve(host);
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
        throw new UnsafeUrlError(`Refusing to fetch ${parsed.hostname}: it resolves to a private or internal address`);
    }
    return parsed;
}

// Re-checks the address at connect time, so a hostname whose DNS answer flips
// to an internal IP between our check and the real request still gets blocked.
const guardedAgent = new Agent({
    connect: {
        lookup: (hostname, options, callback) => {
            dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
                if (err) return callback(err, '', 0);
                const list = addresses as { address: string; family: number }[];
                const bad = list.find((a) => isPrivateAddress(a.address));
                if (bad) return callback(new Error(`Blocked connection to internal address ${bad.address}`), '', 0);
                if ((options as { all?: boolean }).all) return (callback as any)(null, list);
                callback(null, list[0].address, list[0].family);
            });
        },
    },
});

export interface SafeResponse {
    ok: boolean;
    status: number;
    text(): Promise<string>;
}

type FetchImpl = (url: string, init: Record<string, unknown>) => Promise<{ ok: boolean; status: number; headers: { get(name: string): string | null }; text(): Promise<string> }>;

const defaultFetch: FetchImpl = (url, init) => undiciFetch(url, { ...init, dispatcher: guardedAgent } as any) as any;

/**
 * fetch() for URLs we don't control (a lead's website and its links). Follows
 * redirects by hand so every hop is re-validated - otherwise a public site could
 * simply 302 the server to http://169.254.169.254/.
 */
export async function safeFetch(
    url: string,
    init: { method?: string } = {},
    deps: { fetchImpl?: FetchImpl; resolve?: Resolver } = {},
): Promise<SafeResponse> {
    const fetchImpl = deps.fetchImpl ?? defaultFetch;
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        await assertPublicUrl(current, deps.resolve);
        const res = await fetchImpl(current, { ...init, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
        const location = res.headers.get('location');
        if (res.status >= 300 && res.status < 400 && location) {
            current = new URL(location, current).toString();
            continue;
        }
        return res;
    }
    throw new Error(`Too many redirects fetching ${url}`);
}
