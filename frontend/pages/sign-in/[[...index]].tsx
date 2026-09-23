import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 via-white to-white">
            <SignIn routing="path" path="/sign-in" />
        </div>
    );
}
