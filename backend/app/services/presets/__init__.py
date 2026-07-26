from app.services.presets.base import BasePreset, BaseSolverAdapter
from app.services.presets.academic import AcademicPreset, AcademicSolverAdapter
from app.services.presets.staff_roster import StaffRosterPreset, StaffRosterAdapter
from app.services.presets.event import EventPreset, EventSchedulingAdapter
from app.services.presets.exam import ExamPreset, ExamSchedulingAdapter
from app.services.presets.facility import FacilityPreset, FacilitySolverAdapter

PRESET_REGISTRY = {
    "academic": AcademicPreset,
    "staff_roster": StaffRosterPreset,
    "event": EventPreset,
    "exam": ExamPreset,
    "facility": FacilityPreset,
}

def get_preset(preset_key: str) -> type[BasePreset]:
    return PRESET_REGISTRY.get(preset_key, AcademicPreset)

def get_preset_adapter(preset_key: str) -> type[BaseSolverAdapter]:
    preset = get_preset(preset_key)
    return preset.solver_adapter

def get_preset_types(preset_key: str) -> dict:
    preset = get_preset(preset_key)
    return {
        "resource_type": preset.resource_type,
        "task_type": preset.task_type,
        "group_type": preset.group_type,
        "location_types": preset.location_types
    }

