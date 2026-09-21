import os
from lead_radar import storage


def test_storage_roundtrip(tmp_path):
    db = tmp_path / "test.db"
    leads = [
        {"emails": ["a@x.com"], "urls": ["https://a.com"], "titles": ["A"]}
    ]
    storage.init_db(str(db))
    storage.save_leads(str(db), leads)
    out = storage.load_leads(str(db))
    assert len(out) == 1
    assert out[0]["emails"] == ["a@x.com"]
    # score absent -> None
    assert out[0].get("score") is None
