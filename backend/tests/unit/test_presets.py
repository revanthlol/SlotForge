import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.db import Base
from app.models.workspace import SchedulingWorkspace
from app.services.presets import (
    PRESET_REGISTRY,
    get_preset,
    get_preset_adapter,
    get_preset_types,
)
from app.services.presets.base import BasePreset, BaseSolverAdapter
from app.services.presets.academic import AcademicPreset, AcademicSolverAdapter
from app.services.presets.staff_roster import StaffRosterPreset, StaffRosterAdapter
from app.services.presets.event import EventPreset, EventSchedulingAdapter
from app.services.presets.exam import ExamPreset, ExamSchedulingAdapter
from app.services.presets.facility import FacilityPreset, FacilitySolverAdapter

# Create an in-memory SQLite database for testing db-related functions
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_preset_registry_contents():
    # Verify that all 5 presets are registered
    assert "academic" in PRESET_REGISTRY
    assert "staff_roster" in PRESET_REGISTRY
    assert "event" in PRESET_REGISTRY
    assert "exam" in PRESET_REGISTRY
    assert "facility" in PRESET_REGISTRY

    assert PRESET_REGISTRY["academic"] == AcademicPreset
    assert PRESET_REGISTRY["staff_roster"] == StaffRosterPreset
    assert PRESET_REGISTRY["event"] == EventPreset
    assert PRESET_REGISTRY["exam"] == ExamPreset
    assert PRESET_REGISTRY["facility"] == FacilityPreset

def test_get_preset():
    # Should return requested preset, or default to AcademicPreset if not found
    assert get_preset("academic") == AcademicPreset
    assert get_preset("staff_roster") == StaffRosterPreset
    assert get_preset("invalid_preset") == AcademicPreset

def test_preset_subclasses_and_properties():
    for key, preset_cls in PRESET_REGISTRY.items():
        assert issubclass(preset_cls, BasePreset)
        assert preset_cls.key == key
        assert isinstance(preset_cls.name, str)
        assert isinstance(preset_cls.description, str)
        assert issubclass(preset_cls.solver_adapter, BaseSolverAdapter)
        
        # Test get_preset_types helper
        types = get_preset_types(key)
        assert "resource_type" in types
        assert "task_type" in types
        assert "group_type" in types
        assert "location_types" in types
        
        assert isinstance(types["resource_type"], str)
        assert isinstance(types["task_type"], str)
        assert isinstance(types["group_type"], str)
        assert isinstance(types["location_types"], list)

def test_get_preset_adapter():
    assert get_preset_adapter("academic") == AcademicSolverAdapter
    assert get_preset_adapter("staff_roster") == StaffRosterAdapter
    assert get_preset_adapter("event") == EventSchedulingAdapter
    assert get_preset_adapter("exam") == ExamSchedulingAdapter
    assert get_preset_adapter("facility") == FacilitySolverAdapter
    assert get_preset_adapter("invalid_preset") == AcademicSolverAdapter

def test_preset_adapters_instantiation():
    for key in PRESET_REGISTRY.keys():
        adapter_cls = get_preset_adapter(key)
        adapter = adapter_cls()
        assert isinstance(adapter, BaseSolverAdapter)
