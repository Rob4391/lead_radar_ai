import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 via-white to-white">
            <SignUp routing="path" path="/sign-up" />
        </div>
    );
}
