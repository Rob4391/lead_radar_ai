import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

jest.mock('@clerk/backend', () => ({
    verifyToken: jest.fn(),
}));

import { verifyToken } from '@clerk/backend';

function contextWithHeaders(headers: Record<string, string>): ExecutionContext {
    return {
        switchToHttp: () => ({
            getRequest: () => ({ headers }),
        }),
    } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
    const guard = new ApiKeyGuard();
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetAllMocks();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('rejects requests with no credentials at all', async () => {
        delete process.env.ADMIN_API_KEY;
        await expect(guard.canActivate(contextWithHeaders({}))).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('accepts a matching x-api-key header without touching Clerk', async () => {
        process.env.ADMIN_API_KEY = 'secret-admin-key';
        const ctx = contextWithHeaders({ 'x-api-key': 'secret-admin-key' });
        await expect(guard.canActivate(ctx)).resolves.toBe(true);
        expect(verifyToken).not.toHaveBeenCalled();
    });

    it('rejects a mismatched x-api-key and falls through to requiring a bearer token', async () => {
        process.env.ADMIN_API_KEY = 'secret-admin-key';
        const ctx = contextWithHeaders({ 'x-api-key': 'wrong-key' });
        await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a bearer token when CLERK_SECRET_KEY is not configured', async () => {
        delete process.env.ADMIN_API_KEY;
        delete process.env.CLERK_SECRET_KEY;
        const ctx = contextWithHeaders({ authorization: 'Bearer some.jwt.token' });
        await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('accepts a valid Clerk session token', async () => {
        delete process.env.ADMIN_API_KEY;
        process.env.CLERK_SECRET_KEY = 'sk_test_123';
        (verifyToken as jest.Mock).mockResolvedValue({ sub: 'user_123' });

        const ctx = contextWithHeaders({ authorization: 'Bearer valid.jwt.token' });
        await expect(guard.canActivate(ctx)).resolves.toBe(true);
        expect(verifyToken).toHaveBeenCalledWith('valid.jwt.token', { secretKey: 'sk_test_123' });
    });

    it('rejects an invalid or expired Clerk session token', async () => {
        delete process.env.ADMIN_API_KEY;
        process.env.CLERK_SECRET_KEY = 'sk_test_123';
        (verifyToken as jest.Mock).mockRejectedValue(new Error('token expired'));

        const ctx = contextWithHeaders({ authorization: 'Bearer expired.jwt.token' });
        await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    });
});
