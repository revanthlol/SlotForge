import { useState, useEffect, useCallback } from 'react';
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

  const fetch = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url);
      setData(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetch();
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
  teacher_id: string;
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

export function useTimetableVersions(orgId: string | null) {
  return useApiGet<TimetableVersion[]>(orgId ? `/timetables/versions?organization_id=${orgId}` : null);
}

export function useTimetable(versionId: string | null) {
  return useApiGet<TimetableResponse>(versionId ? `/timetables/${versionId}` : null);
}
