import React, { useState } from 'react';

interface OutreachMessages {
    coldEmail: string;
    linkedinMessage: string;
    whatsappMessage: string;
}

interface Lead {
    id: number;
    name?: string;
    city?: string;
    category?: string;
    website?: string;
    score?: number;
    coldEmail?: string;
    linkedinMessage?: string;
    whatsappMessage?: string;
}

const TABS: { key: keyof OutreachMessages; label: string }[] = [
    { key: 'coldEmail', label: 'Email' },
    { key: 'linkedinMessage', label: 'LinkedIn' },
    { key: 'whatsappMessage', label: 'WhatsApp' },
];

export default function LeadCard({ lead }: { lead: Lead }) {
    const initial: OutreachMessages | null =
        lead.coldEmail && lead.linkedinMessage && lead.whatsappMessage
            ? { coldEmail: lead.coldEmail, linkedinMessage: lead.linkedinMessage, whatsappMessage: lead.whatsappMessage }
            : null;

    const [messages, setMessages] = useState<OutreachMessages | null>(initial);
    const [activeTab, setActiveTab] = useState<keyof OutreachMessages>('coldEmail');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const generate = async (force = false) => {
        setIsGenerating(true);
        setError('');
        try {
            const res = await fetch(`/api/proxy/leads/${lead.id}/outreach${force ? '?force=true' : ''}`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to generate outreach messages.');
            setMessages({ coldEmail: data.coldEmail, linkedinMessage: data.linkedinMessage, whatsappMessage: data.whatsappMessage });
        } catch (err: any) {
            setError(err.message || 'Failed to generate outreach messages.');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyActive = async () => {
        if (!messages) return;
        try {
            await navigator.clipboard.writeText(messages[activeTab]);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard API unavailable; silently ignore
        }
    };

    return (
        <div className="rounded-xl border border-slate-100 bg-gradient-to-b from-white to-brand-50/40 p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
                <strong className="text-slate-900">{lead.name}</strong>
                <span className="badge">{lead.city}</span>
            </div>
            <div className="mt-1 text-sm text-slate-500">{lead.category}</div>
            {typeof lead.score === 'number' && (
                <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Opportunity</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${lead.score >= 70 ? 'bg-emerald-100 text-emerald-700' : lead.score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {Math.round(lead.score)}
                    </span>
                </div>
            )}
            {lead.website && (
                <a className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline" href={lead.website} target="_blank" rel="noreferrer">
                    {lead.website}
                </a>
            )}

            <div className="mt-3 border-t border-slate-100 pt-3">
                {!messages && (
                    <button
                        className="w-full rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isGenerating}
                        onClick={() => generate(false)}
                    >
                        {isGenerating ? 'Writing outreach…' : '✨ Generate outreach'}
                    </button>
                )}

                {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

                {messages && (
                    <div>
                        <div className="flex gap-1">
                            {TABS.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`rounded-md px-2 py-1 text-xs font-medium transition ${activeTab === tab.key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                            {messages[activeTab]}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                            <button className="text-xs font-medium text-brand-700 hover:underline" onClick={copyActive}>
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                            <button className="text-xs font-medium text-slate-400 hover:text-slate-600" disabled={isGenerating} onClick={() => generate(true)}>
                                {isGenerating ? 'Regenerating…' : 'Regenerate'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
