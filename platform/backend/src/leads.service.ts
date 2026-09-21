import { Injectable } from '@nestjs/common';

@Injectable()
export class LeadsService {
    // Placeholder memory-based store — replace with Postgres in next step
    private leads = [];

    findAll(filter?: { city?: string; category?: string }) {
        // naive filter
        return this.leads.filter(() => true);
    }

    create(lead: any) {
        this.leads.push(lead);
        return lead;
    }
}
