import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Search() {
    const router = useRouter();
    const { city, category } = router.query;
    const [leads, setLeads] = useState<any[]>([]);

    useEffect(() => {
        if (!city && !category) return;
        const q = new URLSearchParams();
        if (city) q.set('city', String(city));
        if (category) q.set('category', String(category));
        fetch(`/api/proxy/leads?${q.toString()}`)
            .then(r => r.json())
            .then(data => setLeads(data));
    }, [city, category]);

    return (
        <main style={{ padding: '2rem' }}>
            <h1>Search results</h1>
            <p>City: {city} Category: {category}</p>
            <button onClick={() => {
                const q = new URLSearchParams();
                if (city) q.set('city', String(city));
                if (category) q.set('category', String(category));
                window.location.href = `/api/proxy/leads/export?${q.toString()}`;
            }}>Export CSV</button>
            <ul>
                {leads.map((l, i) => (
                    <li key={i}>
                        <strong>{l.name}</strong> — {l.phone} — {l.website}
                    </li>
                ))}
            </ul>
        </main>
    );
}
