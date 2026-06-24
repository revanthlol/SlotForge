import api from './client';
import type { Teacher, Room, Subject, Section, Constraint, GenerateRequest, GenerateResult, Timetable } from '../types';

// Teachers
export const teachersApi = {
  list: () => api.get<Teacher[]>('/teachers').then(r => r.data),
  create: (data: Omit<Teacher, 'id'>) => api.post<Teacher>('/teachers', data).then(r => r.data),
  update: (id: string, data: Partial<Teacher>) => api.patch<Teacher>(`/teachers/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/teachers/${id}`),
};

// Rooms
export const roomsApi = {
  list: () => api.get<Room[]>('/rooms').then(r => r.data),
  create: (data: Omit<Room, 'id'>) => api.post<Room>('/rooms', data).then(r => r.data),
  update: (id: string, data: Partial<Room>) => api.patch<Room>(`/rooms/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/rooms/${id}`),
};

// Subjects
export const subjectsApi = {
  list: () => api.get<Subject[]>('/subjects').then(r => r.data),
  create: (data: Omit<Subject, 'id'>) => api.post<Subject>('/subjects', data).then(r => r.data),
  update: (id: string, data: Partial<Subject>) => api.patch<Subject>(`/subjects/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/subjects/${id}`),
};

// Sections
export const sectionsApi = {
  list: () => api.get<Section[]>('/sections').then(r => r.data),
  create: (data: Omit<Section, 'id'>) => api.post<Section>('/sections', data).then(r => r.data),
  update: (id: string, data: Partial<Section>) => api.patch<Section>(`/sections/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/sections/${id}`),
};

// Constraints
export const constraintsApi = {
  list: () => api.get<Constraint[]>('/constraints').then(r => r.data),
  create: (data: Omit<Constraint, 'id'>) => api.post<Constraint>('/constraints', data).then(r => r.data),
  update: (id: string, data: Partial<Constraint>) => api.patch<Constraint>(`/constraints/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/constraints/${id}`),
};

// Timetable
export const timetableApi = {
  active: () => api.get<Timetable>('/timetable/active').then(r => r.data),
  bySection: (sectionId: string) => api.get<Timetable>(`/timetable/section/${sectionId}`).then(r => r.data),
  publish: (id: string) => api.post(`/timetable/${id}/publish`).then(r => r.data),
};

// Generate
export const generateApi = {
  run: (req: GenerateRequest) => api.post<GenerateResult>('/generate', req).then(r => r.data),
};
