import { ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

// Set by ApiKeyGuard: exactly one of these is present on an authenticated request.
export type AuthedRequest = Request & { auth?: { userId: string }; isAdmin?: boolean };

// Per-user data (lists, outreach, proposals, status) has no meaning for the
// admin key - there is no "whose notes are these" - so those routes need a user.
export function requireUserId(req: AuthedRequest): string {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new ForbiddenException('This action requires a signed-in user.');
    }
    return userId;
}

export function requireAdmin(req: AuthedRequest): void {
    if (!req.isAdmin) {
        throw new ForbiddenException('This action is restricted to admin tooling.');
    }
}
