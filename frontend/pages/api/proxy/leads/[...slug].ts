import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyToBackend } from '../../../../lib/backendProxy';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const slug = Array.isArray(req.query.slug) ? req.query.slug.join('/') : req.query.slug || '';
    return proxyToBackend(req, res, `/leads${slug ? '/' + slug : ''}`);
}
