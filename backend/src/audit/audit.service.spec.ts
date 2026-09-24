import { AuditService } from './audit.service';

describe('AuditService', () => {
    const originalEnv = process.env;
    const originalFetch = global.fetch;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.PAGESPEED_API_KEY;
    });

    afterEach(() => {
        process.env = originalEnv;
        global.fetch = originalFetch;
    });

    it('audits a website: old, mobile-unfriendly, with a broken link', async () => {
        global.fetch = jest.fn().mockImplementation((url: string, opts?: any) => {
            if (url.includes('archive.org')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ archived_snapshots: { closest: { timestamp: '20150101000000' } } }),
                });
            }
            if (opts?.method === 'HEAD') {
                return Promise.resolve({ status: 404 });
            }
            return Promise.resolve({
                ok: true,
                text: async () => '<html><head><title>No viewport</title></head><body><a href="/broken">Broken</a></body></html>',
            });
        }) as any;

        const service = new AuditService();
        const result = await service.auditWebsite('https://old-site.com');

        expect(result.isOldWebsite).toBe(true);
        expect(result.mobileFriendly).toBe(false);
        expect(result.hasBrokenPages).toBe(true);
        expect(result.isSlowLoad).toBe(false);
    });

    it('audits a modern, mobile-friendly website with no broken links', async () => {
        global.fetch = jest.fn().mockImplementation((url: string, opts?: any) => {
            if (url.includes('archive.org')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ archived_snapshots: { closest: { timestamp: '20250101000000' } } }),
                });
            }
            if (opts?.method === 'HEAD') {
                return Promise.resolve({ status: 200 });
            }
            return Promise.resolve({
                ok: true,
                text: async () => '<html><head><meta name="viewport" content="width=device-width"></head><body><a href="/pricing">Pricing</a></body></html>',
            });
        }) as any;

        const service = new AuditService();
        const result = await service.auditWebsite('https://modern-site.com');

        expect(result.isOldWebsite).toBe(false);
        expect(result.mobileFriendly).toBe(true);
        expect(result.hasBrokenPages).toBe(false);
    });

    it('degrades gracefully when the homepage fetch fails', async () => {
        global.fetch = jest.fn().mockImplementation((url: string) => {
            if (url.includes('archive.org')) {
                return Promise.resolve({ ok: true, json: async () => ({}) });
            }
            return Promise.reject(new Error('network error'));
        }) as any;

        const service = new AuditService();
        const result = await service.auditWebsite('https://unreachable-site.com');

        expect(result.mobileFriendly).toBe(false);
        expect(result.hasBrokenPages).toBe(false);
        expect(result.websiteAgeYears).toBeNull();
    });

    it('uses PageSpeed score when PAGESPEED_API_KEY is configured', async () => {
        process.env.PAGESPEED_API_KEY = 'test-key';
        global.fetch = jest.fn().mockImplementation((url: string, opts?: any) => {
            if (url.includes('archive.org')) {
                return Promise.resolve({ ok: true, json: async () => ({}) });
            }
            if (url.includes('pagespeedonline')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ lighthouseResult: { categories: { performance: { score: 0.2 } } } }),
                });
            }
            if (opts?.method === 'HEAD') {
                return Promise.resolve({ status: 200 });
            }
            return Promise.resolve({ ok: true, text: async () => '<html></html>' });
        }) as any;

        const service = new AuditService();
        const result = await service.auditWebsite('https://slow-site.com');

        expect(result.isSlowLoad).toBe(true);
    });
});
