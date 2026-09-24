import React, { useState } from 'react';

interface OutreachMessages {
    coldEmail: string;
    linkedinMessage: string;
    whatsappMessage: string;
}

interface AuditResult {
    websiteAgeYears: number | null;
    isOldWebsite: boolean;
    mobileFriendly: boolean;
    isSlowLoad: boolean;
    hasBrokenPages: boolean;
}

interface Lead {
    id: number;
    name?: string;
    phone?: string;
    city?: string;
    category?: string;
    website?: string;
    score?: number;
    coldEmail?: string;
    linkedinMessage?: string;
    whatsappMessage?: string;
    websiteAgeYears?: number | null;
    isOldWebsite?: boolean;
    mobileFriendly?: boolean;
    isSlowLoad?: boolean;
    hasBrokenPages?: boolean;
    auditedAt?: string | null;
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

    const initialAudit: AuditResult | null = lead.auditedAt
        ? {
            websiteAgeYears: lead.websiteAgeYears ?? null,
            isOldWebsite: Boolean(lead.isOldWebsite),
            mobileFriendly: Boolean(lead.mobileFriendly),
            isSlowLoad: Boolean(lead.isSlowLoad),
            hasBrokenPages: Boolean(lead.hasBrokenPages),
        }
        : null;
    const [audit, setAudit] = useState<AuditResult | null>(initialAudit);
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditError, setAuditError] = useState('');

    const runAudit = async (force = false) => {
        setIsAuditing(true);
        setAuditError('');
        try {
            const res = await fetch(`/api/proxy/leads/${lead.id}/audit${force ? '?force=true' : ''}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to audit website.');
            setAudit(data);
        } catch (err: any) {
            setAuditError(err.message || 'Failed to audit website.');
        } finally {
            setIsAuditing(false);
        }
    };

    const normalizeIndianPhone = (raw: string): string => {
        const digits = raw.replace(/[^0-9]/g, '');
        if (digits.startsWith('91') && digits.length === 12) return digits;
        const local = digits.replace(/^0+/, '');
        return `91${local}`;
    };

    const whatsappLink = lead.phone
        ? `https://wa.me/${normalizeIndianPhone(lead.phone)}${messages ? `?text=${encodeURIComponent(messages.whatsappMessage)}` : ''}`
        : null;

    const generate = async (force = false) => {
        setIsGenerating(true);
        setError('');
        try {
            const res = await fetch(`/api/proxy/leads/${lead.id}/outreach${force ? '?force=true' : ''}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
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
                        {whatsappLink && (
                            <a
                                className="mt-2 block w-full rounded-lg bg-emerald-500 px-3 py-1.5 text-center text-sm font-medium text-white transition hover:bg-emerald-600"
                                href={whatsappLink}
                                target="_blank"
                                rel="noreferrer"
                            >
                                💬 Send on WhatsApp
                            </a>
                        )}
                    </div>
                )}
            </div>

            {lead.website && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                    {!audit && (
                        <button
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isAuditing}
                            onClick={() => runAudit(false)}
                        >
                            {isAuditing ? 'Auditing website…' : '🔍 Audit website'}
                        </button>
                    )}
                    {auditError && <p className="mt-2 text-xs text-red-600">{auditError}</p>}
                    {audit && (
                        <div>
                            <div className="flex flex-wrap gap-1.5 text-xs">
                                {audit.isOldWebsite && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                                        Website is {audit.websiteAgeYears ?? '5+'} yrs old
                                    </span>
                                )}
                                {!audit.mobileFriendly && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">Not mobile-friendly</span>
                                )}
                                {audit.isSlowLoad && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">Slow load</span>
                                )}
                                {audit.hasBrokenPages && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">Broken links</span>
                                )}
                                {!audit.isOldWebsite && audit.mobileFriendly && !audit.isSlowLoad && !audit.hasBrokenPages && (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">No issues found</span>
                                )}
                            </div>
                            <button className="mt-2 text-xs font-medium text-slate-400 hover:text-slate-600" disabled={isAuditing} onClick={() => runAudit(true)}>
                                {isAuditing ? 'Re-auditing…' : 'Re-audit'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
