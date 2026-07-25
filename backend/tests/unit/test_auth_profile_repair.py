import uuid

from app.core import auth
from app.models.organization import Organization


class _Query:
    def __init__(self, value):
        self.value = value

    def filter(self, *_args):
        return self

    def first(self):
        return self.value


class _Db:
    def __init__(self, organization):
        self.organization = organization
        self.added = []

    def query(self, model):
        return _Query(self.organization if model is Organization else None)

    def add(self, value):
        self.added.append(value)

    def flush(self):
        return None

    def commit(self):
        return None

    def refresh(self, _value):
        return None


def test_repairs_only_against_the_existing_demo_organization():
    organization = Organization(id=uuid.uuid4(), name="SlotForge Demo University")
    db = _Db(organization)
    user_id = uuid.uuid4()

    profile = auth._repair_demo_profile(db, user_id, {"user_metadata": {"full_name": "Demo Admin"}})

    assert profile is not None
    assert profile.id == user_id
    assert profile.organization_id == organization.id
    assert profile.role == "org_admin"
    assert len(db.added) == 2
