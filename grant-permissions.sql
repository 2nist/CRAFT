-- Grant permissions to craft_cpq_app user
-- Run this in SQL Server Management Studio or Azure Data Studio as sa/admin

USE CraftCPQ;
GO

-- Grant SELECT permission on all tables
GRANT SELECT ON dbo.customers TO craft_cpq_app;
GRANT SELECT ON dbo.quotes TO craft_cpq_app;
GRANT SELECT ON dbo.components TO craft_cpq_app;
GRANT SELECT ON dbo.sub_assemblies TO craft_cpq_app;
GRANT SELECT ON dbo.product_templates TO craft_cpq_app;
GRANT SELECT ON dbo.projects TO craft_cpq_app;
GRANT SELECT ON dbo.manual_quotes TO craft_cpq_app;
GRANT SELECT ON dbo.generated_numbers TO craft_cpq_app;
GRANT SELECT ON dbo.sync_log TO craft_cpq_app;

-- Grant INSERT permission
GRANT INSERT ON dbo.customers TO craft_cpq_app;
GRANT INSERT ON dbo.quotes TO craft_cpq_app;
GRANT INSERT ON dbo.components TO craft_cpq_app;
GRANT INSERT ON dbo.sub_assemblies TO craft_cpq_app;
GRANT INSERT ON dbo.product_templates TO craft_cpq_app;
GRANT INSERT ON dbo.projects TO craft_cpq_app;
GRANT INSERT ON dbo.manual_quotes TO craft_cpq_app;
GRANT INSERT ON dbo.generated_numbers TO craft_cpq_app;
GRANT INSERT ON dbo.sync_log TO craft_cpq_app;

-- Grant UPDATE permission
GRANT UPDATE ON dbo.customers TO craft_cpq_app;
GRANT UPDATE ON dbo.quotes TO craft_cpq_app;
GRANT UPDATE ON dbo.components TO craft_cpq_app;
GRANT UPDATE ON dbo.sub_assemblies TO craft_cpq_app;
GRANT UPDATE ON dbo.product_templates TO craft_cpq_app;
GRANT UPDATE ON dbo.projects TO craft_cpq_app;
GRANT UPDATE ON dbo.manual_quotes TO craft_cpq_app;
GRANT UPDATE ON dbo.generated_numbers TO craft_cpq_app;
GRANT UPDATE ON dbo.sync_log TO craft_cpq_app;

-- Grant DELETE permission
GRANT DELETE ON dbo.customers TO craft_cpq_app;
GRANT DELETE ON dbo.quotes TO craft_cpq_app;
GRANT DELETE ON dbo.components TO craft_cpq_app;
GRANT DELETE ON dbo.sub_assemblies TO craft_cpq_app;
GRANT DELETE ON dbo.product_templates TO craft_cpq_app;
GRANT DELETE ON dbo.projects TO craft_cpq_app;
GRANT DELETE ON dbo.manual_quotes TO craft_cpq_app;
GRANT DELETE ON dbo.generated_numbers TO craft_cpq_app;
GRANT DELETE ON dbo.sync_log TO craft_cpq_app;

-- Grant EXECUTE permission for stored procedures (if any in future)
-- GRANT EXECUTE TO craft_cpq_app;

-- Verify permissions
SELECT 
    USER_NAME(grantee_principal_id) AS UserName,
    OBJECT_NAME(major_id) AS ObjectName,
    permission_name,
    state_desc
FROM sys.database_permissions
WHERE grantee_principal_id = USER_ID('craft_cpq_app')
ORDER BY ObjectName, permission_name;

PRINT 'Permissions granted successfully to craft_cpq_app user';
GO
