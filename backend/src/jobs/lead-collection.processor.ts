import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { LeadsService } from '../leads.service';
import { PlacesService } from '../places/places.service';

@Processor('lead-collection')
export class LeadCollectionProcessor {
    constructor(
        private readonly leadsService: LeadsService,
        private readonly placesService: PlacesService,
    ) { }

    @Process()
    async handleCollect(job: Job<{ city: string; category: string }>) {
        const { city, category } = job.data;
        console.log(`[Job ${job.id}] Starting collection for ${city} / ${category}`);

        try {
            // Check if we already have recent results for this city+category
            const existing = await this.leadsService.findAll({ city, category });
            // existing is an array from Prisma findMany
            const existingArray = Array.isArray(existing) ? existing : [];

            if (existingArray.length > 0) {
                console.log(`[Job ${job.id}] Found ${existingArray.length} cached leads`);
                return { message: 'Returned cached leads', count: existingArray.length };
            }

            // Fetch from Places API and save
            console.log(`[Job ${job.id}] Fetching from Google Places API...`);
            const places = await this.placesService.searchPlaces(city, category);
            console.log(`[Job ${job.id}] Got ${places.length} places from API`);

            const saved = [];
            for (const place of places) {
                const result = await this.leadsService.upsertFromPlace(place, city, category);
                saved.push(result);
            }

            console.log(`[Job ${job.id}] Saved ${saved.length} leads to database`);
            return { message: 'Collected and saved leads', count: saved.length };
        } catch (error) {
            console.error(`[Job ${job.id}] Error:`, error);
            throw error;
        }
    }
}
