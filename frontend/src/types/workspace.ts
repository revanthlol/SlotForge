export type DomainPreset = 'academic' | 'staff_roster' | 'event' | 'exam' | 'facility';

export interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  domain_preset: DomainPreset | string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceCreate {
  name: string;
  domain_preset: DomainPreset | string;
}

export interface WorkspaceUpdate {
  name?: string;
  domain_preset?: DomainPreset | string;
}
