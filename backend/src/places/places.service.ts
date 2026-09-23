import { Injectable, Logger } from '@nestjs/common';

const PLACES_BASE = 'https://places.googleapis.com/v1';

export interface PlaceResult {
    placeId: string;
    name?: string;
    phone?: string;
    website?: string;
    reviewCount?: number;
}

@Injectable()
export class PlacesService {
    private readonly logger = new Logger(PlacesService.name);
    private readonly apiKey = process.env.GOOGLE_PLACES_API_KEY;

    async searchPlaces(city: string, category: string): Promise<PlaceResult[]> {
        if (!this.apiKey || this.apiKey === 'REPLACE_ME') {
            throw new Error('GOOGLE_PLACES_API_KEY is not configured');
        }

        const res = await fetch(`${PLACES_BASE}/places:searchText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': this.apiKey,
                // minimal field mask to keep cost down
                'X-Goog-FieldMask': 'places.id,places.displayName,places.nationalPhoneNumber,places.websiteUri,places.userRatingCount',
            },
            body: JSON.stringify({ textQuery: `${category} in ${city}` }),
        });

        if (!res.ok) {
            const body = await res.text();
            this.logger.error(`Places API error ${res.status}: ${body}`);
            throw new Error(`Places API request failed with status ${res.status}`);
        }

        const data: any = await res.json();
        const places = data.places || [];

        return places.map((p: any): PlaceResult => ({
            placeId: p.id,
            name: p.displayName?.text,
            phone: p.nationalPhoneNumber,
            website: p.websiteUri,
            reviewCount: p.userRatingCount,
        }));
    }
}
