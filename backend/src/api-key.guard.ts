import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { verifyToken } from '@clerk/backend';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        // 1. Legacy/admin API key (used by seed/CI scripts and internal tooling).
        const headerKey = req.headers['x-api-key'] || req.headers['x-api_key'] || req.headers['apikey'];
        if (headerKey && process.env.ADMIN_API_KEY && headerKey === process.env.ADMIN_API_KEY) {
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
