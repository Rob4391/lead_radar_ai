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
                        <Link href="/lists" className="hover:text-brand-700">Lists</Link>
                        <Link href="/pricing" className="hover:text-brand-700">Pricing</Link>
                    </nav>
                </header>

                <section className="card mt-10 overflow-hidden bg-gradient-to-br from-white to-brand-50/60">
                    <span className="badge">AI-powered · Built for Indian agencies</span>
                    <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                        Find leads with a weak online presence <span className="text-brand-600">before your competitors do</span>
                    </h1>
                    <p className="mt-3 max-w-xl text-slate-600">
                        Search by city and category, get a scored list of local businesses that actually need marketing help, then generate outreach and pitch proposals straight from each lead.
                    </p>

                    <form action="/search" method="get" className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input className="input sm:max-w-xs" type="text" name="city" placeholder="e.g. Ahmedabad" />
                        <input className="input sm:max-w-xs" type="text" name="category" placeholder="e.g. Dentist" />
                        <button className="btn" type="submit">Search leads</button>
                    </form>
                </section>

                <section className="mt-8 grid gap-4 sm:grid-cols-3">
                    <div className="card">
                        <div className="mb-2 text-2xl">🎯</div>
                        <h3 className="font-semibold text-slate-900">Opportunity scoring</h3>
                        <p className="mt-1 text-sm text-slate-500">Every lead is scored 0-100 on how weak its online presence is, so you call the hottest ones first.</p>
                    </div>
                    <div className="card">
                        <div className="mb-2 text-2xl">✨</div>
                        <h3 className="font-semibold text-slate-900">AI outreach & proposals</h3>
                        <p className="mt-1 text-sm text-slate-500">Generate a cold email, LinkedIn message, and WhatsApp text in English or a regional language — plus a scope + pricing proposal built on a real website audit.</p>
                    </div>
                    <div className="card">
                        <div className="mb-2 text-2xl">📊</div>
                        <h3 className="font-semibold text-slate-900">Competitor benchmarking</h3>
                        <p className="mt-1 text-sm text-slate-500">See a lead against the strongest local peers from the same search, so your pitch shows exactly what they're missing.</p>
                    </div>
                </section>

                <footer className="mt-14 border-t border-slate-100 py-6 text-center text-sm text-slate-400">
                    © {new Date().getFullYear()} Lead Radar — Built for digital marketing, SEO, and web dev agencies
                </footer>
            </div>
        </div>
    );
}
