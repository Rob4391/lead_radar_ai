import { PlacesService } from './places.service';

describe('PlacesService', () => {
    const originalEnv = process.env;
    const originalFetch = global.fetch;

    beforeEach(() => {
        process.env = { ...originalEnv, GOOGLE_PLACES_API_KEY: 'test-key' };
    });

    afterEach(() => {
        process.env = originalEnv;
        global.fetch = originalFetch;
    });

    it('throws when no API key is configured', async () => {
        process.env = { ...originalEnv };
        delete process.env.GOOGLE_PLACES_API_KEY;
        const service = new PlacesService();
        await expect(service.searchPlaces('Austin', 'dentist')).rejects.toThrow('GOOGLE_PLACES_API_KEY');
    });

    it('maps a successful Places API response into PlaceResult[]', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                places: [
                    {
                        id: 'place-1',
                        displayName: { text: 'Joe\'s Dentist' },
                        nationalPhoneNumber: '555-1234',
                        websiteUri: 'https://joesdentist.com',
                        userRatingCount: 42,
                    },
                ],
            }),
        }) as any;

        const service = new PlacesService();
        const results = await service.searchPlaces('Austin', 'dentist');

        expect(results).toEqual([
            {
                placeId: 'place-1',
                name: 'Joe\'s Dentist',
                phone: '555-1234',
                website: 'https://joesdentist.com',
                reviewCount: 42,
            },
        ]);
    });

    it('returns an empty array when the API responds with no places', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
        const service = new PlacesService();
        await expect(service.searchPlaces('Austin', 'dentist')).resolves.toEqual([]);
    });

    it('throws when the Places API responds with a non-OK status', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 429,
            text: async () => 'quota exceeded',
        }) as any;

        const service = new PlacesService();
        await expect(service.searchPlaces('Austin', 'dentist')).rejects.toThrow('status 429');
    });
});
