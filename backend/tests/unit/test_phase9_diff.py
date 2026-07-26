from types import SimpleNamespace
from uuid import uuid4

from app.services.diff_engine import ScheduleDiffEngine


class _Query:
    def filter(self, *_args):
        return self

    def all(self):
        return []


class _Db:
    def query(self, *_args):
        return _Query()


def test_diff_reports_moves_resources_and_score_delta(monkeypatch):
    section_id = uuid4()
    subject_id = uuid4()
    teacher_a = str(uuid4())
    teacher_b = str(uuid4())
    room_a = str(uuid4())
    room_b = str(uuid4())
    version_a = SimpleNamespace(id=uuid4(), version_label="v1", scores={"overall_score": 72, "soft_violations": 4})
    version_b = SimpleNamespace(id=uuid4(), version_label="Draft", scores={"overall_score": 81, "soft_violations": 2})
    before = {
        "id": str(uuid4()), "section_id": str(section_id), "subject_id": str(subject_id),
        "teacher_id": teacher_a, "room_id": room_a, "day": "Monday", "period": 1,
        "duration_periods": 1,
    }
    after = {**before, "teacher_id": teacher_b, "room_id": room_b, "day": "Tuesday", "period": 3}
    engine = ScheduleDiffEngine(_Db())
    monkeypatch.setattr(engine, "_index", lambda version_id: {f"{section_id}:{subject_id}:0": before if version_id == version_a.id else after})

    report = engine.diff(version_a, version_b)

    assert report.moved_count == 1
    assert report.changed_count == 1
    assert report.score_delta == 9
    assert report.soft_violation_delta == -2
    assert {item["resource_id"] for item in report.affected_resources} == {teacher_a, teacher_b, room_a, room_b}


def test_score_delta_handles_missing_or_non_numeric_scores():
    assert ScheduleDiffEngine._score_delta({}, {"overall_score": 10}) is None
    assert ScheduleDiffEngine._score_delta({"overall_score": "bad"}, {"overall_score": 10}) is None
