from lead_radar import validator


def test_normalize_and_extract():
    s = "Sales@Example.COM; other@site.org"
    out = validator.extract_and_normalize(s)
    assert "sales@example.com" in out
    assert "other@site.org" in out


def test_dedupe_simple():
    leads = [
        {"url": "https://a.com", "title": "A", "emails": ["x@e.com"]},
        {"url": "https://b.com", "title": "B", "emails": ["X@E.com"]},
    ]
    deduped = validator.dedupe_leads(leads)
    assert len(deduped) == 1
