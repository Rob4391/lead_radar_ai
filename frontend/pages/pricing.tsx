import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface PlanInfo {
    plan: string;
    label: string;
    priceInRupees: number;
    searchLimit: number | null;
}

declare global {
    interface Window {
        Razorpay: any;
    }
}

function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.Razorpay) return resolve();
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
        document.body.appendChild(script);
    });
}

export default function Pricing() {
    const router = useRouter();
    const [plans, setPlans] = useState<PlanInfo[]>([]);
    const [status, setStatus] = useState<any>(null);
    const [busyPlan, setBusyPlan] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/proxy/billing/plans').then(r => r.json()).then(setPlans).catch(() => setError('Could not load plans.'));
        fetch('/api/proxy/billing/status')
            .then(async r => {
                const data = await r.json();
                if (!r.ok) throw new Error(`status ${r.status}: ${data.message || data.error || JSON.stringify(data)}`);
                return data;
            })
            .then(setStatus)
            .catch((err: Error) => setError(`Could not load your plan status — ${err.message}`));
    }, []);

    const subscribe = async (plan: string) => {
        setBusyPlan(plan);
        setError('');
        try {
            await loadRazorpayScript();

            const checkoutRes = await fetch('/api/proxy/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan }),
            });
            const order = await checkoutRes.json();
            if (!checkoutRes.ok) throw new Error(order.message || 'Could not start checkout.');

            const razorpay = new window.Razorpay({
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                order_id: order.orderId,
                name: 'Lead Radar',
                description: `${plan} plan`,
                handler: async (response: any) => {
                    try {
                        const verifyRes = await fetch('/api/proxy/billing/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                orderId: response.razorpay_order_id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                                plan,
                            }),
                        });
                        const result = await verifyRes.json();
                        if (!verifyRes.ok) throw new Error(result.message || 'Payment verification failed.');
                        router.push('/search');
                    } catch (err: any) {
                        setError(err.message || 'Payment verification failed.');
                    } finally {
                        setBusyPlan(null);
                    }
                },
                modal: {
                    ondismiss: () => setBusyPlan(null),
                },
            });
            razorpay.open();
        } catch (err: any) {
            setError(err.message || 'Something went wrong starting checkout.');
            setBusyPlan(null);
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
                        <p className="text-sm text-slate-500">Pricing</p>
                    </div>
                </header>

                {status && status.plan && (
                    <p className="mt-6 rounded-lg border border-brand-100 bg-brand-50 px-4 py-2 text-sm text-brand-700">
                        Current plan: <strong>{status.plan}</strong> ({status.status}) —{' '}
                        {status.searchLimit === null ? 'unlimited searches' : `${status.remaining} of ${status.searchLimit} searches left this period`}
                        {status.plan === 'FREE' && ' — every account gets this automatically, no payment needed. Upgrade below for more searches.'}
                    </p>
                )}

                {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

                <section className="mt-8 grid gap-4 sm:grid-cols-3">
                    {plans.map(p => (
                        <div key={p.plan} className="card flex flex-col">
                            <h3 className="text-lg font-bold text-slate-900">{p.label}</h3>
                            <p className="mt-2 text-3xl font-extrabold text-brand-600">
                                ₹{p.priceInRupees.toLocaleString('en-IN')}
                                <span className="text-sm font-normal text-slate-400">/month</span>
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                {p.searchLimit === null ? 'Unlimited searches' : `${p.searchLimit} searches/month`}
                            </p>
                            <button
                                className="btn mt-6 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={busyPlan !== null}
                                onClick={() => subscribe(p.plan)}
                            >
                                {busyPlan === p.plan ? 'Opening checkout…' : status?.plan === p.plan && status?.status === 'ACTIVE' ? 'Renew' : 'Subscribe'}
                            </button>
                        </div>
                    ))}
                </section>

                <p className="mt-6 text-center text-xs text-slate-400">Payments processed by Razorpay. Test mode — no real charges.</p>
            </div>
        </div>
    );
}
