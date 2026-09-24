import React from 'react';
import Link from 'next/link'

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white">
            <div className="mx-auto max-w-5xl px-6 py-8">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-lg font-extrabold text-white shadow-md">
                            LR
                        </div>
                        <div>
                            <p className="text-lg font-extrabold leading-tight text-slate-900">Lead Radar</p>
                            <p className="text-sm text-slate-500">Find local leads, fast</p>
                        </div>
                    </div>
                    <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
                        <Link href="/" className="text-brand-700">Home</Link>
                        <Link href="/pricing" className="hover:text-brand-700">Pricing</Link>
                        <a href="#" className="hover:text-brand-700">Docs</a>
                    </nav>
                </header>

                <section className="card mt-10 overflow-hidden bg-gradient-to-br from-white to-brand-50/60">
                    <span className="badge">New · Faster lead discovery</span>
                    <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                        Find new leads <span className="text-brand-600">in minutes</span>
                    </h1>
                    <p className="mt-3 max-w-xl text-slate-600">
                        Search by city and category to discover local businesses with real outreach potential — then export a clean CSV in one click.
                    </p>

                    <form action="/search" method="get" className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input className="input sm:max-w-xs" type="text" name="city" placeholder="e.g. Austin" />
                        <input className="input sm:max-w-xs" type="text" name="category" placeholder="e.g. Yoga studio" />
                        <button className="btn" type="submit">Search leads</button>
                    </form>
                </section>

                <section className="mt-8 grid gap-4 sm:grid-cols-3">
                    <div className="card">
                        <div className="mb-2 text-2xl">⚡</div>
                        <h3 className="font-semibold text-slate-900">Fast discovery</h3>
                        <p className="mt-1 text-sm text-slate-500">Search thousands of businesses by city and category instantly.</p>
                    </div>
                    <div className="card">
                        <div className="mb-2 text-2xl">📊</div>
                        <h3 className="font-semibold text-slate-900">Clean exports</h3>
                        <p className="mt-1 text-sm text-slate-500">Download ready-to-use CSVs for your outreach campaigns.</p>
                    </div>
                    <div className="card">
                        <div className="mb-2 text-2xl">🔒</div>
                        <h3 className="font-semibold text-slate-900">Protected access</h3>
                        <p className="mt-1 text-sm text-slate-500">Search and export are gated behind sign-in and verified on the backend.</p>
                    </div>
                </section>

                <footer className="mt-14 border-t border-slate-100 py-6 text-center text-sm text-slate-400">
                    © {new Date().getFullYear()} Lead Radar — Prototype
                </footer>
            </div>
        </div>
    );
}
