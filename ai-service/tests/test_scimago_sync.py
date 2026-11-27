from app.services.scimago_sync import _snapshot_year, _validate_export


def test_scimago_export_is_validated_by_required_columns():
    content = "Rank;Title;Issn;SJR Best Quartile;Total Docs. (2025)\n1;Example;12345678;Q2;10\n"
    valid, message = _validate_export(content)
    assert valid is True
    assert "1 journal records" in message
    assert _snapshot_year(content) == 2025


def test_invalid_scimago_export_is_rejected():
    valid, message = _validate_export("Rank;Title\n1;Example\n")
    assert valid is False
    assert "thiếu cột" in message
