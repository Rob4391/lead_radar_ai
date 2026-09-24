import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Search results, pricing, and the backend proxy expose lead/billing data and require a signed-in user.
const isProtectedRoute = createRouteMatcher(['/search(.*)', '/pricing(.*)', '/api/proxy(.*)']);

export default clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) {
        await auth().protect();
    }
});

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};
