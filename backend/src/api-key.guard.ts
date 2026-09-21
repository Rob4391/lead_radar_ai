import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();
        const headerKey = req.headers['x-api-key'] || req.headers['x-api_key'] || req.headers['apikey'];
        const auth = req.headers['authorization'] || '';
        const bearer = typeof auth === 'string' ? auth.replace(/^Bearer\s+/i, '') : '';
        const provided = headerKey || bearer;

        // If no ADMIN_API_KEY configured, allow in dev for convenience
        const expected = process.env.ADMIN_API_KEY;
        if (!expected) return true;
        return !!provided && provided === expected;
    }
}
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();
        const headerKey = req.headers['x-api-key'] || req.headers['x-api_key'] || req.headers['apikey'];
        const auth = req.headers['authorization'] || '';
        const bearer = typeof auth === 'string' ? auth.replace(/^Bearer\s+/i, '') : '';
        const provided = headerKey || bearer;

        // If no ADMIN_API_KEY configured, allow in dev for convenience
        const expected = process.env.ADMIN_API_KEY;
        if (!expected) return true;
        return !!provided && provided === expected;
    }
}
