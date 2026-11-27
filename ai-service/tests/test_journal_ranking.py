from types import SimpleNamespace

from app.services import journal_ranking
from app.services.journal_ranking import extract_issn, normalize_issn


def test_issn_is_normalized_from_page_metadata():
    assert normalize_issn("ISSN 1234 567X") == "1234-567X"
    assert extract_issn("no issn", "eISSN: 2049-3630") == "2049-3630"


def test_admin_scimago_snapshot_is_used_for_quartile(tmp_path, monkeypatch):
    (tmp_path / "scimagojr_2025_vn.csv").write_text(
        "Rank;Title;Issn;SJR Best Quartile\n1;Example Journal;1234567X;Q2\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(
        journal_ranking,
        "get_settings",
        lambda: SimpleNamespace(scimago_data_dir=str(tmp_path)),
    )
    result = journal_ranking.lookup_scimago_local("1234-567X", 2025)
    assert result is not None
    assert result["quartile"] == "Q2"
    assert result["quartile_source"] == "scimago"
