import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';

export async function proxyToBackend(req: NextApiRequest, res: NextApiResponse, path: string) {
    const { userId, getToken } = getAuth(req);
    if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    const token = await getToken();
    const params = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
        if (key === 'slug') return;
        if (typeof value === 'string') params.append(key, value);
    });
    const queryString = params.toString();
    const url = `${BACKEND}${path}${queryString ? `?${queryString}` : ''}`;

    try {
        const backendRes = await fetch(url, {
            method: req.method,
            headers: {
                ...(req.method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
                Authorization: `Bearer ${token}`,
            },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        });

        const contentType = backendRes.headers.get('content-type') || '';

        // CSV export must be forwarded as a binary download, not JSON-parsed.
        if (contentType.includes('text/csv')) {
            const buffer = Buffer.from(await backendRes.arrayBuffer());
            res.status(backendRes.status);
            res.setHeader('Content-Type', contentType);
            const disposition = backendRes.headers.get('content-disposition');
            if (disposition) res.setHeader('Content-Disposition', disposition);
            res.send(buffer);
            return;
        }

        const data = await backendRes.json();
        res.status(backendRes.status).json(data);
    } catch (e) {
        res.status(502).json({ error: 'Unable to reach backend', detail: String(e) });
    }
}
