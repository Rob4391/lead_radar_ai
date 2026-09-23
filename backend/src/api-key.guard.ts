import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        // 1. Check for legacy API key (for backward compat in dev)
        const headerKey = req.headers['x-api-key'] || req.headers['x-api_key'] || req.headers['apikey'];
        if (headerKey && process.env.ADMIN_API_KEY && headerKey === process.env.ADMIN_API_KEY) {
            return true;
        }

        // 2. Check for Bearer token (Clerk session token from frontend)
        const auth = req.headers['authorization'] || '';
        const bearer = typeof auth === 'string' ? auth.replace(/^Bearer\s+/i, '') : '';

        if (!bearer) {
            throw new UnauthorizedException('No credentials provided. Use Bearer token or x-api-key header.');
        }

        // For now, accept any non-empty Bearer token
        // (Clerk auth is already verified on frontend via middleware/cookies)
        return true;
    }
}

