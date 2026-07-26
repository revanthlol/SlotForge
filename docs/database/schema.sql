--
-- PostgreSQL database dump
--

\restrict SlotForgeSchemaExport

-- Dumped from database version 17.10
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: assignment_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_locations (
    assignment_id uuid NOT NULL,
    location_id uuid NOT NULL,
    student_count integer,
    sub_group character varying,
    capacity_contribution integer
);


--
-- Name: assignment_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_resources (
    assignment_id uuid NOT NULL,
    resource_id uuid NOT NULL
);


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    schedule_version_id uuid NOT NULL,
    task_id uuid NOT NULL,
    group_id uuid,
    timeslot_id uuid,
    duration_slots integer DEFAULT 1 NOT NULL,
    is_manual_override boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL,
    day character varying NOT NULL,
    period integer NOT NULL,
    teacher_id uuid NOT NULL,
    room_id uuid NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    actor_id uuid,
    action character varying NOT NULL,
    target_table character varying,
    target_id uuid,
    diff jsonb,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: constraint_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.constraint_rules (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    name character varying NOT NULL,
    rule_type character varying NOT NULL,
    template_key character varying NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    penalty integer,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: faculty_share_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faculty_share_links (
    id uuid NOT NULL,
    token character varying NOT NULL,
    organization_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    schedule_run_id uuid NOT NULL,
    created_by uuid,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone
);


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    name character varying NOT NULL,
    group_type character varying NOT NULL,
    size integer,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    name character varying NOT NULL,
    location_type character varying NOT NULL,
    capacity integer NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: onboarding_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_progress (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    current_step integer DEFAULT 0 NOT NULL,
    completed_steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    skipped boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: organization_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_memberships (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    role character varying DEFAULT 'org_admin'::character varying NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid NOT NULL,
    name character varying NOT NULL,
    created_at timestamp with time zone NOT NULL,
    scheduling_mode character varying DEFAULT 'fixed_weekday'::character varying NOT NULL,
    cycle_length integer DEFAULT 6 NOT NULL,
    periods_per_day integer DEFAULT 5 NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    role character varying NOT NULL,
    full_name character varying,
    created_at timestamp with time zone NOT NULL,
    job_title character varying(80)
);


--
-- Name: resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resources (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    name character varying NOT NULL,
    resource_type character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    availability jsonb DEFAULT '{}'::jsonb NOT NULL,
    max_hours_per_week integer,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: schedule_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_runs (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    schedule_version_id uuid,
    status character varying NOT NULL,
    solver_score jsonb,
    explanation jsonb,
    duration_seconds double precision,
    error_message character varying,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: schedule_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_versions (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    version_label character varying NOT NULL,
    version_number integer,
    status character varying DEFAULT 'draft'::character varying NOT NULL,
    scores jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation jsonb,
    parent_version_id uuid,
    is_manual_override boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone NOT NULL,
    branch_name character varying,
    published_at timestamp with time zone,
    archived_at timestamp with time zone
);


--
-- Name: scheduling_workspaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduling_workspaces (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    domain_preset character varying NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: section_subject_teacher_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_subject_teacher_assignments (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    section_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    teacher_id uuid,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    name character varying NOT NULL,
    task_type character varying NOT NULL,
    required_hours integer,
    requires_continuous_slots boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: teacher_subject_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_subject_assignments (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: timeslots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timeslots (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    name character varying NOT NULL,
    day character varying NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    slot_index integer NOT NULL,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: assignment_locations assignment_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_locations
    ADD CONSTRAINT assignment_locations_pkey PRIMARY KEY (assignment_id, location_id);


--
-- Name: assignment_resources assignment_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_resources
    ADD CONSTRAINT assignment_resources_pkey PRIMARY KEY (assignment_id, resource_id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: constraint_rules constraint_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constraint_rules
    ADD CONSTRAINT constraint_rules_pkey PRIMARY KEY (id);


--
-- Name: faculty_share_links faculty_share_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_share_links
    ADD CONSTRAINT faculty_share_links_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: onboarding_progress onboarding_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_progress
    ADD CONSTRAINT onboarding_progress_pkey PRIMARY KEY (id);


--
-- Name: organization_memberships organization_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_memberships
    ADD CONSTRAINT organization_memberships_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: schedule_runs schedule_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_runs
    ADD CONSTRAINT schedule_runs_pkey PRIMARY KEY (id);


--
-- Name: schedule_versions schedule_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_versions
    ADD CONSTRAINT schedule_versions_pkey PRIMARY KEY (id);


--
-- Name: scheduling_workspaces scheduling_workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_workspaces
    ADD CONSTRAINT scheduling_workspaces_pkey PRIMARY KEY (id);


--
-- Name: section_subject_teacher_assignments section_subject_teacher_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_subject_teacher_assignments
    ADD CONSTRAINT section_subject_teacher_assignments_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: teacher_subject_assignments teacher_subject_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subject_assignments
    ADD CONSTRAINT teacher_subject_assignments_pkey PRIMARY KEY (id);


--
-- Name: timeslots timeslots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeslots
    ADD CONSTRAINT timeslots_pkey PRIMARY KEY (id);


--
-- Name: faculty_share_links uq_faculty_share_links_token; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_share_links
    ADD CONSTRAINT uq_faculty_share_links_token UNIQUE (token);


--
-- Name: onboarding_progress uq_onboarding_progress_workspace; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_progress
    ADD CONSTRAINT uq_onboarding_progress_workspace UNIQUE (workspace_id);


--
-- Name: organization_memberships uq_org_membership_user_org; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_memberships
    ADD CONSTRAINT uq_org_membership_user_org UNIQUE (user_id, organization_id);


--
-- Name: section_subject_teacher_assignments uq_section_subject_teacher_assignment_org_section_subject; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_subject_teacher_assignments
    ADD CONSTRAINT uq_section_subject_teacher_assignment_org_section_subject UNIQUE (organization_id, section_id, subject_id);


--
-- Name: teacher_subject_assignments uq_teacher_subject_assignment_org_teacher_subject; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subject_assignments
    ADD CONSTRAINT uq_teacher_subject_assignment_org_teacher_subject UNIQUE (organization_id, teacher_id, subject_id);


--
-- Name: schedule_versions uq_workspace_version_label; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_versions
    ADD CONSTRAINT uq_workspace_version_label UNIQUE (workspace_id, version_label);


--
-- Name: ix_faculty_share_links_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_faculty_share_links_token ON public.faculty_share_links USING btree (token);


--
-- Name: ix_faculty_share_links_workspace_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_faculty_share_links_workspace_resource ON public.faculty_share_links USING btree (workspace_id, resource_id);


--
-- Name: assignment_locations assignment_locations_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_locations
    ADD CONSTRAINT assignment_locations_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_locations assignment_locations_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_locations
    ADD CONSTRAINT assignment_locations_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: assignment_resources assignment_resources_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_resources
    ADD CONSTRAINT assignment_resources_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_resources assignment_resources_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_resources
    ADD CONSTRAINT assignment_resources_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_schedule_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_schedule_version_id_fkey FOREIGN KEY (schedule_version_id) REFERENCES public.schedule_versions(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_timeslot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_timeslot_id_fkey FOREIGN KEY (timeslot_id) REFERENCES public.timeslots(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.scheduling_workspaces(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: constraint_rules constraint_rules_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constraint_rules
    ADD CONSTRAINT constraint_rules_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: constraint_rules constraint_rules_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constraint_rules
    ADD CONSTRAINT constraint_rules_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.scheduling_workspaces(id) ON DELETE CASCADE;


--
-- Name: faculty_share_links faculty_share_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_share_links
    ADD CONSTRAINT faculty_share_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: faculty_share_links faculty_share_links_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_share_links
    ADD CONSTRAINT faculty_share_links_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: faculty_share_links faculty_share_links_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_share_links
    ADD CONSTRAINT faculty_share_links_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: faculty_share_links faculty_share_links_schedule_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_share_links
    ADD CONSTRAINT faculty_share_links_schedule_run_id_fkey FOREIGN KEY (schedule_run_id) REFERENCES public.schedule_runs(id) ON DELETE CASCADE;


--
-- Name: faculty_share_links faculty_share_links_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faculty_share_links
    ADD CONSTRAINT faculty_share_links_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.scheduling_workspaces(id) ON DELETE CASCADE;


--
-- Name: groups groups_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: groups groups_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.scheduling_workspaces(id) ON DELETE CASCADE;


--
-- Name: locations locations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: locations locations_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.scheduling_workspaces(id) ON DELETE CASCADE;


--
-- Name: onboarding_progress onboarding_progress_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_progress
    ADD CONSTRAINT onboarding_progress_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: onboarding_progress onboarding_progress_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_progress
    ADD CONSTRAINT onboarding_progress_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.scheduling_workspaces(id) ON DELETE CASCADE;


--
-- Name: organization_memberships organization_memberships_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_memberships
    ADD CONSTRAINT organization_memberships_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_memberships organization_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_memberships
    ADD CONSTRAINT organization_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: resources resources_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: resources resources_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.scheduling_workspaces(id) ON DELETE CASCADE;


--
-- Name: schedule_runs schedule_runs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_runs
    ADD CONSTRAINT schedule_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: schedule_runs schedule_runs_schedule_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_runs
    ADD CONSTRAINT schedule_runs_schedule_version_id_fkey FOREIGN KEY (schedule_version_id) REFERENCES public.schedule_versions(id) ON DELETE SET NULL;


--
-- Name: schedule_runs schedule_runs_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_runs
    ADD CONSTRAINT schedule_runs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.scheduling_workspaces(id) ON DELETE CASCADE;


--
-- Name: schedule_versions schedule_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_versions
    ADD CONSTRAINT schedule_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: schedule_versions schedule_versions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_versions
    ADD CONSTRAINT schedule_versions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: schedule_versions schedule_versions_parent_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_versions
    ADD CONSTRAINT schedule_versions_parent_version_id_fkey FOREIGN KEY (parent_version_id) REFERENCES public.schedule_versions(id) ON DELETE SET NULL;


--
-- Name: schedule_versions schedule_versions_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_versions
    ADD CONSTRAINT schedule_versions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.scheduling_workspaces(id) ON DELETE CASCADE;


--
-- Name: scheduling_workspaces scheduling_workspaces_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduling_workspaces
    ADD CONSTRAINT scheduling_workspaces_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: section_subject_teacher_assignments section_subject_teacher_assignments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_subject_teacher_assignments
    ADD CONSTRAINT section_subject_teacher_assignments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: section_subject_teacher_assignments section_subject_teacher_assignments_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_subject_teacher_assignments
    ADD CONSTRAINT section_subject_teacher_assignments_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: section_subject_teacher_assignments section_subject_teacher_assignments_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_subject_teacher_assignments
    ADD CONSTRAINT section_subject_teacher_assignments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: section_subject_teacher_assignments section_subject_teacher_assignments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_subject_teacher_assignments
    ADD CONSTRAINT section_subject_teacher_assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: section_subject_teacher_assignments section_subject_teacher_assignments_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_subject_teacher_assignments
    ADD CONSTRAINT section_subject_teacher_assignments_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.scheduling_workspaces(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.scheduling_workspaces(id) ON DELETE CASCADE;


--
-- Name: teacher_subject_assignments teacher_subject_assignments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subject_assignments
    ADD CONSTRAINT teacher_subject_assignments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: teacher_subject_assignments teacher_subject_assignments_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subject_assignments
    ADD CONSTRAINT teacher_subject_assignments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: teacher_subject_assignments teacher_subject_assignments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subject_assignments
    ADD CONSTRAINT teacher_subject_assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.resources(id) ON DELETE CASCADE;


--
-- Name: teacher_subject_assignments teacher_subject_assignments_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subject_assignments
    ADD CONSTRAINT teacher_subject_assignments_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.scheduling_workspaces(id) ON DELETE CASCADE;


--
-- Name: timeslots timeslots_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeslots
    ADD CONSTRAINT timeslots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: timeslots timeslots_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeslots
    ADD CONSTRAINT timeslots_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.scheduling_workspaces(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict SlotForgeSchemaExport
