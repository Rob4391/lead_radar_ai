import { leadToCsvRow, LEAD_CSV_HEADER } from './csv';

describe('leadToCsvRow', () => {
    it('quotes every field and joins arrays with semicolons', () => {
        const row = leadToCsvRow({
            name: 'Joe\'s Pizza',
            phone: '555-1234',
            website: null,
            emails: ['a@example.com', 'b@example.com'],
            urls: ['https://a.com'],
            titles: [],
            city: 'Austin',
            category: 'Restaurant',
            reviewCount: 5,
            instagram: null,
            facebook: null,
            score: 90,
        });

        expect(row).toBe(
            '"Joe\'s Pizza","555-1234","","a@example.com;b@example.com","https://a.com","","Austin","Restaurant","5","","","90"',
        );
    });

    it('escapes embedded quotes and newlines so a value cannot break out of its field', () => {
        const row = leadToCsvRow({ name: 'Say "Hi"\nLine two' });
        expect(row.split(',')[0]).toBe('"Say ""Hi"" Line two"');
    });

    it('header has one column per emitted field', () => {
        const row = leadToCsvRow({ name: 'x' });
        expect(row.split(',')).toHaveLength(LEAD_CSV_HEADER.length);
    });
});
