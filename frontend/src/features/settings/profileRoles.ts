export const WORK_ROLE_OPTIONS = [
  'Timetable coordinator',
  'Academic registrar',
  'Department head',
  'Faculty member',
  'Institution administrator',
  'IT administrator',
] as const;

export function accessRoleLabel(role: string | null) {
  if (role === 'org_admin') return 'Workspace owner';
  if (role === 'viewer') return 'View only';
  return role ? role.replaceAll('_', ' ') : 'Member';
}
