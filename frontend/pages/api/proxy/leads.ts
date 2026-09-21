import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const url = new URL(`${BACKEND}/leads${req.url?.replace('/api/proxy/leads', '')}`);
    try {
        const r = await fetch(url.toString());
        const data = await r.json();
        res.status(200).json(data);
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
}
