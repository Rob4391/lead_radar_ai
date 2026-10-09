import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Every browser request reaches the backend through the Next.js server, so the
// client IP is the same for all customers. Limit per signed-in user instead,
// falling back to IP only for the admin key / unauthenticated calls. Must run
// after ApiKeyGuard, which is what sets req.auth.
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
    protected async getTracker(req: Record<string, any>): Promise<string> {
        return req.auth?.userId ? `user:${req.auth.userId}` : `ip:${req.ip}`;
    }
}
