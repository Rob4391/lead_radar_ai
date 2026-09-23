import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND = process.env.BACKEND_URL || 'http://backend:3001';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const slug = Array.isArray(req.query.slug) ? req.query.slug.join('/') : req.query.slug || '';
    const url = `${BACKEND}/leads${slug ? '/' + slug : ''}`;

    // Build query string from req.query but exclude 'slug'
    const params = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
        if (key !== 'slug' && typeof value === 'string') {
            params.append(key, value);
        }
    });
    const queryString = params.toString();
    const fullUrl = `${url}${queryString ? '?' + queryString : ''}`;

    try {
        const r = await fetch(fullUrl, {
            method: req.method,
            headers: req.method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        });
        const data = await r.json();
        res.status(r.status).json(data);
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
}
