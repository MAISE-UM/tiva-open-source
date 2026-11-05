-- Exports the seed data of a working TIVA database as INSERT statements for a new database.
-- Read only: it runs SELECTs and writes to a temporary table.
--
-- Run it with sqlcmd so long lines are not cut off, and save the output as UTF-8:
--   sqlcmd -S <server> -d <database> -E -i ExportSeedData.sql -o SeedData.sql -y 0 -f 65001
-- Review SeedData.sql (see below), then run it in the new database after CreateDB.sql:
--   sqlcmd -S <server> -d <new database> -E -i SeedData.sql -f 65001
--
-- It exports, keeping the IDs because other rows and the model procedures refer to them:
--   roles, application functions, routes, role and route functions, application lists, application configuration
--   names, endpoints with their parameters and security (including the FHIR endpoints, see ExportEhrEndpoints.sql),
--   medications, medication models and lists.
-- It changes or leaves out:
--   * Soft deleted rows.
--   * Created_By, Updated_By and Deleted_By, set to SYSTEM.
--   * Application configuration values, set to NULL because they hold encrypted keys. Set them in the new database.
--   * The GetCaseFromMPOG endpoint. CreateDB.sql creates core.GetCaseFromMPOG only on servers with the MPOG linked
--     server, so other sites would get an endpoint that fails. MPOG members: delete the first condition of
--     @Endpoint_Filter below to export it.
--   * Users, clients and logs. The output ends with the admin.AddUser call for the first administrator.
-- Lines with a URL or hostname are preceded by "-- REVIEW". Replace site specific values before using or sharing the output.

SET NOCOUNT ON;

DECLARE @Endpoint_Filter NVARCHAR(MAX) = N'ISNULL(Stored_Procedure, N'''') NOT LIKE N''%GetCaseFromMPOG%'' AND ISNULL(Deleted, 0) = 0';

-- Parents before children
DECLARE @Tables TABLE (Ord INT IDENTITY(1,1), Table_Name NVARCHAR(256), Filter NVARCHAR(MAX));
INSERT INTO @Tables (Table_Name, Filter)
VALUES
    (N'admin.Application_Roles', NULL),
    (N'admin.Application_Functions', NULL),
    (N'admin.Application_Routes', NULL),
    (N'admin.Application_Route_Functions', N'View_ID IN (SELECT View_ID FROM admin.Application_Routes WHERE ISNULL(Deleted, 0) = 0) AND Function_ID IN (SELECT Function_ID FROM admin.Application_Functions WHERE ISNULL(Deleted, 0) = 0)'),
    (N'admin.Application_Role_Functions', N'Role_ID IN (SELECT Role_ID FROM admin.Application_Roles WHERE ISNULL(Delete_Ind, ''N'') = ''N'') AND Function_ID IN (SELECT Function_ID FROM admin.Application_Functions WHERE ISNULL(Deleted, 0) = 0)'),
    (N'admin.Application_Lists', NULL),
    (N'admin.Application_Configurations', NULL),
    (N'api.Endpoints', @Endpoint_Filter),
    (N'api.EndpointParameters', N'Endpoint_ID IN (SELECT Endpoint_ID FROM api.Endpoints WHERE ' + @Endpoint_Filter + N')'),
    (N'api.EndpointSecurity', N'Endpoint_ID IN (SELECT Endpoint_ID FROM api.Endpoints WHERE ' + @Endpoint_Filter + N')'),
    (N'core.Medications', NULL),
    (N'core.Medication_Models', N'Medication_ID IN (SELECT Med_ID FROM core.Medications WHERE ISNULL(Deleted, 0) = 0)'),
    (N'core.List_Groups', NULL),
    (N'core.List_Values', N'List_Group_ID IN (SELECT List_Group_ID FROM core.List_Groups WHERE ISNULL(Deleted, 0) = 0)');

CREATE TABLE #Output (Line_ID INT IDENTITY(1,1), Line NVARCHAR(MAX));

INSERT INTO #Output (Line)
VALUES (N'-- TIVA seed data exported from ' + DB_NAME() + N' on ' + CONVERT(NVARCHAR(30), GETDATE(), 120) + N' by ExportSeedData.sql. Review before use.'),
       (N'SET NOCOUNT ON;'),
       (N'SET XACT_ABORT ON;'),
       (N'BEGIN TRANSACTION;');

DECLARE @Ord INT = 1, @Table NVARCHAR(256), @Filter NVARCHAR(MAX), @Object_ID INT;
DECLARE @Columns NVARCHAR(MAX), @Values NVARCHAR(MAX), @Order_By NVARCHAR(256), @Has_Identity BIT, @SQL NVARCHAR(MAX);

WHILE @Ord <= (SELECT MAX(Ord) FROM @Tables)
BEGIN
    SELECT @Table = Table_Name, @Filter = Filter FROM @Tables WHERE Ord = @Ord;
    SET @Object_ID = OBJECT_ID(@Table, 'U');

    -- Soft deleted rows are left out
    IF COL_LENGTH(@Table, 'Deleted') IS NOT NULL
        SET @Filter = CONCAT(@Filter + N' AND ', N'ISNULL(Deleted, 0) = 0');
    IF COL_LENGTH(@Table, 'Delete_Ind') IS NOT NULL
        SET @Filter = CONCAT(@Filter + N' AND ', N'ISNULL(Delete_Ind, ''N'') = ''N''');

    -- One SQL literal per column
    SELECT
        @Columns = STRING_AGG(CAST(QUOTENAME(c.name) AS NVARCHAR(MAX)), N', ') WITHIN GROUP (ORDER BY c.column_id),
        @Values = STRING_AGG(CAST(
            CASE
                WHEN c.name IN (N'Created_By', N'Updated_By', N'Deleted_By')
                    THEN N'CASE WHEN ' + QUOTENAME(c.name) + N' IS NULL THEN N''NULL'' ELSE N''N''''SYSTEM'''''' END'
                WHEN @Table = N'admin.Application_Configurations' AND c.name = N'Configuration_Key_Value'
                    THEN N'N''NULL'''
                WHEN t.name IN (N'char', N'varchar', N'nchar', N'nvarchar', N'text', N'ntext', N'sysname')
                    THEN N'ISNULL(N''N'''''' + REPLACE(CAST(' + QUOTENAME(c.name) + N' AS NVARCHAR(MAX)), N'''''''', N'''''''''''') + N'''''''', N''NULL'')'
                WHEN t.name IN (N'date', N'datetime', N'datetime2', N'smalldatetime', N'datetimeoffset', N'time')
                    THEN N'ISNULL(N'''''''' + CONVERT(NVARCHAR(40), ' + QUOTENAME(c.name) + N', 126) + N'''''''', N''NULL'')'
                WHEN t.name IN (N'float', N'real')
                    THEN N'ISNULL(CONVERT(NVARCHAR(40), ' + QUOTENAME(c.name) + N', 3), N''NULL'')'
                WHEN t.name IN (N'binary', N'varbinary', N'image')
                    THEN N'ISNULL(CONVERT(NVARCHAR(MAX), CAST(' + QUOTENAME(c.name) + N' AS VARBINARY(MAX)), 1), N''NULL'')'
                WHEN t.name = N'uniqueidentifier'
                    THEN N'ISNULL(N'''''''' + CONVERT(NVARCHAR(36), ' + QUOTENAME(c.name) + N') + N'''''''', N''NULL'')'
                ELSE N'ISNULL(CONVERT(NVARCHAR(100), ' + QUOTENAME(c.name) + N'), N''NULL'')'
            END AS NVARCHAR(MAX)), N' + N'', '' + ') WITHIN GROUP (ORDER BY c.column_id)
    FROM sys.columns c
        JOIN sys.types t ON t.user_type_id = c.user_type_id
    WHERE c.object_id = @Object_ID AND c.is_computed = 0;

    -- Rows in identity order, or by the first column
    SET @Has_Identity = CASE WHEN EXISTS (SELECT 1 FROM sys.columns WHERE object_id = @Object_ID AND is_identity = 1) THEN 1 ELSE 0 END;
    SET @Order_By = (SELECT TOP (1) QUOTENAME(name) FROM sys.columns WHERE object_id = @Object_ID ORDER BY is_identity DESC, column_id);

    INSERT INTO #Output (Line) VALUES (N''), (N'-- ' + @Table);
    IF @Has_Identity = 1
        INSERT INTO #Output (Line) VALUES (N'SET IDENTITY_INSERT ' + @Table + N' ON;');

    SET @SQL = N'INSERT INTO #Output (Line) SELECT N''INSERT INTO ' + @Table + N' (' + REPLACE(@Columns, N'''', N'''''') + N') VALUES ('' + '
        + @Values + N' + N'');'' FROM ' + @Table
        + ISNULL(N' WHERE ' + @Filter, N'') + N' ORDER BY ' + @Order_By + N';';
    EXEC sp_executesql @SQL;

    IF @Has_Identity = 1
        INSERT INTO #Output (Line) VALUES (N'SET IDENTITY_INSERT ' + @Table + N' OFF;');

    SET @Ord += 1;
END

DECLARE @Admin_Role_ID NVARCHAR(20) = (SELECT CAST(MIN(Role_ID) AS NVARCHAR(20)) FROM admin.Application_Roles WHERE Role_Name = N'Administrator' AND ISNULL(Delete_Ind, 'N') = 'N');

INSERT INTO #Output (Line)
VALUES (N''),
       (N'COMMIT TRANSACTION;'),
       (N''),
       (N'-- First administrator. Replace the names with a real user (the username they log in with), then run:'),
       (N'-- EXEC admin.AddUser @User = N''SYSTEM'', @User_Name = N''<username>'', @First_Name = N''<first name>'', @Last_Name = N''<last name>'', @Role_ID_List = N'''
            + ISNULL(@Admin_Role_ID, N'<Role_ID of the Administrator role>') + N''', @Is_Active = 1;');

SELECT
    CASE
        WHEN Line LIKE N'INSERT%' AND (Line LIKE N'%://%' OR Line LIKE N'%.edu%' OR Line LIKE N'%.org%' OR Line LIKE N'%.com%' OR Line LIKE N'%.net%')
            THEN N'-- REVIEW: URL or hostname' + CHAR(13) + CHAR(10)
        ELSE N''
    END + Line AS [-- TIVA seed data] -- sqlcmd prints this header and a line of dashes, both are SQL comments
FROM #Output
ORDER BY Line_ID;

DROP TABLE #Output;
