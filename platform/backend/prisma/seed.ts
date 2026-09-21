import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    await prisma.lead.createMany({
        data: [
            {
                name: 'ABC Clinic',
                phone: '1234567890',
                website: 'https://abc-clinic.example',
                emails: ['contact@abcclinic.com'],
                urls: ['https://abc-clinic.example'],
                titles: ['Home'],
                city: 'Ahmedabad',
                category: 'Dentist',
                score: 75.0,
            },
            {
                name: 'XYZ Salon',
                phone: '0987654321',
                website: 'https://xyz-salon.example',
                emails: ['hello@xyzsalon.com'],
                urls: ['https://xyz-salon.example'],
                titles: ['Home'],
                city: 'Ahmedabad',
                category: 'Salon',
                score: 60.0,
            },
        ],
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
