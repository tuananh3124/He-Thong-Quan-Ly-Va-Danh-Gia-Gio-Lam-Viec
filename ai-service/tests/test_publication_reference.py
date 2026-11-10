from app.services.publication_reference import classify_publication_item


def test_scopus_article_maps_to_table_1_1():
    result = classify_publication_item(
        "Journal of Ethnobiology and Ethnomedicine Scopus DOI article",
        "Journal of Ethnobiology and Ethnomedicine",
    )
    assert result["publication_item_code"] == "1.1"
    assert result["suggested_rule_code"] == "RESEARCH_ARTICLE_ISI_SCOPUS"


def test_international_reviewed_report_maps_to_table_2_2():
    result = classify_publication_item(
        "Kỷ yếu hội thảo khoa học quốc tế có phản biện",
        "Kỷ yếu hội thảo khoa học quốc tế",
    )
    assert result["publication_item_code"] == "2.2"
    assert result["suggested_rule_code"] == "RESEARCH_CONFERENCE_INTERNATIONAL_REVIEWED"


def test_national_isbn_report_maps_to_table_2_3():
    result = classify_publication_item(
        "Kỷ yếu hội nghị khoa học quốc gia ISBN có phản biện",
        "Kỷ yếu hội nghị khoa học quốc gia",
    )
    assert result["publication_item_code"] == "2.3"
    assert result["suggested_rule_code"] == "RESEARCH_CONFERENCE_NATIONAL_ISBN"


def test_domestic_article_without_point_level_requires_review():
    result = classify_publication_item(
        "Bài báo DOI đăng tại tạp chí khoa học xã hội Việt Nam",
        "Tạp chí Khoa học xã hội Việt Nam",
    )
    assert result["publication_item_code"] == "1.5"
    assert result["needs_review"] is True
