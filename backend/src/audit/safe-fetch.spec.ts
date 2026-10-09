import { assertPublicUrl, isPrivateAddress, safeFetch, UnsafeUrlError } from './safe-fetch';

const publicDns = async () => ['93.184.216.34'];

describe('isPrivateAddress', () => {
    it.each([
        '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1',
        '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255',
        '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:169.254.169.254',
    ])('blocks %s', (ip) => expect(isPrivateAddress(ip)).toBe(true));

    it.each(['8.8.8.8', '93.184.216.34', '172.32.0.1', '2404:6800:4000:100c::8b', '::ffff:8.8.8.8'])(
        'allows public %s', (ip) => expect(isPrivateAddress(ip)).toBe(false));

    it('refuses anything that is not an IP at all', () => {
        expect(isPrivateAddress('not-an-ip')).toBe(true);
    });
});

describe('assertPublicUrl', () => {
    it('accepts a normal public website', async () => {
        await expect(assertPublicUrl('https://example.com/', publicDns)).resolves.toBeInstanceOf(URL);
    });

    it.each([
        ['the cloud metadata server', 'http://169.254.169.254/latest/meta-data/'],
        ['loopback by IP', 'http://127.0.0.1:80/'],
        ['IPv6 loopback', 'http://[::1]/'],
        ['a non-http scheme', 'file:///etc/passwd'],
        ['a non-standard port', 'http://example.com:6379/'],
        ['embedded credentials', 'http://user:pass@example.com/'],
        ['garbage', 'not a url'],
    ])('rejects %s', async (_label, url) => {
        await expect(assertPublicUrl(url, publicDns)).rejects.toBeInstanceOf(UnsafeUrlError);
    });

    it('rejects a hostname whose DNS points inside the network', async () => {
        await expect(assertPublicUrl('https://sneaky.example/', async () => ['10.0.0.5'])).rejects.toBeInstanceOf(UnsafeUrlError);
    });

    it('rejects when any one of several resolved addresses is private', async () => {
        await expect(assertPublicUrl('https://mixed.example/', async () => ['93.184.216.34', '127.0.0.1'])).rejects.toBeInstanceOf(UnsafeUrlError);
    });
});

describe('safeFetch', () => {
    const response = (status: number, location?: string) => ({
        ok: status < 400, status, text: async () => 'body',
        headers: { get: (name: string) => (name === 'location' ? location ?? null : null) },
    });

    it('follows a redirect between public sites', async () => {
        const fetchImpl = jest.fn()
            .mockResolvedValueOnce(response(301, 'https://www.example.com/'))
            .mockResolvedValueOnce(response(200));
        const res = await safeFetch('http://example.com/', {}, { fetchImpl, resolve: publicDns });
        expect(res.status).toBe(200);
        expect(fetchImpl).toHaveBeenLastCalledWith('https://www.example.com/', expect.objectContaining({ redirect: 'manual' }));
    });

    it('refuses to follow a redirect into the metadata server', async () => {
        const fetchImpl = jest.fn().mockResolvedValueOnce(response(302, 'http://169.254.169.254/latest/meta-data/'));
        await expect(safeFetch('https://example.com/', {}, { fetchImpl, resolve: publicDns })).rejects.toBeInstanceOf(UnsafeUrlError);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('gives up after too many redirects', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(response(302, 'https://example.com/loop'));
        await expect(safeFetch('https://example.com/', {}, { fetchImpl, resolve: publicDns })).rejects.toThrow('Too many redirects');
    });
});
