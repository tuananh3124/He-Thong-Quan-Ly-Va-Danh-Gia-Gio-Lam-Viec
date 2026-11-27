from app.services.teaching_assignment import _deduplicate_rows, _row_from_mapping


def test_assignment_parser_rejects_placeholder_and_shifted_course_names():
    base = {"lecturer_name": "TS. Nguyễn Văn A", "periods": "15"}

    assert _row_from_mapping({**base, "course_name": "Không có"}, 1) is None
    assert _row_from_mapping({**base, "course_name": "3 - 1"}, 2) is None
    assert _row_from_mapping({**base, "course_name": "Địa phương học"}, 3) is not None


def test_assignment_parser_removes_exact_duplicate_rows_but_keeps_components():
    rows = [
        {
            "lecturer_name": "TS. Nguyễn Văn A",
            "course_name": "Địa phương học",
            "class_name": "1",
            "education_level": "Tiến sĩ",
            "periods": 45,
            "theory_periods": 45,
            "practical_periods": None,
            "self_study_periods": None,
        },
        {
            "lecturer_name": "TS. Nguyễn Văn A",
            "course_name": "Địa phương học",
            "class_name": "1",
            "education_level": "Tiến sĩ",
            "periods": 45,
            "theory_periods": 45,
            "practical_periods": None,
            "self_study_periods": None,
        },
        {
            "lecturer_name": "TS. Nguyễn Văn A",
            "course_name": "Địa phương học",
            "class_name": "1",
            "education_level": "Tiến sĩ",
            "periods": 15,
            "theory_periods": None,
            "practical_periods": 15,
            "self_study_periods": None,
        },
    ]

    unique, removed = _deduplicate_rows(rows)

    assert removed == 1
    assert len(unique) == 2
