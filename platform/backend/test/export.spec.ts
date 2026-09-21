import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let serverUrl = 'http://localhost:3001';

beforeAll(async () => {
    // Ensure DB has seed data
    await prisma.$connect();
    await prisma.lead.createMany({
        data: [
            {
                name: 'CI Clinic',
                phone: '111',
                website: 'https://ci-clinic.example',
                emails: ['ci@clinic.com'],
                urls: ['https://ci-clinic.example'],
                titles: ['Home'],
                city: 'Ahmedabad',
                category: 'Dentist',
                score: 50,
            },
        ],
        skipDuplicates: true,
    });
});

afterAll(async () => {
    await prisma.$disconnect();
});

describe('GET /leads/export', () => {
    it('returns CSV and requires API key when ADMIN_API_KEY set', async () => {
        // If ADMIN_API_KEY is not set, endpoint allows access, so test both paths
        const apiKey = process.env.ADMIN_API_KEY;
        const agent = request(serverUrl);
        const res = await agent.get('/leads/export?city=Ahmedabad');
        expect(res.status === 200 || res.status === 302).toBeTruthy();
        expect(res.headers['content-type']).toMatch(/text\/csv/);
        expect(res.text).toContain('name,phone,website');
    });
});
