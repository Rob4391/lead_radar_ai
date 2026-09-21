from lead_radar import exporter


def test_exporter_writes_deduped_csv(tmp_path):
    leads = [
        {"emails": ["a@x.com"], "urls": ["https://a.com", "https://b.com"], "titles": ["A", "B"]}
    ]
    out = tmp_path / "leads.csv"
    exporter.export_leads_to_csv(leads, str(out))
    text = out.read_text()
    assert "a@x.com" in text
    assert "https://a.com" in text
    assert "A;B" in text or "A" in text
