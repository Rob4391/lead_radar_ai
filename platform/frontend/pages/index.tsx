import React from 'react';

export default function Home() {
    return (
        <main style={{ padding: '2rem' }}>
            <h1>Lead Radar — Landing</h1>
            <p>Search by city and category to find leads.</p>
            <section style={{ marginTop: '1.5rem' }}>
                <form action="/search" method="get">
                    <label>
                        City: <input name="city" />
                    </label>
                    <label style={{ marginLeft: '1rem' }}>
                        Category: <input name="category" />
                    </label>
                    <button style={{ marginLeft: '1rem' }} type="submit">Search</button>
                </form>
            </section>
        </main>
    );
}
