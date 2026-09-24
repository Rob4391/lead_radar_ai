import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import LeadCard from '../components/LeadCard';

export default function Search() {
    const router = useRouter();
    const { city, category } = router.query;
    const [leads, setLeads] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!city && !category) return;
        const payload: any = {};
        if (city) payload.city = String(city);
        if (category) payload.category = String(category);
        setIsLoading(true);
        setError('');

        const pollJobStatus = (jobId: string) => {
            const poll = async () => {
                try {
                    const res = await fetch(`/api/proxy/leads/collect-status/${jobId}`);
                    const data = await res.json();

                    if (data.status === 'done') {
                        setLeads(data.leads || []);
                        setIsLoading(false);
                        return;
                    }

                    if (data.status === 'failed') {
                        setError(`Job failed: ${data.error}`);
                        setIsLoading(false);
                        return;
                    }

                    // Still processing, poll again in 500ms
                    setTimeout(poll, 500);
                } catch (err) {
                    setError('Error polling job status. Please try again.');
                    setIsLoading(false);
                }
            };
            poll();
        };

        // Trigger collection (backend will return existing DB rows if present or jobId for async)
        fetch(`/api/proxy/leads/collect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
            .then(async r => {
                const data = await r.json();
                if (!r.ok) throw new Error(data.error || 'Unable to collect leads.');
                return data;
            })
            .then(data => {
                // If response is an array, leads are ready (cached)
                if (Array.isArray(data)) {
                    setLeads(data);
                    setIsLoading(false);
                    return;
                }
                // If response has jobId, job is queued - start polling
                if (data.jobId) {
                    pollJobStatus(data.jobId);
                    return;
                }
                // Fallback
                setLeads([]);
                setIsLoading(false);
            })
            .catch(() => {
                // fallback to simple GET if POST fails
                const q = new URLSearchParams();
                if (city) q.set('city', String(city));
                if (category) q.set('category', String(category));
                fetch(`/api/proxy/leads?${q.toString()}`)
                    .then(async r => {
                        const data = await r.json();
                        if (!r.ok) throw new Error(data.error || 'Unable to load leads.');
                        return data;
                    })
                    .then(data => setLeads(Array.isArray(data) ? data : data.value || []))
                    .catch(() => setError('We could not load leads right now. Please try again.'))
                    .finally(() => setIsLoading(false));
            });
    }, [city, category]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white">
            <div className="mx-auto max-w-5xl px-6 py-8">
                <header className="flex items-center gap-3">
                    <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-extrabold text-white shadow-md">
                        LR
                    </Link>
                    <div>
                        <p className="font-bold leading-tight text-slate-900">Lead Radar</p>
                        <p className="text-sm text-slate-500">Search results</p>
                    </div>
                </header>

                <section className="mt-6">
                    <div className="card">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex gap-8">
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-slate-400">City</div>
                                    <div className="font-semibold text-slate-900">{city || '—'}</div>
                                </div>
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-slate-400">Category</div>
                                    <div className="font-semibold text-slate-900">{category || '—'}</div>
                                </div>
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-slate-400">Results</div>
                                    <div className="font-semibold text-slate-900">{leads.length}</div>
                                </div>
                            </div>
                            <button className="btn disabled:cursor-not-allowed disabled:opacity-50" disabled={isLoading} onClick={() => {
                                const q = new URLSearchParams();
                                if (city) q.set('city', String(city));
                                if (category) q.set('category', String(category));
                                window.location.href = `/api/proxy/leads/export?${q.toString()}`;
                            }}>⬇ Export CSV</button>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {isLoading && (
                                <div className="col-span-full rounded-xl border border-brand-100 bg-brand-50/60 p-8 text-center text-brand-700">
                                    Finding businesses in {city || 'your area'}...
                                </div>
                            )}
                            {!isLoading && error && (
                                <div className="col-span-full rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
                                    {error}
                                </div>
                            )}
                            {!isLoading && !error && leads.length === 0 && (
                                <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                                    No leads yet — try a broader search.
                                </div>
                            )}
                            {!isLoading && !error && leads.map((l, i) => (
                                <LeadCard lead={l} key={l.id ?? i} />
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
