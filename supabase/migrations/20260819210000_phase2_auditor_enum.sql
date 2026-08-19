-- Phase 2: add auditor to app_role. This value cannot be used until the
-- migration commits, so policies that reference it live in the next file.

alter type public.app_role add value if not exists 'auditor';
