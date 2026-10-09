import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { timingSafeEqual } from 'node:crypto';

// The admin key bypasses per-user auth, so in production it stays off unless
// explicitly enabled, and is compared in constant time.
function adminKeyMatches(provided: unknown): boolean {
    const expected = process.env.ADMIN_API_KEY;
    if (typeof provided !== 'string' || !expected) return false;
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_ADMIN_API_KEY !== 'true') return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        // 1. Legacy/admin API key (used by seed/CI scripts and internal tooling).
        const headerKey = req.headers['x-api-key'] || req.headers['x-api_key'] || req.headers['apikey'];
        if (adminKeyMatches(headerKey)) {
            req.isAdmin = true;
            return true;
        }

        // 2. Clerk session token, forwarded by the frontend as a Bearer token.
        const auth = req.headers['authorization'] || '';
        const bearer = typeof auth === 'string' ? auth.replace(/^Bearer\s+/i, '') : '';

        if (!bearer) {
            throw new UnauthorizedException('No credentials provided. Use Bearer token or x-api-key header.');
        }

        const secretKey = process.env.CLERK_SECRET_KEY;
        if (!secretKey) {
            throw new UnauthorizedException('Server auth is misconfigured: CLERK_SECRET_KEY is not set.');
        }

        try {
            const payload = await verifyToken(bearer, { secretKey });
            req.auth = { userId: payload.sub };
            return true;
        } catch {
            throw new UnauthorizedException('Invalid or expired session token.');
        }
    }
}
