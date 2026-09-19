-- Least privilege. The public API and the admin instance are separate
-- processes on separate hosts and connect as separate roles, so a compromise
-- of the public API cannot read staff credentials or the audit trail.
--
-- Run once by a superuser, outside the migration. Passwords come from the
-- secrets file, never from here.

-- Migrations only.
-- CREATE ROLE hyraku_migrator LOGIN PASSWORD :'migrator_password';
-- GRANT ALL ON SCHEMA public TO hyraku_migrator;

-- Public API: field-facing tables only.
-- CREATE ROLE hyraku_app LOGIN PASSWORD :'app_password';
GRANT USAGE ON SCHEMA public TO hyraku_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hyraku_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hyraku_app;
-- Staff credentials and the audit trail are not the public API's business.
REVOKE ALL ON "AdminUser", "AdminSession", "AuditLog" FROM hyraku_app;

-- Admin instance: full read, scoped write.
-- CREATE ROLE hyraku_admin LOGIN PASSWORD :'admin_password';
GRANT USAGE ON SCHEMA public TO hyraku_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hyraku_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hyraku_admin;
-- The audit trail is append-only, including for the people it audits.
REVOKE UPDATE, DELETE ON "AuditLog" FROM hyraku_admin;
