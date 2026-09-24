import type { NextApiRequest, NextApiResponse } from 'next';
import { proxyToBackend } from '../../../lib/backendProxy';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    return proxyToBackend(req, res, '/billing');
}
