import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

export default function App({ Component, pageProps }: AppProps) {
    return (
        <ClerkProvider>
            <header className="flex items-center justify-end gap-4 p-4">
                <SignedOut>
                    <SignInButton />
                    <SignUpButton>
                        <button className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white">
                            Sign Up
                        </button>
                    </SignUpButton>
                </SignedOut>
                <SignedIn>
                    <UserButton />
                </SignedIn>
            </header>
            <Component {...pageProps} />
        </ClerkProvider>
    )
}
