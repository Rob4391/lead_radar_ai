"""CSV export utilities for Lead Radar AI."""
import csv
from typing import List, Dict


def export_leads_to_csv(leads: List[Dict], path: str):
    """Write a list of lead dicts to CSV.

    Each lead dict should have keys: `url`, `title`, `emails` (list).
    """
    fieldnames = ["url", "title", "emails"]
    with open(path, "w", newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for lead in leads:
            row = {
                "url": lead.get("url", ""),
                "title": lead.get("title", ""),
                "emails": ";".join(lead.get("emails", [])) if lead.get("emails") else "",
            }
            writer.writerow(row)
