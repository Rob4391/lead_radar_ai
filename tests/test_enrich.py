from lead_radar import enrich


def test_enrich_scores():
    leads = [
        {"emails": ["a@x.com", "b@x.com"], "urls": ["u1", "u2"], "titles": ["T"]}
    ]
    out = enrich.enrich_leads(leads)
    assert len(out) == 1
    assert out[0]["score"] > 0
