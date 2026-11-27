from app.services.journal_ranking import _quartiles_from_scopus, extract_issn, normalize_issn


def test_issn_is_normalized_from_page_metadata():
    assert normalize_issn("ISSN 1234 567X") == "1234-567X"
    assert extract_issn("no issn", "eISSN: 2049-3630") == "2049-3630"


def test_scopus_percentile_maps_to_quartile():
    quartiles, year = _quartiles_from_scopus(
        {"entry": [{"CiteScorePercentile": {"value": 82}, "year": 2025}]},
    )
    assert quartiles == {"Q1"}
    assert year == 2025


def test_multiple_subject_quartiles_are_not_silently_collapsed():
    quartiles, _ = _quartiles_from_scopus(
        {"entry": [{"quartile": ["Q1", "Q2"]}]},
    )
    assert quartiles == {"Q1", "Q2"}
