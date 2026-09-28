import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import LeadCard from '../components/LeadCard';

interface ListSummary {
    id: number;
    name: string;
    leadCount: number;
    createdAt: string;
}

interface ListDetail {
    id: number;
    name: string;
    leads: any[];
}

// List ids are numeric-only; reject anything else before it ever reaches a
// fetch URL, since `id` otherwise comes straight from the (user-controlled)
// query string.
function asListId(value: unknown): string | null {
    return typeof value === 'string' && /^\d+$/.test(value) ? value : null;
}

export default function Lists() {
    const router = useRouter();
    const id = asListId(router.query.id);

    const [lists, setLists] = useState<ListSummary[]>([]);
    const [detail, setDetail] = useState<ListDetail | null>(null);
    const [newName, setNewName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const loadLists = () => {
        setIsLoading(true);
        setError('');
        fetch('/api/proxy/lists')
            .then(async r => {
                const data = await r.json();
                if (!r.ok) throw new Error(data.message || 'Failed to load lists.');
                return data;
            })
            .then(setLists)
            .catch((err: Error) => setError(err.message))
            .finally(() => setIsLoading(false));
    };

    const loadDetail = (listId: string) => {
        setIsLoading(true);
        setError('');
        fetch(`/api/proxy/lists/${listId}`)
            .then(async r => {
                const data = await r.json();
                if (!r.ok) throw new Error(data.message || 'Failed to load list.');
                return data;
            })
            .then(setDetail)
            .catch((err: Error) => setError(err.message))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        if (id !== null) {
            loadDetail(id);
        } else {
            setDetail(null);
            loadLists();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const createList = async () => {
        if (!newName.trim()) return;
        setError('');
        try {
            const res = await fetch('/api/proxy/lists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to create list.');
            setNewName('');
            loadLists();
        } catch (err: any) {
            setError(err.message || 'Failed to create list.');
        }
    };

    const deleteList = async (listId: number) => {
        try {
            await fetch(`/api/proxy/lists/${listId}`, { method: 'DELETE' });
            loadLists();
        } catch {
            setError('Failed to delete list.');
        }
    };

    const removeLeadFromList = async (leadId: number) => {
        if (id === null) return;
        try {
            await fetch(`/api/proxy/lists/${id}/leads/${leadId}`, { method: 'DELETE' });
            loadDetail(id);
        } catch {
            setError('Failed to remove lead from list.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white">
            <div className="mx-auto max-w-5xl px-6 py-8">
                <header className="flex items-center gap-3">
                    <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-extrabold text-white shadow-md">
                        LR
                    </Link>
                    <div>
                        <p className="font-bold leading-tight text-slate-900">Lead Radar</p>
                        <p className="text-sm text-slate-500">{detail ? detail.name : 'Your lists'}</p>
                    </div>
                    {detail && (
                        <Link href="/lists" className="ml-auto text-xs font-medium text-brand-700 hover:underline">
                            ← All lists
                        </Link>
                    )}
                </header>

                {error && (
                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
                )}

                {!detail && (
                    <>
                        <section className="mt-6 card flex flex-col gap-3 sm:flex-row sm:items-center">
                            <input
                                className="input"
                                type="text"
                                placeholder="New list name (e.g. Q4 Hot Leads)"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && createList()}
                            />
                            <button className="btn" onClick={createList}>+ Create list</button>
                        </section>

                        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {isLoading && <div className="col-span-full text-center text-slate-400">Loading…</div>}
                            {!isLoading && lists.length === 0 && (
                                <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                                    No lists yet — create one above, then add leads to it from your search results.
                                </div>
                            )}
                            {lists.map(l => (
                                <div key={l.id} className="card">
                                    <Link href={`/lists?id=${l.id}`} className="font-semibold text-slate-900 hover:text-brand-700">
                                        {l.name}
                                    </Link>
                                    <p className="mt-1 text-sm text-slate-500">{l.leadCount} lead{l.leadCount === 1 ? '' : 's'}</p>
                                    <button
                                        className="mt-3 text-xs font-medium text-red-600 hover:underline"
                                        onClick={() => deleteList(l.id)}
                                    >
                                        Delete list
                                    </button>
                                </div>
                            ))}
                        </section>
                    </>
                )}

                {detail && (
                    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {isLoading && <div className="col-span-full text-center text-slate-400">Loading…</div>}
                        {!isLoading && detail.leads.length === 0 && (
                            <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                                No leads in this list yet.
                            </div>
                        )}
                        {detail.leads.map(l => (
                            <div key={l.id}>
                                <LeadCard lead={l} />
                                <button
                                    className="mt-1 w-full text-xs font-medium text-red-600 hover:underline"
                                    onClick={() => removeLeadFromList(l.id)}
                                >
                                    Remove from list
                                </button>
                            </div>
                        ))}
                    </section>
                )}
            </div>
        </div>
    );
}
