"""Simple storage for leads using SQLite.

This module provides a lightweight persistence layer for Phase-5. It stores
one row per lead with JSON-encoded `emails`, `urls`, and `titles`.
"""
import json
import sqlite3
from typing import List, Dict


def init_db(path: str):
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            emails TEXT,
            urls TEXT,
            titles TEXT,
            score REAL,
            meta TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def save_leads(path: str, leads: List[Dict]):
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    for lead in leads:
        emails = json.dumps(lead.get("emails") or [])
        urls = json.dumps(lead.get("urls") or [])
        titles = json.dumps(lead.get("titles") or [])
        # score may be present on the lead
        score = lead.get("score")
        meta = json.dumps({k: v for k, v in lead.items() if k not in ("emails", "urls", "titles", "score")})
        cur.execute(
            "INSERT INTO leads (emails, urls, titles, score, meta) VALUES (?, ?, ?, ?, ?)",
            (emails, urls, titles, score, meta),
        )
    conn.commit()
    conn.close()


def load_leads(path: str) -> List[Dict]:
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    cur.execute("SELECT id, emails, urls, titles, score, meta FROM leads")
    rows = cur.fetchall()
    out = []
    for r in rows:
        # id, emails, urls, titles, score, meta
        out.append(
            {
                "id": r[0],
                "emails": json.loads(r[1]) if r[1] else [],
                "urls": json.loads(r[2]) if r[2] else [],
                "titles": json.loads(r[3]) if r[3] else [],
                "score": r[4],
                **(json.loads(r[5]) if r[5] else {}),
            }
        )
    conn.close()
    return out
