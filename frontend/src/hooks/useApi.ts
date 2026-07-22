import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import api from '../lib/api';

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApiGet<T>(url: string | null): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const fetch = useCallback(async () => {
    const currentRequest = ++requestId.current;
    controller.current?.abort();
    if (!url) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const nextController = new AbortController();
    controller.current = nextController;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url, { signal: nextController.signal });
      if (currentRequest === requestId.current) setData(res.data);
    } catch (err: unknown) {
      if (!axios.isCancel(err) && currentRequest === requestId.current) {
        const msg = err instanceof Error ? err.message : 'Request failed';
        setError(msg);
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void fetch();
    return () => controller.current?.abort();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ── Typed resource hooks ─────────────────────────────────────────

export interface Teacher {
  id: string;
  organization_id: string;
  name: string;
}

export interface Room {
  id: string;
  organization_id: string;
  name: string;
  capacity: number;
  type: string;
}

export interface Subject {
  id: string;
  organization_id: string;
  name: string;
  weekly_hours: number;
  session_length: number;
  color: string | null;
}

export interface Section {
  id: string;
  organization_id: string;
  name: string;
  size: number;
  class_teacher_id: string | null;
}

export interface Constraint {
  id: string;
  organization_id: string;
  constraint_type: string;
  payload: Record<string, unknown>;
  weight: number | null;
}

export interface TeacherSubjectAssignment {
  id: string;
  organization_id: string;
  teacher_id: string;
  subject_id: string;
}

export interface SectionSubjectTeacherAssignment {
  id: string;
  organization_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string | null;
}

export interface Organization {
  id: string;
  name: string;
  scheduling_mode: string;
  cycle_length: number;
  periods_per_day: number;
}

export interface ScheduledSlot {
  id: string;
  day: string;
  period: number;
  slot_id: string;
  section_id: string;
  teacher_id: string;
  subject_id: string;
  room_id: string;
  duration_periods: number;
}

export interface TimetableVersion {
  id: string;
  organization_id: string;
  version_number: number;
  status: string;
  scores: Record<string, number>;
  created_by: string | null;
  created_at: string;
}

export interface TimetableResponse {
  id: string;
  version_id?: string;
  organization_id: string;
  status: string;
  version_status: string | null;
  version_number: number | null;
  assignments: ScheduledSlot[];
  scores: Record<string, number>;
  infeasible_reason: string | null;
}

export interface WorkspaceResource {
  id: string;
  organization_id: string;
  workspace_id: string;
  name: string;
  resource_type: string;
  metadata: Record<string, unknown>;
  availability: Record<string, unknown>;
  max_hours_per_week: number | null;
  created_at: string;
}

export interface ScheduleRun {
  id: string;
  organization_id: string;
  workspace_id: string;
  schedule_version_id: string | null;
  status: string;
  solver_score: Record<string, unknown> | null;
  explanation: Record<string, unknown> | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
}

export interface FacultyRoomAssignment {
  room_id: string;
  room_name?: string | null;
  student_count?: number | null;
  sub_group?: string | null;
  capacity_contribution?: number | null;
}

export interface FacultyAssignment extends ScheduledSlot {
  section_name?: string | null;
  subject_name?: string;
  subject_color?: string | null;
  teacher_name?: string;
  room_name?: string;
  room_assignments?: FacultyRoomAssignment[];
}

export interface FacultyShareLink {
  id: string;
  token: string;
  share_url: string;
  organization_id: string;
  workspace_id: string;
  resource_id: string;
  schedule_run_id: string;
  created_by: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  revoked_at: string | null;
}

export interface PublicFacultyShare {
  token: string;
  share_link_id: string;
  is_active: boolean;
  is_expired: boolean;
  expires_at: string | null;
  published_at: string;
  organization: { id: string; name: string };
  workspace: { id: string; name: string; domain_preset: string };
  faculty: { id: string; name: string; resource_type: string };
  schedule_run: { id: string; status: string; created_at: string };
  schedule_version: { id: string; version_label: string; version_number: number | null; status: string; created_at: string } | null;
  assignments: FacultyAssignment[];
  message: string | null;
}

export function useTeachers(orgId: string | null) {
  return useApiGet<Teacher[]>(orgId ? `/teachers?organization_id=${orgId}` : null);
}

export function useRooms(orgId: string | null) {
  return useApiGet<Room[]>(orgId ? `/rooms?organization_id=${orgId}` : null);
}

export function useSubjects(orgId: string | null) {
  return useApiGet<Subject[]>(orgId ? `/subjects?organization_id=${orgId}` : null);
}

export function useSections(orgId: string | null) {
  return useApiGet<Section[]>(orgId ? `/sections?organization_id=${orgId}` : null);
}

export function useConstraints(orgId: string | null) {
  return useApiGet<Constraint[]>(orgId ? `/constraints?organization_id=${orgId}` : null);
}

export function useTeacherSubjectAssignments(orgId: string | null) {
  return useApiGet<TeacherSubjectAssignment[]>(orgId ? `/assignments/teacher-subjects?organization_id=${orgId}` : null);
}

export function useSectionSubjectTeacherAssignments(orgId: string | null) {
  return useApiGet<SectionSubjectTeacherAssignment[]>(orgId ? `/assignments/section-subject-teachers?organization_id=${orgId}` : null);
}

export function useOrganization(orgId: string | null) {
  return useApiGet<Organization>(orgId ? `/organizations/${orgId}` : null);
}

export function useOrganizations(enabled = true) {
  return useApiGet<Organization[]>(enabled ? '/organizations' : null);
}

export function useTimetableVersions(orgId: string | null) {
  return useApiGet<TimetableVersion[]>(orgId ? `/timetables/versions?organization_id=${orgId}` : null);
}

export function useTimetable(versionId: string | null) {
  return useApiGet<TimetableResponse>(versionId ? `/timetables/${versionId}` : null);
}

export function useWorkspaceResources(workspaceId: string | null, type?: string) {
  const suffix = type ? `?type=${encodeURIComponent(type)}` : '';
  return useApiGet<WorkspaceResource[]>(workspaceId ? `/api/v1/workspaces/${workspaceId}/resources${suffix}` : null);
}

export function useWorkspaceScheduleRuns(workspaceId: string | null) {
  return useApiGet<ScheduleRun[]>(workspaceId ? `/api/v1/workspaces/${workspaceId}/schedule-runs/` : null);
}

export function useWorkspaceRunAssignments(workspaceId: string | null, runId: string | null) {
  return useApiGet<ScheduledSlot[]>(
    workspaceId && runId
      ? `/api/v1/workspaces/${workspaceId}/schedule-runs/${runId}/assignments`
      : null
  );
}

export function useFacultyTimetable(workspaceId: string | null, runId: string | null, resourceId: string | null) {
  return useApiGet<FacultyAssignment[]>(
    workspaceId && runId && resourceId
      ? `/api/v1/workspaces/${workspaceId}/schedule-runs/${runId}/faculty/${resourceId}/timetable`
      : null
  );
}

export function useFacultyShareLinks(workspaceId: string | null, resourceId: string | null) {
  return useApiGet<FacultyShareLink[]>(
    workspaceId && resourceId
      ? `/api/v1/workspaces/${workspaceId}/faculty/${resourceId}/share-links`
      : null
  );
}

export function usePublicFacultyShare(token: string | undefined) {
  return useApiGet<PublicFacultyShare>(token ? `/api/v1/share/faculty/${token}` : null);
}
