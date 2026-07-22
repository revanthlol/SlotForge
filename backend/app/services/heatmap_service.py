import uuid
import math
from datetime import datetime
from collections import defaultdict
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session

from app.models.workspace import SchedulingWorkspace
from app.models.resource import Resource
from app.models.location import Location
from app.models.task import Task
from app.models.group import Group
from app.models.timeslot import TimeSlot as DbTimeSlot
from app.models.constraint_rule import ConstraintRule
from app.models.schedule_run import ScheduleRun
from app.models.assignment import (
    Assignment as DbAssignment,
    SectionSubjectTeacherAssignment,
    TeacherSubjectAssignment
)
from app.schemas.heatmap import (
    SchedulingPressureReport, PressureItem, PressureSummary,
    ViolationReport, ViolationItem, HeatmapCell,
    ImpactAnalysisReport, AssignmentExplanationReport
)
from app.services.presets import get_preset_adapter

class HeatmapService:
    @staticmethod
    def calculate_pressure_report(workspace_id: uuid.UUID, db: Session) -> SchedulingPressureReport:
        workspace = db.query(SchedulingWorkspace).filter(SchedulingWorkspace.id == workspace_id).first()
        if not workspace:
            return SchedulingPressureReport(items=[])

        # Ensure timeslots exist using the preset adapter
        adapter_cls = get_preset_adapter(workspace.domain_preset or "academic")
        adapter = adapter_cls()
        db_timeslots = adapter.ensure_timeslots_exist(workspace_id, db)
        total_slots = len(db_timeslots)

        # Load workspace entities
        db_teachers = db.query(Resource).filter(
            Resource.workspace_id == workspace_id,
            Resource.resource_type == "teacher"
        ).all()
        db_rooms = db.query(Location).filter(Location.workspace_id == workspace_id).all()
        db_subjects = db.query(Task).filter(
            Task.workspace_id == workspace_id,
            Task.task_type == "subject"
        ).all()
        db_sections = db.query(Group).filter(
            Group.workspace_id == workspace_id,
            Group.group_type == "section"
        ).all()
        db_constraints = db.query(ConstraintRule).filter(
            ConstraintRule.workspace_id == workspace_id,
            ConstraintRule.enabled
        ).all()
        db_ssta = db.query(SectionSubjectTeacherAssignment).filter(
            SectionSubjectTeacherAssignment.workspace_id == workspace_id
        ).all()

        subject_hours = {s.id: (s.weekly_hours or 0) for s in db_subjects}
        subject_names = {s.id: s.name for s in db_subjects}
        subject_room_type = {}
        for c in db_constraints:
            if c.template_key == "subject_requires_room_type":
                sub_id = c.parameters.get("subject_id")
                room_type = c.parameters.get("room_type")
                if sub_id and room_type:
                    try:
                        subject_room_type[uuid.UUID(sub_id)] = room_type
                    except ValueError:
                        pass

        preferred_rooms_map = {}
        for c in db_constraints:
            if c.template_key == "preferred_room" and c.rule_type == "hard":
                r_id = c.parameters.get("room_id")
                sub_id = c.parameters.get("subject_id")
                if r_id and sub_id:
                    try:
                        preferred_rooms_map[uuid.UUID(sub_id)] = uuid.UUID(r_id)
                    except ValueError:
                        pass

        # 1. Teacher Load Pressure
        teacher_required_hours = defaultdict(int)
        for ssta in db_ssta:
            if ssta.teacher_id:
                teacher_required_hours[ssta.teacher_id] += subject_hours.get(ssta.subject_id, 0)

        teacher_unavail_counts = defaultdict(int)
        for c in db_constraints:
            if c.template_key == "teacher_unavailable":
                t_id_str = c.parameters.get("teacher_id")
                if t_id_str:
                    try:
                        t_id = uuid.UUID(t_id_str)
                        teacher_unavail_counts[t_id] += 1
                    except ValueError:
                        pass

        items: List[PressureItem] = []
        warnings: List[str] = []

        total_teacher_util = 0.0
        active_teachers_count = 0
        for teacher in db_teachers:
            required = teacher_required_hours[teacher.id]
            unavail = teacher_unavail_counts[teacher.id]
            available = max(0, total_slots - unavail)
            utilization = (required / available) * 100 if available > 0 else (100.0 if required > 0 else 0.0)
            
            severity = "none"
            if utilization >= 100:
                severity = "critical"
                warnings.append(f"Teacher {teacher.name} is overloaded: needs {required} periods but only {available} are available.")
            elif utilization >= 85:
                severity = "high"
            elif utilization >= 60:
                severity = "medium"
            elif utilization >= 30:
                severity = "low"

            items.append(PressureItem(
                id=str(teacher.id),
                type="teacher",
                name=teacher.name,
                required=required,
                available=available,
                utilization=round(utilization, 1),
                severity=severity,
                message=f"teaching load {required}h/week vs {available} available"
            ))
            if required > 0:
                total_teacher_util += utilization
                active_teachers_count += 1

        avg_teacher_util = (total_teacher_util / active_teachers_count) if active_teachers_count > 0 else 0.0

        # 2. Section Load Pressure
        section_required_hours = defaultdict(int)
        for ssta in db_ssta:
            section_required_hours[ssta.section_id] += subject_hours.get(ssta.subject_id, 0)

        total_section_util = 0.0
        for sec in db_sections:
            required = section_required_hours[sec.id]
            available = total_slots
            utilization = (required / available) * 100 if available > 0 else (100.0 if required > 0 else 0.0)

            severity = "none"
            if utilization > 100:
                severity = "critical"
                warnings.append(f"Section {sec.name} is overloaded: requires {required} periods but cycle only has {available}.")
            elif utilization >= 85:
                severity = "high"
            elif utilization >= 70:
                severity = "medium"
            elif utilization >= 30:
                severity = "low"

            items.append(PressureItem(
                id=str(sec.id),
                type="section",
                name=sec.name,
                required=required,
                available=available,
                utilization=round(utilization, 1),
                severity=severity,
                message=f"load demand {required} periods vs {available} in cycle"
            ))
            total_section_util += utilization

        avg_section_util = (total_section_util / len(db_sections)) if db_sections else 0.0

        # 3. Room Demand Pressure
        room_demand = defaultdict(float)
        section_size_map = {sec.id: (sec.size or 0) for sec in db_sections}
        section_names = {sec.id: sec.name for sec in db_sections}

        for ssta in db_ssta:
            hours = subject_hours.get(ssta.subject_id, 0)
            if hours == 0:
                continue
            target_type = subject_room_type.get(ssta.subject_id, "classroom")
            pref_room_id = preferred_rooms_map.get(ssta.subject_id)
            sec_size = section_size_map.get(ssta.section_id, 0)

            # Find compatible rooms
            compatible_rooms = []
            for r in db_rooms:
                if pref_room_id and r.id != pref_room_id:
                    continue
                if r.location_type != target_type:
                    continue
                if r.capacity < sec_size:
                    continue
                compatible_rooms.append(r)

            if compatible_rooms:
                share = hours / len(compatible_rooms)
                for r in compatible_rooms:
                    room_demand[r.id] += share
            else:
                sec_name = section_names.get(ssta.section_id, "Unknown Section")
                sub_name = subject_names.get(ssta.subject_id, "Unknown Subject")
                warnings.append(f"No compatible room found for Section {sec_name} Subject {sub_name} (Section size: {sec_size}, Room Type: {target_type}).")
                # Distribute fallback to all rooms of that type
                fallback_rooms = [r for r in db_rooms if r.location_type == target_type]
                if fallback_rooms:
                    share = hours / len(fallback_rooms)
                    for r in fallback_rooms:
                        room_demand[r.id] += share

        total_room_util = 0.0
        for room in db_rooms:
            demand = room_demand[room.id]
            capacity = total_slots
            utilization = (demand / capacity) * 100 if capacity > 0 else 0.0

            severity = "none"
            if utilization >= 100:
                severity = "critical"
            elif utilization >= 85:
                severity = "high"
            elif utilization >= 60:
                severity = "medium"
            elif utilization >= 30:
                severity = "low"

            items.append(PressureItem(
                id=str(room.id),
                type="room",
                name=room.name,
                demand=round(demand, 1),
                capacity=capacity,
                utilization=round(utilization, 1),
                severity=severity,
                message=f"demand {round(demand, 1)} periods vs {capacity} capacity"
            ))
            total_room_util += utilization

        avg_room_util = (total_room_util / len(db_rooms)) if db_rooms else 0.0

        # 4. Lab Availability Pressure
        lab_rooms = [r for r in db_rooms if r.location_type == "lab"]
        total_lab_util = 0.0
        for lab in lab_rooms:
            # We assume lab subjects require 2 consecutive periods sessions by default
            session_length = 2
            needed_blocks = 0.0

            # Count requirements demanding lab
            for ssta in db_ssta:
                target_type = subject_room_type.get(ssta.subject_id, "classroom")
                if target_type == "lab":
                    hours = subject_hours.get(ssta.subject_id, 0)
                    sessions = math.ceil(hours / session_length)
                    
                    # check if this lab is compatible with section
                    sec_size = section_size_map.get(ssta.section_id, 0)
                    compatible_labs = [candidate for candidate in lab_rooms if candidate.capacity >= sec_size]
                    if lab in compatible_labs:
                        needed_blocks += sessions / len(compatible_labs)

            # Available consecutive blocks in slot grid
            slots_by_day = defaultdict(list)
            for ts in db_timeslots:
                slots_by_day[ts.day].append(ts.slot_index)
            
            available_blocks = 0
            for p_indices in slots_by_day.values():
                sorted_periods = sorted(set(p_indices))
                run_length = 0
                previous_period = None
                for current_period in sorted_periods:
                    if previous_period is None or current_period == previous_period + 1:
                        run_length += 1
                    else:
                        available_blocks += run_length // session_length
                        run_length = 1
                    previous_period = current_period
                available_blocks += run_length // session_length

            utilization = (
                (needed_blocks / available_blocks) * 100
                if available_blocks > 0
                else (100.0 if needed_blocks > 0 else 0.0)
            )
            
            severity = "none"
            if utilization >= 100:
                severity = "critical"
                warnings.append(f"Lab {lab.name} is over-committed: needs {round(needed_blocks, 1)} blocks but only {available_blocks} are available.")
            elif utilization >= 85:
                severity = "high"
            elif utilization >= 60:
                severity = "medium"
            elif utilization >= 30:
                severity = "low"

            items.append(PressureItem(
                id=str(lab.id),
                type="lab",
                name=lab.name,
                demand=round(needed_blocks, 1),
                capacity=available_blocks,
                utilization=round(utilization, 1),
                severity=severity,
                message=f"needs {round(needed_blocks, 1)} consecutive blocks vs {available_blocks} available"
            ))
            total_lab_util += utilization

        avg_lab_util = (total_lab_util / len(lab_rooms)) if lab_rooms else 0.0

        # Construct summary cards
        summary = [
            PressureSummary(label="Teacher Load Pressure", value=round(avg_teacher_util, 1), severity=SelfSeverity(avg_teacher_util)),
            PressureSummary(label="Room Demand Pressure", value=round(avg_room_util, 1), severity=SelfSeverity(avg_room_util)),
            PressureSummary(label="Section Weekly-Hour Pressure", value=round(avg_section_util, 1), severity=SelfSeverity(avg_section_util))
        ]
        if lab_rooms:
            summary.append(PressureSummary(label="Lab Availability Pressure", value=round(avg_lab_util, 1), severity=SelfSeverity(avg_lab_util)))

        overall_score = round(100 - max(0.0, min(100.0, max(avg_teacher_util, avg_room_util, avg_section_util))))

        return SchedulingPressureReport(
            generated_at=datetime.utcnow(),
            overall_score=overall_score,
            items=items,
            summary=summary,
            warnings=warnings
        )

    @staticmethod
    def calculate_violations_report(workspace_id: uuid.UUID, run_id: uuid.UUID, db: Session) -> ViolationReport:
        run = db.query(ScheduleRun).filter(
            ScheduleRun.id == run_id,
            ScheduleRun.workspace_id == workspace_id
        ).first()
        if not run or not run.schedule_version_id:
            return ViolationReport(violations=[], heatmap=[])

        # Load active schedule assignments
        assignments = db.query(DbAssignment).filter(
            DbAssignment.schedule_version_id == run.schedule_version_id
        ).all()

        # Load entities
        db_teachers = db.query(Resource).filter(Resource.workspace_id == workspace_id, Resource.resource_type == "teacher").all()
        db_rooms = db.query(Location).filter(Location.workspace_id == workspace_id).all()
        db_subjects = db.query(Task).filter(Task.workspace_id == workspace_id, Task.task_type == "subject").all()
        db_sections = db.query(Group).filter(Group.workspace_id == workspace_id, Group.group_type == "section").all()
        db_timeslots = db.query(DbTimeSlot).filter(DbTimeSlot.workspace_id == workspace_id).all()
        db_constraints = db.query(ConstraintRule).filter(ConstraintRule.workspace_id == workspace_id, ConstraintRule.enabled).all()

        teacher_names = {t.id: t.name for t in db_teachers}
        room_names = {r.id: r.name for r in db_rooms}
        subject_names = {s.id: s.name for s in db_subjects}
        section_names = {sec.id: sec.name for sec in db_sections}
        section_hours = defaultdict(int)
        for a in assignments:
            section_hours[a.section_id] += a.duration_periods or 1

        violations: List[ViolationItem] = []

        # 1. Teacher Gap Minimization Violation Check
        teacher_day_periods = defaultdict(list)
        for a in assignments:
            for offset in range(a.duration_periods or 1):
                teacher_day_periods[(a.teacher_id, a.day)].append(a.period + offset)

        for (teacher_id, day), periods in teacher_day_periods.items():
            if len(periods) <= 1:
                continue
            unique_periods = sorted(list(set(periods)))
            p_min = unique_periods[0]
            p_max = unique_periods[-1]
            span = p_max - p_min + 1
            if span > len(unique_periods):
                # We have gaps
                t_name = teacher_names.get(teacher_id, "Unknown Teacher")
                missing_periods = [p for p in range(p_min, p_max + 1) if p not in unique_periods]
                for gp in missing_periods:
                    violations.append(ViolationItem(
                        severity="warning",
                        constraint_type="teacher_gap_minimization",
                        message=f"{t_name} has a scheduling gap on {day} at period {gp}.",
                        day=day,
                        period=gp,
                        resource_name=t_name
                    ))

        # 2. Daily Load Balancing Violation Check
        section_day_periods = defaultdict(int)
        for a in assignments:
            section_day_periods[(a.section_id, a.day)] += a.duration_periods or 1

        days_in_cycle = len(set(ts.day for ts in db_timeslots)) if db_timeslots else 5
        for (sec_id, day), count in section_day_periods.items():
            total_hours = section_hours[sec_id]
            max_ideal = math.ceil(total_hours / days_in_cycle) if days_in_cycle > 0 else 5
            if count > max_ideal:
                sec_name = section_names.get(sec_id, "Unknown Section")
                violations.append(ViolationItem(
                    severity="warning",
                    constraint_type="daily_load_balancing",
                    message=f"Section {sec_name} has {count} periods scheduled on {day} (ideal daily max is {max_ideal}).",
                    day=day,
                    resource_name=sec_name
                ))

        # 3. Soft Teacher Unavailability Check
        soft_unavail_constraints = [c for c in db_constraints if c.template_key == "teacher_unavailable" and c.rule_type == "soft"]
        scheduled_slots = {
            (a.teacher_id, a.day, a.period + offset)
            for a in assignments
            for offset in range(a.duration_periods or 1)
        }
        for c in soft_unavail_constraints:
            t_id_str = c.parameters.get("teacher_id")
            day = c.parameters.get("day")
            period = c.parameters.get("period")
            if t_id_str and day and period is not None:
                try:
                    t_id = uuid.UUID(t_id_str)
                    if (t_id, day, period) in scheduled_slots:
                        t_name = teacher_names.get(t_id, "Unknown Teacher")
                        violations.append(ViolationItem(
                            severity="high",
                            constraint_type="teacher_unavailable",
                            message=f"{t_name} is scheduled on {day} period {period} despite soft unavailability preference.",
                            day=day,
                            period=period,
                            resource_name=t_name
                        ))
                except ValueError:
                    pass

        # 4. Soft Preferred Room Check
        soft_pref_rooms = [c for c in db_constraints if c.template_key == "preferred_room" and c.rule_type == "soft"]
        for c in soft_pref_rooms:
            r_id_str = c.parameters.get("room_id")
            sub_id_str = c.parameters.get("subject_id")
            if r_id_str and sub_id_str:
                try:
                    r_id = uuid.UUID(r_id_str)
                    sub_id = uuid.UUID(sub_id_str)
                    for a in assignments:
                        if a.subject_id == sub_id and a.room_id != r_id:
                            sub_name = subject_names.get(sub_id, "Unknown Subject")
                            actual_name = room_names.get(a.room_id, "none")
                            pref_name = room_names.get(r_id, "Unknown Room")
                            violations.append(ViolationItem(
                                severity="warning",
                                constraint_type="preferred_room",
                                message=f"Subject {sub_name} is scheduled in room {actual_name} instead of preferred room {pref_name}.",
                                day=a.day,
                                period=a.period,
                                resource_name=sub_name
                            ))
                except ValueError:
                    pass

        # 5. Timetable grid utilization heatmap cells
        # utilization = (number of occupied rooms / total number of rooms) * 100
        total_rooms_count = len(db_rooms)
        
        # Unique days and periods from timeslots
        days = sorted(list(set(ts.day for ts in db_timeslots)))
        periods = sorted(list(set(ts.slot_index for ts in db_timeslots)))

        heatmap: List[HeatmapCell] = []
        for day in days:
            for period in periods:
                occupied_rooms_set = set()
                for a in assignments:
                    if a.day == day:
                        # Check overlap with duration
                        start = a.period
                        end = a.period + (a.duration_periods or 1)
                        if start <= period < end:
                            if a.room_id and str(a.room_id) != "none":
                                occupied_rooms_set.add(a.room_id)

                occ_count = len(occupied_rooms_set)
                util = (occ_count / total_rooms_count) * 100 if total_rooms_count > 0 else 0.0
                label = f"{occ_count}/{total_rooms_count} rooms occupied"
                
                heatmap.append(HeatmapCell(
                    day=day,
                    period=period,
                    value=round(util, 1),
                    label=label,
                    severity=SelfSeverity(util)
                ))

        overall_score = run.solver_score.get("overall_score", 100) if run.solver_score else 100

        return ViolationReport(
            score=overall_score,
            generated_at=datetime.utcnow(),
            violations=violations,
            heatmap=heatmap,
            summary=[f"{len(violations)} soft constraint violations detected."]
        )

    @staticmethod
    def calculate_impact_report(workspace_id: uuid.UUID, payload: Dict[str, Any], db: Session) -> ImpactAnalysisReport:
        change_type = payload.get("change_type", "preview")
        entity_id_str = payload.get("entity_id")
        new_value = payload.get("new_value")

        latest_run = db.query(ScheduleRun).filter(
            ScheduleRun.workspace_id == workspace_id,
            ScheduleRun.status == "success"
        ).order_by(ScheduleRun.created_at.desc()).first()

        conflicts: List[ViolationItem] = []
        suggested_actions: List[str] = []

        if change_type == "preview":
            return ImpactAnalysisReport(
                feasible=True,
                change_type=change_type,
                message="Preview mode: No live conflicts in current sandbox state.",
                conflicts=[],
                suggested_actions=["Make specific entity edits to inspect merge impacts."]
            )

        # Helper to parse uuid safely
        def get_uuid(val: Any) -> Optional[uuid.UUID]:
            try:
                return uuid.UUID(str(val)) if val else None
            except ValueError:
                return None

        entity_id = get_uuid(entity_id_str)

        if not entity_id:
            return ImpactAnalysisReport(
                feasible=False,
                change_type=change_type,
                message="An entity_id is required for a specific impact analysis.",
                conflicts=[ViolationItem(
                    severity="critical",
                    message="The requested change did not identify a teacher or room in this workspace.",
                )],
                suggested_actions=["Select a workspace entity and submit the change again."],
            )

        if change_type in {"teacher_availability", "teacher_subject"}:
            entity = db.query(Resource).filter(
                Resource.id == entity_id,
                Resource.workspace_id == workspace_id,
                Resource.resource_type == "teacher",
            ).first()
        else:
            entity = db.query(Location).filter(
                Location.id == entity_id,
                Location.workspace_id == workspace_id,
            ).first()
        if not entity:
            return ImpactAnalysisReport(
                feasible=False,
                change_type=change_type,
                message="The requested entity does not belong to this workspace.",
                conflicts=[ViolationItem(
                    severity="critical",
                    message="Impact analysis was rejected because the entity is outside the active workspace.",
                )],
                suggested_actions=["Select an entity from the active workspace and try again."],
            )

        proposed_room_capacity: Optional[int] = None
        if change_type == "room_capacity":
            try:
                proposed_room_capacity = int(new_value)
            except (TypeError, ValueError):
                return ImpactAnalysisReport(
                    feasible=False,
                    change_type=change_type,
                    message="Room capacity must be a non-negative integer.",
                    conflicts=[ViolationItem(
                        severity="critical",
                        message="The proposed room capacity is invalid.",
                        resource_name=entity.name,
                    )],
                    suggested_actions=["Enter a whole-number room capacity and try again."],
                )
            if proposed_room_capacity < 0:
                return ImpactAnalysisReport(
                    feasible=False,
                    change_type=change_type,
                    message="Room capacity must be a non-negative integer.",
                    conflicts=[ViolationItem(
                        severity="critical",
                        message="The proposed room capacity cannot be negative.",
                        resource_name=entity.name,
                    )],
                    suggested_actions=["Enter zero or a positive room capacity."],
                )

        # If no active schedule assignments, run pre-flight structural checks
        if not latest_run or not latest_run.schedule_version_id:
            # We perform pre-flight checks
            if change_type == "teacher_availability" and entity_id:
                # new_value is list of unavailable slots or single slots
                # Check teacher load
                teacher = db.query(Resource).filter(
                    Resource.id == entity_id,
                    Resource.workspace_id == workspace_id,
                    Resource.resource_type == "teacher",
                ).first()
                if teacher:
                    ssta_list = db.query(SectionSubjectTeacherAssignment).filter(
                        SectionSubjectTeacherAssignment.workspace_id == workspace_id,
                        SectionSubjectTeacherAssignment.teacher_id == entity_id
                    ).all()
                    db_subjects = db.query(Task).filter(Task.workspace_id == workspace_id, Task.task_type == "subject").all()
                    subject_hours = {s.id: (s.weekly_hours or 0) for s in db_subjects}
                    required = sum(subject_hours.get(a.subject_id, 0) for a in ssta_list)

                    db_timeslots = db.query(DbTimeSlot).filter(DbTimeSlot.workspace_id == workspace_id).all()
                    total_slots = len(db_timeslots)

                    # Estimate unavailable slots count based on new_value
                    unavail_count = 0
                    if isinstance(new_value, list):
                        unavail_count = len(new_value)
                    elif isinstance(new_value, dict):
                        unavail_count = 1

                    available = max(0, total_slots - unavail_count)
                    if required > available:
                        conflicts.append(ViolationItem(
                            severity="critical",
                            message=f"{teacher.name} would have only {available} slots available, but requires {required} periods.",
                            resource_name=teacher.name
                        ))
                        suggested_actions.extend([
                            f"Assign a co-teacher to teach some subjects for {teacher.name}",
                            "Increase timeslots count in the scheduling cycle length."
                        ])

            feasible = len(conflicts) == 0
            return ImpactAnalysisReport(
                feasible=feasible,
                change_type=change_type,
                message="Impact analysis pre-flight complete (no generated timetable version active)." if feasible else "Pre-flight checks identified capacity limits.",
                conflicts=conflicts,
                suggested_actions=suggested_actions
            )

        # Load active assignments
        assignments = db.query(DbAssignment).filter(
            DbAssignment.schedule_version_id == latest_run.schedule_version_id
        ).all()

        if change_type == "teacher_availability" and entity_id:
            teacher = db.query(Resource).filter(
                Resource.id == entity_id,
                Resource.workspace_id == workspace_id,
                Resource.resource_type == "teacher",
            ).first()
            if teacher:
                # new_value can specify day/period that are marked unavailable
                unavail_slots = set()
                if isinstance(new_value, list):
                    for item in new_value:
                        if isinstance(item, dict):
                            day = item.get("day")
                            period = item.get("period")
                            if day and period is not None:
                                unavail_slots.add((day, period))
                elif isinstance(new_value, dict):
                    day = new_value.get("day")
                    period = new_value.get("period")
                    if day and period is not None:
                        unavail_slots.add((day, period))

                for a in assignments:
                    if a.teacher_id == entity_id:
                        for offset in range(a.duration_periods or 1):
                            if (a.day, a.period + offset) in unavail_slots:
                                conflicts.append(ViolationItem(
                                    severity="critical",
                                    message=f"{teacher.name} is scheduled on {a.day} Period {a.period + offset} but is now marked unavailable.",
                                    day=a.day,
                                    period=a.period + offset,
                                    resource_name=teacher.name
                                ))

                if conflicts:
                    suggested_actions.extend([
                        "Re-run solver to migrate clashing assignments.",
                        f"Manually move the clashing assignments of {teacher.name} to another slot."
                    ])

        elif change_type == "room_capacity" and entity_id:
            room = db.query(Location).filter(
                Location.id == entity_id,
                Location.workspace_id == workspace_id,
            ).first()
            if room:
                new_cap = proposed_room_capacity if proposed_room_capacity is not None else room.capacity
                db_sections = db.query(Group).filter(Group.workspace_id == workspace_id, Group.group_type == "section").all()
                section_sizes = {sec.id: (sec.size or 0) for sec in db_sections}
                section_names = {sec.id: sec.name for sec in db_sections}

                for a in assignments:
                    if a.room_id == entity_id:
                        sec_size = section_sizes.get(a.section_id, 0)
                        if sec_size > new_cap:
                            sec_name = section_names.get(a.section_id, "Unknown Section")
                            conflicts.append(ViolationItem(
                                severity="high",
                                message=f"Room {room.name} new capacity ({new_cap}) is insufficient for Section {sec_name} (size: {sec_size}) at {a.day} Period {a.period}.",
                                day=a.day,
                                period=a.period,
                                resource_name=room.name
                            ))

                if conflicts:
                    suggested_actions.extend([
                        "Re-run solver to assign compatible room sizes.",
                        f"Manually move affected classes to a room with capacity >= {max(section_sizes.values(), default=0)}."
                    ])

        elif change_type == "teacher_subject" and entity_id:
            # teacher_subject requirement changed
            # if a teacher is unassigned from a subject that is currently scheduled
            sub_id = get_uuid(payload.get("subject_id") or (new_value.get("subject_id") if isinstance(new_value, dict) else None))
            if sub_id:
                # check if teacher is no longer qualified
                qualified = db.query(TeacherSubjectAssignment).filter(
                    TeacherSubjectAssignment.workspace_id == workspace_id,
                    TeacherSubjectAssignment.teacher_id == entity_id,
                    TeacherSubjectAssignment.subject_id == sub_id
                ).first()
                # If they were deleted, we flag the scheduled slots
                if not qualified:
                    teacher = db.query(Resource).filter(
                        Resource.id == entity_id,
                        Resource.workspace_id == workspace_id,
                        Resource.resource_type == "teacher",
                    ).first()
                    subject = db.query(Task).filter(
                        Task.id == sub_id,
                        Task.workspace_id == workspace_id,
                    ).first()
                    t_name = teacher.name if teacher else "Teacher"
                    sub_name = subject.name if subject else "Subject"

                    for a in assignments:
                        if a.teacher_id == entity_id and a.subject_id == sub_id:
                            conflicts.append(ViolationItem(
                                severity="high",
                                message=f"{t_name} is scheduled for {sub_name} on {a.day} Period {a.period} but is no longer qualified.",
                                day=a.day,
                                period=a.period,
                                resource_name=t_name
                            ))

                    if conflicts:
                        suggested_actions.append("Reassign the subject to a qualified teacher or re-run solver.")

        feasible = len(conflicts) == 0
        return ImpactAnalysisReport(
            feasible=feasible,
            change_type=change_type,
            message="No live conflicts identified. Changes are clean." if feasible else "Proposed changes clash with existing active assignments.",
            conflicts=conflicts,
            suggested_actions=suggested_actions
        )

    @staticmethod
    def calculate_explanation_report(workspace_id: uuid.UUID, run_id: uuid.UUID, assignment_id: uuid.UUID, db: Session) -> AssignmentExplanationReport:
        run = db.query(ScheduleRun).filter(
            ScheduleRun.id == run_id,
            ScheduleRun.workspace_id == workspace_id,
        ).first()
        if not run or not run.schedule_version_id:
            return AssignmentExplanationReport(assignment_id=str(assignment_id), reasons=["Assignment not found or inactive in run."])

        a = db.query(DbAssignment).filter(
            DbAssignment.id == assignment_id,
            DbAssignment.workspace_id == workspace_id,
            DbAssignment.schedule_version_id == run.schedule_version_id,
        ).first()

        if not a:
            return AssignmentExplanationReport(assignment_id=str(assignment_id), reasons=["Assignment not found or inactive in run."])

        # Load entity records only from the active workspace.
        teacher = db.query(Resource).filter(
            Resource.id == a.teacher_id,
            Resource.workspace_id == workspace_id,
        ).first()
        room = db.query(Location).filter(
            Location.id == a.room_id,
            Location.workspace_id == workspace_id,
        ).first()
        subject = db.query(Task).filter(
            Task.id == a.subject_id,
            Task.workspace_id == workspace_id,
        ).first()
        section = db.query(Group).filter(
            Group.id == a.section_id,
            Group.workspace_id == workspace_id,
        ).first()
        active_assignments = db.query(DbAssignment).filter(
            DbAssignment.workspace_id == workspace_id,
            DbAssignment.schedule_version_id == run.schedule_version_id,
        ).all()
        db_constraints = db.query(ConstraintRule).filter(ConstraintRule.workspace_id == workspace_id, ConstraintRule.enabled).all()
        room_names = {
            location.id: location.name
            for location in db.query(Location).filter(Location.workspace_id == workspace_id).all()
        }

        t_name = teacher.name if teacher else "Teacher"
        r_name = room.name if room else "Room"
        sub_name = subject.name if subject else "Subject"
        sec_name = section.name if section else "Section"
        weekly_hours = subject.weekly_hours if subject else 0
        room_cap = room.capacity if room else 0
        sec_size = section.size if section else 0

        assignment_periods = {
            (a.day, a.period + offset)
            for offset in range(a.duration_periods or 1)
        }

        def overlaps(other: DbAssignment) -> bool:
            other_periods = {
                (other.day, other.period + offset)
                for offset in range(other.duration_periods or 1)
            }
            return bool(assignment_periods & other_periods)

        other_assignments = [other for other in active_assignments if other.id != a.id]
        teacher_conflict = any(other.teacher_id == a.teacher_id and overlaps(other) for other in other_assignments)
        section_conflict = any(other.section_id == a.section_id and overlaps(other) for other in other_assignments)
        room_conflict = any(other.room_id == a.room_id and overlaps(other) for other in other_assignments)

        hard_unavailable = set()
        for constraint in db_constraints:
            if constraint.template_key != "teacher_unavailable" or constraint.rule_type != "hard":
                continue
            if constraint.parameters.get("teacher_id") != str(a.teacher_id):
                continue
            day = constraint.parameters.get("day")
            period = constraint.parameters.get("period")
            if day and period is not None:
                try:
                    hard_unavailable.add((day, int(period)))
                except (TypeError, ValueError):
                    continue
        unavailable_periods = sorted(assignment_periods & hard_unavailable)

        subject_periods = sum(
            other.duration_periods or 1
            for other in active_assignments
            if other.subject_id == a.subject_id and other.section_id == a.section_id
        )

        reasons = []
        if unavailable_periods:
            warnings = [
                f"{t_name} is scheduled during a hard unavailable period: "
                f"{', '.join(f'{day} Period {period}' for day, period in unavailable_periods)}."
            ]
        else:
            warnings = []
            reasons.append(f"{t_name} is available on {a.day} Period {a.period}; no hard availability constraint overlaps this assignment.")

        if section_conflict:
            warnings.append(f"Section {sec_name} has another class overlapping {a.day} Period {a.period}.")
        else:
            reasons.append(f"Section {sec_name} has no other class overlapping {a.day} Period {a.period}.")

        if teacher_conflict:
            warnings.append(f"Teacher {t_name} has another teaching session overlapping {a.day} Period {a.period}.")
        else:
            reasons.append(f"Teacher {t_name} has no other teaching session overlapping {a.day} Period {a.period}.")

        if room_conflict:
            warnings.append(f"Room {r_name} has another assignment overlapping {a.day} Period {a.period}.")
        else:
            reasons.append(f"Room {r_name} is free at {a.day} Period {a.period}.")

        if room and section and room_cap < sec_size:
            warnings.append(f"Room {r_name} capacity ({room_cap}) is below section size {sec_size}.")
        else:
            reasons.append(f"Room {r_name} capacity ({room_cap}) covers section size of {sec_name} ({sec_size}).")

        reasons.append(
            f"Subject {sub_name} requires {weekly_hours} periods per week for section {sec_name}; "
            f"this run contains {subject_periods} assigned periods including this slot."
        )

        satisfied_constraints = []

        # Check soft constraints satisfied
        for c in db_constraints:
            if c.template_key == "preferred_room":
                r_id_str = c.parameters.get("room_id")
                sub_id_str = c.parameters.get("subject_id")
                if r_id_str and sub_id_str:
                    try:
                        r_id = uuid.UUID(r_id_str)
                        sub_id = uuid.UUID(sub_id_str)
                        if a.subject_id == sub_id:
                            if a.room_id == r_id:
                                satisfied_constraints.append(f"Room Preference: Scheduled in preferred room {r_name} for {sub_name}.")
                            else:
                                warnings.append(f"Preferred room is {room_names.get(r_id, 'another room')} but scheduled in {r_name}.")
                    except ValueError:
                        pass
            elif c.template_key == "teacher_preferred_slot":
                t_id_str = c.parameters.get("teacher_id")
                day = c.parameters.get("day")
                period = c.parameters.get("period")
                if t_id_str and day and period is not None:
                    try:
                        t_id = uuid.UUID(t_id_str)
                        if a.teacher_id == t_id and a.day == day and a.period == period:
                            satisfied_constraints.append(f"Day/Period Preference: Scheduled in preferred slot for {t_name}.")
                    except ValueError:
                        pass

        title = f"{sub_name} — {t_name} — {sec_name} — {a.day} Period {a.period}"

        return AssignmentExplanationReport(
            assignment_id=str(assignment_id),
            title=title,
            reasons=reasons,
            satisfied_constraints=satisfied_constraints,
            warnings=warnings
        )

# Helper to categorize severity based on utilization value
def SelfSeverity(val: float) -> str:
    if val >= 90:
        return "critical"
    elif val >= 70:
        return "high"
    elif val >= 45:
        return "medium"
    elif val > 0:
        return "low"
    return "none"
