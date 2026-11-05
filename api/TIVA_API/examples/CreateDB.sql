-- TIVA database schema: schemas, tables, functions and stored procedures. It creates no data.
--
-- Requires SQL Server 2017 or later (STRING_AGG, STRING_SPLIT) and database compatibility level 130 or higher.
-- Create an empty database first, then run this script while connected to it, for example:
--   CREATE DATABASE TIVA;
--   sqlcmd -S <server> -d TIVA -E -i CreateDB.sql
-- Messages that a module "depends on the missing object 'api.SaveUserLog'" are expected, that procedure is created later in the script.
--
-- core.GetCaseFromMPOG reads Multicenter Perioperative Outcomes Group (MPOG) data through a linked server, so it is
-- only useful to MPOG members. The script creates it only if that linked server exists (see the comment where it is
-- created, to use your own linked server name). Other sites do not get this procedure and do not need it.
--
-- After this script:
--   1. Load the seed data: roles, endpoint definitions, application functions and routes, medications,
--      medication models and lists. ExportSeedData.sql exports them from a working database as INSERT statements.
--   2. Create the first administrator with admin.AddUser (the end of the ExportSeedData.sql output has the call).
--   3. Let the API's database user run the procedures, for example:
--        CREATE USER [tiva_api] FOR LOGIN [tiva_api];
--        GRANT EXECUTE ON SCHEMA::admin TO [tiva_api];
--        GRANT EXECUTE ON SCHEMA::api TO [tiva_api];
--        GRANT EXECUTE ON SCHEMA::core TO [tiva_api];
--        GRANT EXECUTE ON SCHEMA::model TO [tiva_api];
--
-- api.UserLogin_Log stores the patient ID, MRN and name sent by the EHR at launch (api.Log_Login). Treat this
-- database as holding protected health information, or change api.Log_Login to not store those values.
/****** Object:  Schema [admin] ******/
CREATE SCHEMA [admin]
GO
/****** Object:  Schema [api] ******/
CREATE SCHEMA [api]
GO
/****** Object:  Schema [core] ******/
CREATE SCHEMA [core]
GO
/****** Object:  Schema [model] ******/
CREATE SCHEMA [model]
GO
/****** Object:  UserDefinedFunction [model].[calcAdjustedBodyWeight] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE FUNCTION [model].[calcAdjustedBodyWeight] 
(
    @sex CHAR(1), -- Expecting 'm' for male and any other for non-male
    @height DECIMAL(10,4), -- Height in centimeters
    @weight DECIMAL(10,4) -- Weight in kilograms
)
RETURNS DECIMAL(10,4)
AS
BEGIN
    DECLARE @ibw DECIMAL(10,4); -- Ideal body weight
    DECLARE @abw DECIMAL(10,4); -- Adjusted body weight

    -- Calculate Ideal Body Weight (IBW)
    SET @ibw = 45.4 + (0.89 * (@height - 152.4));

    -- Adjust the IBW for males
    IF LOWER(@sex) = 'm'
    BEGIN
        SET @ibw = @ibw + 4.5;
    END

    -- Calculate Adjusted Body Weight (ABW) in kg
    SET @abw = @ibw + (0.4 * (@weight - @ibw));

    RETURN @abw;
END;
GO
/****** Object:  UserDefinedFunction [model].[pkLbmJames] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE FUNCTION [model].[pkLbmJames]
(
    @wgtKg DECIMAL(10,4), -- Weight in kilograms
    @hgtCm DECIMAL(10,4), -- Height in centimeters
    @sex CHAR(1) -- Expected 'm' for male or 'f' for female
)
RETURNS DECIMAL(10,4)
AS
BEGIN
    DECLARE @lbmKg DECIMAL(10,4) -- Lean Body Mass
	DECLARE @lbmKgSubtractedWeight DECIMAL(10,4)

    -- Determine LBM based on sex
    IF LOWER(@sex) = 'm'
    BEGIN
        SET @lbmKg = 1.1 * @wgtKg - 128 * POWER((@wgtKg / @hgtCm), 2)
    END
    ELSE 
    BEGIN
        SET @lbmKg = 1.07 * @wgtKg - 148 * POWER((@wgtKg / @hgtCm), 2)
    END

	-- if (lbmKg < lbmKgSubtractedWeight) {
    -- Calculate the LBM for a slightly lower weight to warn about down-sloping side of the equation
	-- warn('WARNING: Lean body mass is inaccurate for obese weight values with the James equation.')
	SET @lbmKgSubtractedWeight = CASE 
        WHEN LOWER(@sex) = 'm' THEN 1.1 * (@wgtKg - 0.1) - 128 * POWER((@wgtKg - 0.1) / @hgtCm, 2)
        ELSE 1.07 * (@wgtKg - 0.1) - 148 * POWER((@wgtKg - 0.1) / @hgtCm, 2)
    END

    RETURN CASE WHEN @lbmKg < @lbmKgSubtractedWeight THEN @lbmKg ELSE @lbmKg END;
END;
GO
/****** Object:  UserDefinedFunction [model].[pkLbmJanmahasatian] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE FUNCTION [model].[pkLbmJanmahasatian]
(
    @wgtKg DECIMAL(10,4), -- Weight in kilograms
    @hgtCm DECIMAL(10,4), -- Height in centimeters
    @sex CHAR(1) -- Expected 'm' for male or 'f' for female
)
RETURNS DECIMAL(10,4)
AS
BEGIN
    DECLARE @bmi DECIMAL(10,2); -- Body Mass Index
    DECLARE @lbmKg DECIMAL(10,2); -- Lean Body Mass

    -- Calculate BMI
    SET @bmi = @wgtKg / POWER((@hgtCm / 100), 2)

    -- Determine LBM based on sex
    IF LOWER(@sex) = 'm'
    BEGIN
        SET @lbmKg = (9270 * @wgtKg) / (6680 + (216 * @bmi))
    END
    ELSE -- Assuming 'f' for female
    BEGIN
        SET @lbmKg = (9270 * @wgtKg) / (8780 + (244 * @bmi))
    END

    RETURN @lbmKg;
END;
GO
/****** Object:  Table [admin].[Application_Client_Roles] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [admin].[Application_Client_Roles](
	[Client_Role_ID] [int] IDENTITY(1,1) NOT NULL,
	[Client_ID] [int] NOT NULL,
	[Role_ID] [int] NOT NULL,
	[Delete_Ind] [varchar](1) NULL,
	[Created_By] [nvarchar](100) NOT NULL,
	[Created_Date] [datetime] NOT NULL,
 CONSTRAINT [PK_Application_Client_Roles] PRIMARY KEY CLUSTERED 
(
	[Client_Role_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [admin].[Application_Clients] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [admin].[Application_Clients](
	[ID] [int] IDENTITY(1,1) NOT NULL,
	[Client_Name] [nvarchar](50) NULL,
	[Client_ID] [nvarchar](50) NULL,
	[Secret_ID] [nvarchar](100) NULL,
	[Created_By] [nvarchar](50) NULL,
	[Created_Date] [datetime] NULL,
	[Updated_By] [nvarchar](50) NULL,
	[Updated_Date] [datetime] NULL,
	[Activity_Notes] [nvarchar](100) NULL,
	[Deleted] [bit] NULL,
	[Refresh_Token] [nvarchar](100) NULL,
	[Refresh_Token_Expiry_Time] [nvarchar](1000) NULL,
 CONSTRAINT [PK_Application_Clients] PRIMARY KEY CLUSTERED 
(
	[ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [admin].[Application_Configurations] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [admin].[Application_Configurations](
	[Configuration_ID] [int] IDENTITY(1,1) NOT NULL,
	[Configuration_Name] [varchar](50) NULL,
	[Configuration_Key_Name] [varchar](50) NULL,
	[Configuration_Key_Value] [varchar](500) NULL,
 CONSTRAINT [PK_Application_Configurations] PRIMARY KEY CLUSTERED 
(
	[Configuration_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [admin].[Application_Functions] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [admin].[Application_Functions](
	[Function_ID] [int] IDENTITY(1,1) NOT NULL,
	[Function_Name] [varchar](50) NOT NULL,
	[Display_Name] [varchar](50) NULL,
	[Parent_ID] [int] NULL,
	[Function_Details] [varchar](200) NULL,
	[Type] [varchar](50) NOT NULL,
	[Display_Order] [int] NULL,
	[Default_Allow] [bit] NULL,
	[Deleted] [bit] NULL,
 CONSTRAINT [PK_Application_Functions] PRIMARY KEY CLUSTERED 
(
	[Function_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [admin].[Application_Lists] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [admin].[Application_Lists](
	[ID] [int] IDENTITY(1,1) NOT NULL,
	[Category] [nvarchar](50) NOT NULL,
	[Section] [nvarchar](50) NOT NULL,
	[List_Key] [nvarchar](50) NOT NULL,
	[List_Value] [nvarchar](500) NOT NULL,
	[Created_Date] [datetime] NOT NULL,
	[Created_By] [nvarchar](50) NOT NULL,
	[Deleted] [bit] NULL,
 CONSTRAINT [PK_Application_Lists] PRIMARY KEY CLUSTERED 
(
	[ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [admin].[Application_Role_Functions] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [admin].[Application_Role_Functions](
	[Role_Function_ID] [int] IDENTITY(1,1) NOT NULL,
	[Role_ID] [int] NULL,
	[Function_ID] [int] NULL,
	[Created_By] [varchar](100) NULL,
	[Created_Date] [datetime] NULL,
	[Deleted] [bit] NULL,
 CONSTRAINT [PK_Application_Role_Functions] PRIMARY KEY CLUSTERED 
(
	[Role_Function_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [admin].[Application_Roles] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [admin].[Application_Roles](
	[Role_ID] [int] IDENTITY(1,1) NOT NULL,
	[Role_Name] [varchar](100) NOT NULL,
	[Role_Level] [int] NULL,
	[Delete_Ind] [varchar](1) NULL,
	[Created_By] [varchar](100) NULL,
	[Created_Date] [datetime] NULL,
 CONSTRAINT [PK_Application_Roles] PRIMARY KEY CLUSTERED 
(
	[Role_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [admin].[Application_Route_Functions] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [admin].[Application_Route_Functions](
	[ID] [int] IDENTITY(1,1) NOT NULL,
	[View_ID] [int] NOT NULL,
	[Function_ID] [int] NOT NULL,
	[Deleted] [bit] NULL,
	[Created_By] [nvarchar](50) NOT NULL,
	[Created_Date] [datetime] NOT NULL,
	[Deleted_By] [nvarchar](50) NULL,
	[Deleted_Date] [datetime] NULL,
 CONSTRAINT [PK_Application_View_Functions] PRIMARY KEY CLUSTERED 
(
	[ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [admin].[Application_Routes] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [admin].[Application_Routes](
	[View_ID] [int] IDENTITY(1,1) NOT NULL,
	[View_Name] [nvarchar](50) NOT NULL,
	[Created_By] [nvarchar](50) NOT NULL,
	[Created_Date] [datetime] NOT NULL,
	[Deleted] [bit] NULL,
	[Deleted_By] [nvarchar](50) NULL,
	[Deleted_Date] [datetime] NULL,
 CONSTRAINT [PK_Application_Views] PRIMARY KEY CLUSTERED 
(
	[View_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [admin].[Application_User_Roles] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [admin].[Application_User_Roles](
	[User_Role_ID] [int] IDENTITY(1,1) NOT NULL,
	[User_ID] [int] NOT NULL,
	[Role_ID] [int] NOT NULL,
	[Delete_Ind] [varchar](1) NULL,
	[Created_By] [varchar](100) NULL,
	[Created_Date] [datetime] NULL,
	[Updated_By] [varchar](100) NULL,
	[Updated_Date] [datetime] NULL,
 CONSTRAINT [PK_Application_User_Roles] PRIMARY KEY CLUSTERED 
(
	[User_Role_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [admin].[Application_Users] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [admin].[Application_Users](
	[User_ID] [int] IDENTITY(1,1) NOT NULL,
	[UserName] [varchar](100) NOT NULL,
	[First_Name] [varchar](100) NULL,
	[Last_Name] [varchar](100) NULL,
	[Email] [varchar](50) NULL,
	[Delete_Ind] [varchar](1) NULL,
	[Is_Active] [bit] NULL,
	[Created_By] [varchar](100) NULL,
	[Created_Date] [datetime] NULL,
	[Updated_By] [varchar](100) NULL,
	[Updated_Date] [datetime] NULL,
	[Last_Activity_Comments] [varchar](200) NULL,
	[Test_Account] [bit] NULL,
	[Refresh_Token] [nvarchar](100) NULL,
	[Refresh_Token_Expiry_Time] [nvarchar](100) NULL,
 CONSTRAINT [PK_Application_Users] PRIMARY KEY CLUSTERED 
(
	[User_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [admin].[External_Activity] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [admin].[External_Activity](
	[User_ID] [int] IDENTITY(1,1) NOT NULL,
	[User_Token] [varchar](max) NOT NULL,
	[Created_Date] [datetime] NULL,
	[Last_Activity_Comments] [varchar](200) NULL,
	[Age_Unit] [nvarchar](100) NULL,
	[Age_Value] [int] NULL,
	[Weight_Unit] [nvarchar](100) NULL,
	[Weight_Value] [float] NULL,
	[Height_Unit] [nvarchar](100) NULL,
	[Height_Value] [float] NULL,
	[Sex] [nvarchar](100) NULL,
	[Reference_Time] [datetime] NULL,
	[Med_Table_Log] [nvarchar](max) NULL,
 CONSTRAINT [PK_External_Activity] PRIMARY KEY CLUSTERED 
(
	[User_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [admin].[External_User] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [admin].[External_User](
	[User_ID] [int] IDENTITY(1,1) NOT NULL,
	[User_Token] [varchar](max) NOT NULL,
	[Created_Date] [datetime] NULL,
	[IP_Adress] [nvarchar](max) NULL,
	[IP_Location] [nvarchar](max) NULL,
	[Deleted] [bit] NULL,
 CONSTRAINT [PK_External_User] PRIMARY KEY CLUSTERED 
(
	[User_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [api].[EndpointParameters] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [api].[EndpointParameters](
	[Parameter_ID] [int] IDENTITY(1,1) NOT NULL,
	[Endpoint_ID] [int] NOT NULL,
	[Parameter_Name] [nvarchar](100) NOT NULL,
	[Parameter_Type] [nvarchar](50) NOT NULL,
	[Parameter_Order] [int] NULL,
	[Null_Value] [nvarchar](100) NULL,
	[Is_Optional] [bit] NULL,
	[Description] [nvarchar](200) NULL,
	[Created_Date] [datetime] NULL,
	[Created_By] [nvarchar](50) NULL,
	[Updated_Date] [datetime] NULL,
	[Updated_By] [nvarchar](50) NULL,
	[Activity_Notes] [nvarchar](200) NULL,
	[Deleted] [bit] NULL,
	[Parameter_Destination] [nvarchar](50) NULL,
	[Is_User_Pass] [bit] NULL,
	[System_Provided] [bit] NULL,
	[Template] [nvarchar](200) NULL,
	[Delimiter] [nvarchar](10) NULL,
 CONSTRAINT [PK_EndpointParameters] PRIMARY KEY CLUSTERED 
(
	[Parameter_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [api].[Endpoints] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [api].[Endpoints](
	[Endpoint_ID] [int] IDENTITY(1,1) NOT NULL,
	[Endpoint_Name] [nvarchar](100) NOT NULL,
	[Request_Type] [nvarchar](10) NOT NULL,
	[Stored_Procedure] [nvarchar](100) NULL,
	[Connection_Name] [nvarchar](50) NULL,
	[Result_Type] [nvarchar](100) NULL,
	[Allow_Anonymous] [bit] NULL,
	[DataSet_Table_Names] [nvarchar](200) NULL,
	[UseParam0UserPass] [bit] NULL,
	[Description] [nvarchar](200) NULL,
	[Created_Date] [datetime] NULL,
	[Created_By] [nvarchar](50) NULL,
	[Updated_Date] [datetime] NULL,
	[Updated_By] [nvarchar](50) NULL,
	[Activity_Notes] [nvarchar](200) NULL,
	[Deleted] [bit] NULL,
	[Call_Type] [nvarchar](50) NULL,
	[Credential_Source] [nvarchar](50) NULL,
	[Credential_Key] [nvarchar](50) NULL,
	[URL_Base] [nvarchar](50) NULL,
	[URL] [nvarchar](500) NULL,
 CONSTRAINT [PK_Endpoints] PRIMARY KEY CLUSTERED 
(
	[Endpoint_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [api].[EndpointSecurity] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [api].[EndpointSecurity](
	[Security_ID] [int] IDENTITY(1,1) NOT NULL,
	[Endpoint_ID] [int] NOT NULL,
	[Role_ID] [int] NOT NULL,
	[Created_Date] [datetime] NULL,
	[Created_By] [nvarchar](50) NULL,
	[Updated_Date] [datetime] NULL,
	[Updated_By] [nvarchar](50) NULL,
	[Activity_Notes] [nvarchar](200) NULL,
	[Has_Access] [bit] NULL,
	[Deleted] [bit] NULL,
 CONSTRAINT [PK_EndpointSecurity] PRIMARY KEY CLUSTERED 
(
	[Security_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [api].[Error_Logs] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [api].[Error_Logs](
	[ERR_ID] [int] IDENTITY(1,1) NOT NULL,
	[ERROR_SOURCE] [varchar](100) NOT NULL,
	[ERROR_DESCRIPTION] [varchar](max) NOT NULL,
	[CREATED_BY] [varchar](100) NOT NULL,
	[CREATED_DATE] [datetime] NOT NULL,
	[OTHER_INFO] [varchar](255) NULL,
	[IP_ADDRESS] [varchar](255) NULL,
 CONSTRAINT [PK_Error_Logs] PRIMARY KEY CLUSTERED 
(
	[ERR_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [api].[Graph_Logs] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [api].[Graph_Logs](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[provider] [nvarchar](50) NOT NULL,
	[timestamp] [datetime] NOT NULL,
	[age] [float] NOT NULL,
	[age_unit] [nvarchar](50) NOT NULL,
	[weight] [float] NOT NULL,
	[weight_unit] [nvarchar](50) NOT NULL,
	[height] [float] NOT NULL,
	[height_unit] [nvarchar](50) NOT NULL,
	[sex] [char](1) NOT NULL,
	[med_tables] [nvarchar](max) NOT NULL,
	[med_data] [nvarchar](max) NULL,
	[case_id] [nvarchar](50) NULL,
	[reference_time] [nvarchar](50) NOT NULL,
	[max_time] [int] NOT NULL,
	[failure_reason] [nvarchar](150) NULL,
 CONSTRAINT [PK_Graph_Logs] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [api].[User_Logs] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [api].[User_Logs](
	[Activity_ID] [int] IDENTITY(1,1) NOT NULL,
	[Activity_Client] [varchar](255) NULL,
	[Activity_UserName] [nchar](255) NULL,
	[Activity_Date] [datetime] NOT NULL,
	[Activity_Source_IP] [varchar](50) NULL,
	[Activity_Server_IP] [varchar](50) NULL,
	[Activity_Browser_Details] [varchar](500) NULL,
	[Activity_Type] [varchar](50) NULL,
	[Activity_Details] [varchar](max) NULL,
 CONSTRAINT [PK_User_Logs] PRIMARY KEY CLUSTERED 
(
	[Activity_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [api].[UserLogin_Log] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [api].[UserLogin_Log](
	[Record_Id] [int] IDENTITY(1,1) NOT NULL,
	[User_Name] [varchar](255) NOT NULL,
	[MPOG_Case_ID] [nvarchar](50) NULL,
	[Surgical_Log_ID] [nvarchar](50) NULL,
	[Patient_ID] [nvarchar](50) NULL,
	[Patient_MRN] [nvarchar](50) NULL,
	[Patient_First_Name] [nvarchar](100) NULL,
	[Patient_Last_Name] [nvarchar](100) NULL,
	[Login_DateTime] [datetime] NOT NULL,
	[Login_Date] [date] NOT NULL,
	[Login_Month] [int] NOT NULL,
	[Login_Year] [int] NOT NULL,
	[Login_Success] [bit] NOT NULL,
	[Source] [varchar](50) NOT NULL,
 CONSTRAINT [PK_UserLogin_Log] PRIMARY KEY CLUSTERED 
(
	[Record_Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [core].[List_Groups] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [core].[List_Groups](
	[List_Group_ID] [int] IDENTITY(1,1) NOT NULL,
	[List_Group_Name] [nvarchar](50) NOT NULL,
	[Created_By] [nchar](10) NOT NULL,
	[Created_Date] [datetime] NOT NULL,
	[Activity_Notes] [nvarchar](100) NULL,
	[Deleted] [bit] NULL,
	[Include_In_All_Lists_SP] [bit] NULL,
 CONSTRAINT [PK_List_Groups] PRIMARY KEY CLUSTERED 
(
	[List_Group_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [core].[List_Values] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [core].[List_Values](
	[List_ID] [int] IDENTITY(1,1) NOT NULL,
	[List_Group_ID] [int] NOT NULL,
	[List_Value] [nvarchar](100) NOT NULL,
	[List_Order] [int] NULL,
	[Created_By] [nchar](10) NOT NULL,
	[Created_Date] [datetime] NOT NULL,
	[Activity_Notes] [nvarchar](100) NULL,
	[Deleted] [bit] NULL,
 CONSTRAINT [PK_List_Values] PRIMARY KEY CLUSTERED 
(
	[List_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [core].[Medication_Models] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [core].[Medication_Models](
	[Model_ID] [int] IDENTITY(1,1) NOT NULL,
	[Medication_ID] [int] NOT NULL,
	[Model_Name] [nvarchar](100) NOT NULL,
	[k01] [float] NOT NULL,
	[Vc] [float] NOT NULL,
	[k10] [float] NOT NULL,
	[k12] [float] NOT NULL,
	[k13] [float] NOT NULL,
	[k21] [float] NOT NULL,
	[k31] [float] NOT NULL,
	[ke0] [float] NOT NULL,
	[tci_unit] [nvarchar](50) NOT NULL,
	[useABWCorrection] [bit] NOT NULL,
	[useLBMCorrection] [bit] NOT NULL,
	[useWeightAdjusted] [bit] NOT NULL,
	[useAge] [bit] NOT NULL,
	[useWeight] [bit] NOT NULL,
	[useHeight] [bit] NOT NULL,
	[useSex] [bit] NOT NULL,
	[Default] [bit] NOT NULL,
	[Stored_Procedure] [nvarchar](100) NULL,
	[Created_By] [nvarchar](50) NOT NULL,
	[Created_Date] [datetime] NOT NULL,
	[Notes] [nvarchar](500) NULL,
 CONSTRAINT [PK_Medication_Models] PRIMARY KEY CLUSTERED 
(
	[Model_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [core].[Medications] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [core].[Medications](
	[Med_ID] [int] IDENTITY(1,1) NOT NULL,
	[Med_Order] [int] NOT NULL,
	[Medication_Name] [nvarchar](100) NOT NULL,
	[Medication_Search_Terms] [nvarchar](200) NOT NULL,
	[Standard_Concentration] [float] NULL,
	[Standard_Concentration_Unit] [nvarchar](50) NULL,
	[Concentration_Units] [nvarchar](50) NULL,
	[Bolus_Units] [nvarchar](50) NULL,
	[Infusion_Units] [nvarchar](50) NULL,
	[Default_Units] [nvarchar](50) NULL,
	[Units] [nvarchar](200) NULL,
	[Lower] [float] NULL,
	[Upper] [float] NULL,
	[Typical] [float] NULL,
	[MEAC] [float] NULL,
	[EndCe] [float] NULL,
	[EndCeText] [nvarchar](50) NULL,
	[Load_Graph_Default] [bit] NOT NULL,
	[Active] [bit] NOT NULL,
	[Deleted] [bit] NULL,
	[Created_Date] [datetime] NOT NULL,
	[Created_By] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK_Medications] PRIMARY KEY CLUSTERED 
(
	[Med_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [admin].[Application_User_Roles]  WITH CHECK ADD  CONSTRAINT [FK_Application_User_Roles_Application_Roles] FOREIGN KEY([Role_ID])
REFERENCES [admin].[Application_Roles] ([Role_ID])
GO
ALTER TABLE [admin].[Application_User_Roles] CHECK CONSTRAINT [FK_Application_User_Roles_Application_Roles]
GO
ALTER TABLE [admin].[Application_User_Roles]  WITH CHECK ADD  CONSTRAINT [FK_Application_User_Roles_Application_Users] FOREIGN KEY([User_ID])
REFERENCES [admin].[Application_Users] ([User_ID])
GO
ALTER TABLE [admin].[Application_User_Roles] CHECK CONSTRAINT [FK_Application_User_Roles_Application_Users]
GO
ALTER TABLE [api].[EndpointParameters]  WITH CHECK ADD  CONSTRAINT [FK_EndpointParameters_Endpoints] FOREIGN KEY([Endpoint_ID])
REFERENCES [api].[Endpoints] ([Endpoint_ID])
GO
ALTER TABLE [api].[EndpointParameters] CHECK CONSTRAINT [FK_EndpointParameters_Endpoints]
GO
ALTER TABLE [api].[EndpointSecurity]  WITH CHECK ADD  CONSTRAINT [FK_EndpointSecurity_Endpoints] FOREIGN KEY([Endpoint_ID])
REFERENCES [api].[Endpoints] ([Endpoint_ID])
GO
ALTER TABLE [api].[EndpointSecurity] CHECK CONSTRAINT [FK_EndpointSecurity_Endpoints]
GO
/****** Object:  StoredProcedure [admin].[AddApplicationFunction] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		<Andres Ibarra>
-- Create date: <05-12-2020>
-- Description:	<Add Application Function>
-- =============================================
CREATE PROCEDURE [admin].[AddApplicationFunction]
    -- Add the parameters for the stored procedure here
    --@CONTROLLED_SUBSTANCE_NAME VARCHAR(10),
	@User VARCHAR(100),
    @Function_Name VARCHAR(50),
    @Display_Name VARCHAR(50),
    @Parent_ID INT,
    @Function_Details VARCHAR(200),
    @Type VARCHAR(50),
    @Display_Order INT
AS
BEGIN
    -- SET NOCOUNT ON added to prevent extra result sets from
    -- interfering with SELECT statements.
    --SET NOCOUNT ON;
    DECLARE @data_details VARCHAR(MAX);

    SET @data_details
        = ':Function_Name:' + @Function_Name + ':Display_Name:' + @Display_Name + ':Parent_ID:' + CAST(@Parent_ID AS VARCHAR)
                + ':Function_Details:' + @Function_Details + ':Type:' + @Type + ':Display_Order:' + CAST(@Display_Order AS VARCHAR);

    EXEC api.SaveUserLog
         @User = @User,  -- varchar(255)
         @Activity_Source_IP = NULL,        -- varchar(50)
         @Activity_Server_IP = NULL,        -- varchar(50)
         @Activity_Browser_Details = NULL,  -- varchar(500)
         @Activity_Type = 'ADD_APPLICATION_FUNCTION',      -- varchar(50)
         @Activity_Details = @data_details; -- varchar(max)

    INSERT INTO admin.Application_Functions
    (
        Function_Name,
        Display_Name,
        Parent_ID,
        Function_Details,
        Type,
        Display_Order
    )
    VALUES
        (   @Function_Name, -- Function_Name - varchar(50)
            @Display_Name, -- Display_Name - varchar(50)
            @Parent_ID,  -- Parent_ID - int
            @Function_Details, -- Function_Details - varchar(200)
            @Type, -- Type - varchar(50)
            @Display_Order   -- DisplayOrder - int
        )


END;
GO
/****** Object:  StoredProcedure [admin].[AddClient] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 2022-04-22
-- Description:	Adds Client Definition
-- =============================================
CREATE PROCEDURE [admin].[AddClient] 
	@User VARCHAR(100),
	@Client_Name NVARCHAR(50),
	-- GUID
	@Client_ID NVARCHAR(50),
	-- GUID Base64Encode & Encrypted
	@Secret_ID NVARCHAR(100)
AS
BEGIN
	SET NOCOUNT ON;

INSERT INTO admin.Application_Clients
(
    Client_Name,
    Client_ID,
    Secret_ID,
    Created_By,
    Created_Date,
    Updated_By,
    Updated_Date,
    Activity_Notes,
    Deleted
)
VALUES
    (   @Client_Name,       -- Client_Name - nvarchar(50)
        @Client_ID,       -- Client_ID - nvarchar(50)
        @Secret_ID,       -- Secret_ID - nvarchar(50)
        @User,       -- User - nvarchar(50)
        GETDATE(), -- Created_Date - datetime
        NULL,      -- Updated_By - nvarchar(50)
        NULL,      -- Updated_Date - datetime
        N'Client Created',       -- Activity_Notes - nvarchar(100)
        NULL       -- Deleted - bit
    )
END
GO
/****** Object:  StoredProcedure [admin].[AddUpdateUserRoles] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Owen Liu
-- Update date: 10/29/2026
-- Description:	Updated [Admin].Application_User_Roles to [admin].Application_User_Roles
-- Author:		Anik Sinha 
-- Create date: 11/30/2017
-- Description:	Add / Update User roles for application
-- =============================================
CREATE PROCEDURE [admin].[AddUpdateUserRoles]
    @User_ID INT,
	@Role_ID INT ,
    @Activity_By VARCHAR(50)
AS
    BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
        SET NOCOUNT ON;

        BEGIN TRY

			INSERT INTO [admin].Application_User_Roles
			        ( User_ID ,
			          Role_ID ,
			          Created_By ,
			          Created_Date ,
			          Updated_By ,
			          Updated_Date ,
			          Delete_Ind
			        )
			VALUES  ( @User_ID , -- User_ID - int
			          @Role_ID , -- Role_ID - int
			          @Activity_By , -- Created_By - varchar(50)
			          GETDATE() , -- Created_Date - datetime
			          null , -- Updated_By - varchar(50)
			          null , -- Updated_Date - datetime
			          NULL  -- Deleted - bit
			        )
			       
			       
	
        END TRY
        BEGIN CATCH

			SELECT 'Error in AddUpdateUserRoles::' + CAST(ERROR_NUMBER() AS VARCHAR(100)) + ':' + CAST(ERROR_MESSAGE() AS VARCHAR(MAX));
        END CATCH;
    END;

GO
/****** Object:  StoredProcedure [admin].[AddUser] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		<Andres Ibarra>
-- Create date: <05/05/2020>
-- Description:	<Add CST User>
-- =============================================
CREATE PROCEDURE [admin].[AddUser]
    -- Add the parameters for the stored procedure here
	@User VARCHAR(100),
    @User_Name VARCHAR(100),
    @First_Name VARCHAR(100),
    @Last_Name VARCHAR(100),
    @Role_ID_List VARCHAR(100),
    @Is_Active INT
AS
BEGIN
    -- SET NOCOUNT ON added to prevent extra result sets from
    -- interfering with SELECT statements.
    SET NOCOUNT ON;

    DECLARE @User_ID INT;

    BEGIN TRAN T1;
    BEGIN TRY

        DECLARE @data_details VARCHAR(MAX);

        SET @data_details
            = ':UserName:' + @User_Name + ':FirstName:' + @First_Name + ':LastName:' + @Last_Name
                    + ':RoleIdList:' + @Role_ID_List + ':IsActive:' + CAST(@Is_Active AS VARCHAR);



        --SELECT * FROM kit.QA_Narcotic_Discrepancy_Log  WHERE kit_transaction_id =@Transaction_ID

        IF EXISTS
            (
                SELECT 'x'
                FROM admin.Application_Users WITH (NOLOCK)
                WHERE ISNULL(Delete_Ind, 'N')='N' AND UserName = @User_Name
            )
            BEGIN
                RAISERROR(15600, -1, -1, 'Error:Username is already taken.');

                RETURN;
            END;

        INSERT INTO admin.Application_Users
        (
            UserName,
            First_Name,
            Last_Name,
            Delete_Ind,
            Is_Active,
            Created_By,
            Created_Date,
            Updated_By,
            Updated_Date,
            Last_Activity_Comments,
            Test_Account,
            Refresh_Token,
            Refresh_Token_Expiry_Time
        )
        VALUES
        (
		@User_Name, 
		@First_Name, 
		@Last_Name, 
		'N', 
		@Is_Active, 
		@User, 
		GETDATE(), 
		NULL,
		NULL,
		'User Created',
		NULL,
		NULL,
		NULL
		);

        SET @User_ID = SCOPE_IDENTITY(); -- returns last identity created from this procedure

        INSERT INTO admin.Application_User_Roles
        (
            User_ID,
            Role_ID,
            Created_By,
            Created_Date
        )
        SELECT @User_ID,
               value,
               @User,
               GETDATE()
        FROM STRING_SPLIT(@Role_ID_List, ',');

        COMMIT TRAN T1;
    END TRY
    BEGIN CATCH
        ROLLBACK TRAN T1;

        DECLARE @ErrorMessage NVARCHAR(4000);
        DECLARE @ErrorSeverity INT;
        DECLARE @ErrorState INT;

        SELECT @ErrorMessage = ERROR_MESSAGE(),
               @ErrorSeverity = ERROR_SEVERITY(),
               @ErrorState = ERROR_STATE();

        -- Use RAISERROR inside the CATCH block to return error  
        -- information about the original error that caused  
        -- execution to jump to the CATCH block.  
        RAISERROR(   @ErrorMessage,  -- Message text.  
            @ErrorSeverity, -- Severity.  
            @ErrorState     -- State.  
            );
    END CATCH;

END;
GO
/****** Object:  StoredProcedure [admin].[CheckUserExists] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		<Alex Hoffmann>
-- Create date: <01/11/2021>
-- Description:	<Check if CST User Exists>
-- =============================================
CREATE PROCEDURE [admin].[CheckUserExists]
    -- Add the parameters for the stored procedure here
@User_Name VARCHAR(100)
AS
BEGIN
    -- SET NOCOUNT ON added to prevent extra result sets from
    -- interfering with SELECT statements.
    SET NOCOUNT ON;


    BEGIN TRY

        IF NOT EXISTS
            (
                SELECT 'x'
                FROM admin.Application_Users WITH (NOLOCK)
                WHERE UserName = @User_Name
            )
            BEGIN
                RAISERROR(15600, -1, -1, 'Error:Username does not exist.');

                RETURN;
            END;

    END TRY
    BEGIN CATCH

        DECLARE @ErrorMessage NVARCHAR(4000);
        DECLARE @ErrorSeverity INT;
        DECLARE @ErrorState INT;

        SELECT @ErrorMessage = ERROR_MESSAGE(),
               @ErrorSeverity = ERROR_SEVERITY(),
               @ErrorState = ERROR_STATE();

        -- Use RAISERROR inside the CATCH block to return error  
        -- information about the original error that caused  
        -- execution to jump to the CATCH block.  
        RAISERROR(   @ErrorMessage,  -- Message text.  
            @ErrorSeverity, -- Severity.  
            @ErrorState     -- State.  
            );
    END CATCH;

END;
GO
/****** Object:  StoredProcedure [admin].[DeleteUser] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [admin].[DeleteUser]
@User NVARCHAR (50), @User_ID INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE admin.Application_Users
    SET    Delete_Ind             = 'Y',
           Updated_By             = @User,
           Updated_Date           = GETDATE(),
           Last_Activity_Comments = 'User Deleted'
    WHERE  @User_ID = User_ID
           AND ISNULL(Delete_Ind, 'N') = 'N';
END

GO
/****** Object:  StoredProcedure [admin].[DeleteUserRoles] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Owen Liu
-- Update date: 10/29/2026
-- Description:	Updated [Admin].Application_User_Roles to [admin].Application_User_Roles
-- Author:		Anik Sinha 
-- Create date: 11/03/2017
-- Description:	Delete User Roles
-- =============================================
CREATE PROCEDURE [admin].[DeleteUserRoles]
    @User_ID INT,
	@Activity_By VARCHAR(50)
AS
    BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
        SET NOCOUNT ON;

        BEGIN TRY

			UPDATE [admin].Application_User_Roles
			SET Delete_Ind='Y',Updated_By=@Activity_By,Updated_Date=GETDATE()
			WHERE User_ID=@User_ID AND ISNULL(Delete_Ind,'N')='N';
			
	
        END TRY
        BEGIN CATCH

			SELECT 'Error in DeleteUserRoles::' + CAST(ERROR_NUMBER() AS VARCHAR(100)) + ':' + CAST(ERROR_MESSAGE() AS VARCHAR(MAX));
        END CATCH;
    END;

GO
/****** Object:  StoredProcedure [admin].[EditUser] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [admin].[EditUser]
	@User NVARCHAR (50), 
	@User_ID INT, 
	@User_Name VARCHAR (100), 
	@First_Name VARCHAR (100), 
	@Last_Name VARCHAR (100), 
	@Role_ID_List VARCHAR (100), 
	@Is_Active BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION T1;
    BEGIN TRY
        SET @User_ID = ISNULL(@User_ID, -1);     -- if new user, then set to -1, for (1) match
        DECLARE @data_details AS VARCHAR (MAX);
        SET @data_details = ':UserId:' + CAST (@User_ID AS VARCHAR) + ':UserName:' + @User_Name + ':FirstName:' + @First_Name + ':LastName:' + @Last_Name + ':RoleIdList:' + @Role_ID_List + ':IsActive:' + CAST (@Is_Active AS VARCHAR);
        EXECUTE api.SaveUserLog @User=@User, @Activity_Source_IP = NULL, @Activity_Server_IP = NULL, @Activity_Browser_Details = NULL, @Activity_Type = 'EDIT_USER', @Activity_Details = @data_details;

        -- 1) the name must not belong to a different active user
        IF EXISTS (SELECT 'x'
                   FROM   admin.Application_Users WITH (NOLOCK)
                   WHERE  ISNULL(Delete_Ind, 'N') = 'N'
                          AND UserName = @User_Name
                          AND User_ID <> @User_ID)
            BEGIN
                RAISERROR('Error:Username is already taken.', 16, 1);
            END
        -- 2) existing user matched by ID, otherwise create
        IF EXISTS (SELECT 'x'
                   FROM   admin.Application_Users WITH (NOLOCK)
                   WHERE  ISNULL(Delete_Ind, 'N') = 'N'
                          AND User_ID = @User_ID)
            BEGIN
                UPDATE admin.Application_Users
                SET    UserName               = @User_Name,
                       First_Name             = @First_Name,
                       Last_Name              = @Last_Name,
                       Is_Active              = @Is_Active,
                       Updated_By             = @User,
                       Updated_Date           = GETDATE(),
                       Last_Activity_Comments = 'User updated'
                WHERE  User_ID = @User_ID;
                UPDATE admin.Application_User_Roles
                SET    Delete_Ind = 'Y'
                WHERE  User_ID = @User_ID;
                INSERT INTO admin.Application_User_Roles (User_ID, Role_ID, Created_By, Created_Date)
                SELECT @User_ID,
                       value,
                       @User,
                       GETDATE()
                FROM   STRING_SPLIT (@Role_ID_List, ',');
            END
        ELSE
            BEGIN
                INSERT  INTO admin.Application_Users (UserName, First_Name, Last_Name, Email, Delete_Ind, Is_Active, Created_By, Created_Date, Updated_By, Updated_Date, Last_Activity_Comments, Test_Account, Refresh_Token, Refresh_Token_Expiry_Time)
                VALUES                              (@User_Name, @First_Name, @Last_Name, NULL, NULL, 1, @User, GETDATE(), NULL, NULL, 'User Created', NULL, NULL, NULL);
                SET @User_ID = SCOPE_IDENTITY(); -- returns last identity created from this procedure
                INSERT INTO admin.Application_User_Roles (User_ID, Role_ID, Delete_Ind, Created_By, Created_Date, Updated_By, Updated_Date)
                SELECT @User_ID,
                       value,
                       NULL,
                       @User,
                       GETDATE(),
                       NULL,
                       NULL
                FROM   STRING_SPLIT (@Role_ID_List, ',');
            END
        COMMIT TRANSACTION T1;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION T1;
        DECLARE @ErrorMessage AS NVARCHAR (4000);
        DECLARE @ErrorSeverity AS INT;
        DECLARE @ErrorState AS INT;
        SELECT @ErrorMessage = ERROR_MESSAGE(),
               @ErrorSeverity = ERROR_SEVERITY(),
               @ErrorState = ERROR_STATE();
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END

GO
/****** Object:  StoredProcedure [admin].[GetAllApplicationFunctions] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		<Andres Ibarra>
-- Create date: <05-12-2020>
-- Description:	<Get All Application Functions>
-- =============================================
CREATE PROCEDURE [admin].[GetAllApplicationFunctions]
AS
BEGIN
    SELECT Function_ID,
           Function_Name,
           Display_Name,
           Parent_ID,
           Function_Details,
           Type,
           Display_Order FROM [admin].[Application_Functions]  WITH (NOLOCK)

END;
GO
/****** Object:  StoredProcedure [admin].[GetApplicationConfigurations] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [admin].[GetApplicationConfigurations] @configurationName VARCHAR(50)
AS
BEGIN
    SELECT Configuration_ID,
           Configuration_Name,
           Configuration_Key_Name,
           Configuration_Key_Value
    FROM admin.Application_Configurations WITH (NOLOCK)
    WHERE Configuration_Name = @configurationName;
END;
GO
/****** Object:  StoredProcedure [admin].[GetApplicationLists] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Alex Hoffmann
-- Create date: 2025-01-06
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [admin].[GetApplicationLists]
	@Category NVARCHAR(50) = NULL,
	@Section NVARCHAR(50) = NULL,
	@Key NVARCHAR(50) = NULL
AS
BEGIN
	SET NOCOUNT ON;

    SELECT
		al.ID,
        al.Category,
        al.Section,
        al.List_Key,
        al.List_Value
	FROM admin.Application_Lists al WITH(NOLOCK)
	WHERE ISNULL(al.Deleted, 0)=0
	AND (@Category IS NULL OR UPPER(@Category)=UPPER(al.Category))
	AND (@Section IS NULL OR UPPER(@Section)=UPPER(al.Section))
	AND (@Key IS NULL OR UPPER(@Key)=UPPER(al.List_Key))
END
GO
/****** Object:  StoredProcedure [admin].[GetClientDetails] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [admin].[GetClientDetails]
@Client_ID VARCHAR(50)
AS
BEGIN
    BEGIN TRY

        IF NOT EXISTS
            (
                SELECT 'x'
                FROM admin.Application_Clients WITH(NOLOCK)
                WHERE Client_ID=@Client_ID AND ISNULL(Deleted, 0)=0
            )
            BEGIN
                RAISERROR(15600, -1, -1, 'Error:Client does not exist.');

                RETURN;
            END;

    END TRY
    BEGIN CATCH

        DECLARE @ErrorMessage NVARCHAR(4000);
        DECLARE @ErrorSeverity INT;
        DECLARE @ErrorState INT;

        SELECT @ErrorMessage = ERROR_MESSAGE(),
               @ErrorSeverity = ERROR_SEVERITY(),
               @ErrorState = ERROR_STATE();

        -- Use RAISERROR inside the CATCH block to return error  
        -- information about the original error that caused  
        -- execution to jump to the CATCH block.  
        RAISERROR(   @ErrorMessage,  -- Message text.  
            @ErrorSeverity, -- Severity.  
            @ErrorState     -- State.  
            );
    END CATCH;

    SELECT ac.ID,
           ac.Client_Name,
           ac.Client_ID,
           ac.Secret_ID,
           ac.Refresh_Token,
           ac.Refresh_Token_Expiry_Time,
           ar.Role_Name
    FROM admin.Application_Clients ac WITH (NOLOCK)
             LEFT JOIN admin.Application_Client_Roles aur WITH (NOLOCK)
                       ON aur.Client_ID = ac.ID
                           AND ISNULL(aur.Delete_Ind, 'N') = 'N'
             LEFT JOIN admin.Application_Roles ar WITH (NOLOCK)
                       ON ar.Role_ID = aur.Role_ID AND ISNULL(ar.Delete_Ind, 'N') = 'N'
    WHERE ISNULL(ac.Deleted, 0) = 0
      AND ac.Client_ID = @Client_ID;
END;
GO
/****** Object:  StoredProcedure [admin].[GetUserDetails] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [admin].[GetUserDetails] @username VARCHAR(50)
AS
BEGIN
    BEGIN TRY

        IF NOT EXISTS
            (
                SELECT 'x'
                FROM admin.Application_Users WITH (NOLOCK)
                WHERE LOWER(UserName) = LOWER(@username)
				AND ISNULL(Delete_Ind,'N')='N'
            )
            BEGIN
                RAISERROR(15600, -1, -1, 'Error:Username does not exist.');

                RETURN;
            END;

    END TRY
    BEGIN CATCH

        DECLARE @ErrorMessage NVARCHAR(4000);
        DECLARE @ErrorSeverity INT;
        DECLARE @ErrorState INT;

        SELECT @ErrorMessage = ERROR_MESSAGE(),
               @ErrorSeverity = ERROR_SEVERITY(),
               @ErrorState = ERROR_STATE();

        -- Use RAISERROR inside the CATCH block to return error  
        -- information about the original error that caused  
        -- execution to jump to the CATCH block.  
        RAISERROR(   @ErrorMessage,  -- Message text.  
            @ErrorSeverity, -- Severity.  
            @ErrorState     -- State.  
            );
    END CATCH;
    --Commented the user log 7/14/2020 Anik
    --EXEC dbo.SaveUserLog @Activity_UserName = @username, -- varchar(255)
    --                     @Activity_Source_IP = NULL,        -- varchar(50)
    --                     @Activity_Server_IP = NULL,        -- varchar(50)
    --                     @Activity_Browser_Details = NULL,  -- varchar(500)
    --                     @Activity_Type = 'GETUSERDETAILS',  -- varchar(50)
    --                     @Activity_Details = 'User details was accessed'; -- varchar(max)

    SELECT au.User_ID,
           au.UserName,
           au.First_Name,
           au.Last_Name,
           ISNULL(au.Test_Account, 0) AS Test_Account,
           au.Delete_Ind,
           ar.Role_Name,
           au.Refresh_Token,
           au.Refresh_Token_Expiry_Time
    FROM admin.Application_Users au WITH (NOLOCK)
             JOIN admin.Application_User_Roles aur WITH (NOLOCK)
                  ON aur.User_ID = au.User_ID
                      AND ISNULL(aur.Delete_Ind, 'N') = 'N'
             JOIN admin.Application_Roles ar WITH (NOLOCK)
                  ON ar.Role_ID = aur.Role_ID
                      AND ISNULL(ar.Delete_Ind, 'N') = 'N'
    WHERE ISNULL(au.Delete_Ind, 'N') = 'N'
      AND ISNULL(au.Is_Active,1)=1
      AND LOWER(au.UserName) = LOWER(@username);
END;
GO
/****** Object:  StoredProcedure [admin].[GetUserPermissions] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [admin].[GetUserPermissions]
	@User NVARCHAR(50),
	@Slug NVARCHAR(50),
	@Route NVARCHAR(50)=NULL
AS
BEGIN
	SET NOCOUNT ON;
	WITH userFunctions AS (
		SELECT DISTINCT
			af.Function_ID,
			af.Function_Name,
			af.Display_Name,
			af.Parent_ID,
			af.Function_Details,
			af.Type,
			af.Display_Order,
			af.Default_Allow,
			af.Deleted
		FROM admin.Application_Users au WITH(NOLOCK)
		JOIN admin.Application_User_Roles aur WITH(NOLOCK)
			ON aur.User_ID = au.User_ID AND ISNULL(aur.Delete_Ind, 'N')='N'
		JOIN admin.Application_Role_Functions arf WITH(NOLOCK)
			ON aur.Role_ID=arf.Role_ID AND ISNULL(arf.Deleted, 0)=0
		JOIN admin.Application_Functions af WITH(NOLOCK)
			ON arf.Function_ID=af.Function_ID AND ISNULL(af.Deleted, 0)=0
		WHERE UPPER(@Slug)=UPPER(au.UserName) AND ISNULL(au.Delete_Ind, 'N')='N'
		UNION
		SELECT
			af.Function_ID,
			af.Function_Name,
			af.Display_Name,
			af.Parent_ID,
			af.Function_Details,
			af.Type,
			af.Display_Order,
			af.Default_Allow,
			af.Deleted
		FROM admin.Application_Functions af WITH(NOLOCK)
		WHERE ISNULL(af.Deleted, 0)=0 AND af.Default_Allow=1
	), viewFunctions AS (
		SELECT DISTINCT
			af.Function_ID,
			af.Function_Name,
			av.View_Name AS [Route],
			af.Display_Name,
			af.Function_Details,
			af.[Type],
			af.Display_Order,
			af.Default_Allow,
			af.Parent_ID
		FROM admin.Application_Routes av WITH(NOLOCK)
		JOIN admin.Application_Route_Functions avf WITH(NOLOCK)
			ON av.View_ID=avf.View_ID AND ISNULL(avf.Deleted, 0)=0
		JOIN admin.Application_Functions af WITH(NOLOCK)
			ON af.Function_ID=avf.Function_ID AND ISNULL(af.Deleted, 0)=0
		WHERE 
			ISNULL(av.Deleted, 0)=0 AND (@Route IS NULL OR UPPER(@Route)=UPPER(av.View_Name))
		UNION
		SELECT DISTINCT
			af.Function_ID,
			af.Function_Name,
			'Shared' AS [Route],
			af.Display_Name,
			af.Function_Details,
			af.[Type],
			af.Display_Order,
			af.Default_Allow,
			af.Parent_ID
		FROM admin.Application_Functions af WITH(NOLOCK)
		WHERE ISNULL(af.Deleted, 0)=0 AND af.Type='Route'
		UNION
		SELECT DISTINCT
			af.Function_ID,
			af.Function_Name,
			'Shared' AS [Route],
			af.Display_Name,
			af.Function_Details,
			af.[Type],
			af.Display_Order,
			af.Default_Allow,
			af.Parent_ID
		FROM admin.Application_Functions af WITH(NOLOCK)
		WHERE ISNULL(af.Deleted, 0)=0 AND (ISNULL(af.Default_Allow, 0)=1) AND af.Type<>'Route'
	), categoryFunctions AS (
		SELECT DISTINCT
			af2.Function_ID,
			af2.Function_Name,
			af.[Route],
			af2.Display_Name,
			af2.Function_Details,
			af2.[Type],
			af2.Display_Order,
			af2.Default_Allow,
			af2.Parent_ID
		FROM viewFunctions af WITH(NOLOCK)
		JOIN admin.Application_Functions af2 WITH(NOLOCK)
			ON af.Function_ID=af2.Parent_ID AND ISNULL(af2.Deleted, 0)=0
		WHERE af.Type='Category'
	), joinedFunctions AS (
		SELECT
			*
		FROM viewFunctions
		UNION
		SELECT 
			*
		FROM categoryFunctions
	)
	SELECT 
		uf.Function_ID,
		uf.Function_Name,
		jf.[Route],
		uf.Display_Name,
		uf.Parent_ID,
		uf.Function_Details,
		uf.Type,
		ISNULL(uf.Display_Order, 0) AS Display_Order
	FROM userFunctions uf
	JOIN joinedFunctions jf
		ON jf.Function_ID = uf.Function_ID
	ORDER BY uf.Parent_ID, uf.Display_Order
END
GO
/****** Object:  StoredProcedure [admin].[GetUserRoleApplicationFunctions] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		<Andres Ibarra>
-- Create date: <05/08/2020>
-- Description:	<GetUserRoleApplicationFunctions>
-- =============================================
CREATE PROCEDURE [admin].[GetUserRoleApplicationFunctions] @Role_Name VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ar.Role_Name,
           arf.Role_ID,
           af.Function_ID,
           af.[Function_Name],
           af.Display_Name,
           af.Type,
           af.Display_Order,
           af.Parent_ID
    FROM [admin].[Application_Functions] af WITH (NOLOCK)
             JOIN [admin].[Application_Role_Functions] arf WITH (NOLOCK)
                  ON af.Function_ID = arf.Function_ID
                      AND ISNULL(arf.Deleted, 0) = 0
             JOIN [admin].[Application_Roles] ar WITH (NOLOCK)
                  ON arf.Role_ID = ar.Role_ID
    WHERE Role_Name = @Role_Name
    ORDER BY af.Function_ID;

    SELECT af.Function_ID,
           af.[Function_Name],
           af.Display_Name,
           af.Type,
           af.Display_Order,
           af.Parent_ID
    FROM [admin].[Application_Functions] af WITH (NOLOCK)
    WHERE af.Function_ID NOT IN
          (
              SELECT af.Function_ID
              FROM [admin].[Application_Functions] af WITH (NOLOCK)
                       JOIN [admin].[Application_Role_Functions] arf WITH (NOLOCK)
                            ON af.Function_ID = arf.Function_ID
                                AND ISNULL(arf.Deleted, 0) = 0
                       JOIN [admin].[Application_Roles] ar WITH (NOLOCK)
                            ON arf.Role_ID = ar.Role_ID
              WHERE Role_Name = @Role_Name
          )
    ORDER BY af.Function_ID;

END;
GO
/****** Object:  StoredProcedure [admin].[GetUserRoles] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		<Andres Ibarra>
-- Create date: <05/04/2020>
-- Description:	<GetUserRoles>
-- =============================================
CREATE PROCEDURE [admin].[GetUserRoles]
AS
BEGIN
    SELECT [Role_ID]
         ,[Role_Name]
         ,[Role_Level]
         ,[Delete_Ind]
         ,[Created_By]
         ,[Created_Date]
    FROM [admin].[Application_Roles] WITH (NOLOCK)
    WHERE ISNULL(Delete_Ind,'N') = 'N'
    ORDER BY Role_Name;

END;
GO
/****** Object:  StoredProcedure [admin].[GetUsersByRole] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [admin].[GetUsersByRole]
@Role_Name VARCHAR (20)
AS
BEGIN
    SELECT   au.User_ID,
             au.UserName,
             au.First_Name,
             au.Last_Name,
             au.Is_Active,
             STRING_AGG(ar.Role_Name, '|') AS Roles
    FROM     admin.Application_Users AS au WITH (NOLOCK)
             INNER JOIN
             admin.Application_User_Roles AS aur WITH (NOLOCK)
             ON aur.User_ID = au.User_ID
             INNER JOIN
             admin.Application_Roles AS ar WITH (NOLOCK)
             ON ar.Role_ID = aur.Role_ID
    WHERE    (@Role_Name = ''
              OR ar.Role_Name = @Role_Name)
             AND ISNULL(aur.Delete_Ind, 'N') = 'N'
             AND ISNULL(au.Delete_Ind, 'N') = 'N'
    GROUP BY au.User_ID, au.UserName, au.First_Name, au.Last_Name, au.Is_Active
    ORDER BY 1;
END

GO
/****** Object:  StoredProcedure [admin].[GetUsersLoginCount] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Owen Liu
-- Update date: 10-29-2026
-- Description:	Update column names referred in the stored procedure to match the current schema of the database.
-- =============================================
CREATE PROCEDURE [admin].[GetUsersLoginCount]
@P_DateFrequency CHAR (1)='D',
@P_PageNumber INT = 1 -- Added page number parameter with a default value of 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        -- Calculate the starting row based on the page number and number of rows per page (10 rows per page)
        DECLARE @RowsPerPage INT = 10;
        DECLARE @StartRow INT = (@P_PageNumber - 1) * @RowsPerPage;

        IF @P_DateFrequency = 'D'
            WITH Successful_Logins AS (
                SELECT User_Name,
                       Login_Date,
                       MAX(Login_Month) AS Login_Month,
                       MAX(Login_Year) AS Login_Year,
                       COUNT(Login_Success) AS Login_Count
                FROM api.UserLogin_Log
                WHERE Login_Success = 1
                      AND Source <> 'MPOG'
                GROUP BY User_Name, Login_Date
            ),
            NumberedResults AS (
                SELECT app_users.First_Name,
                       app_users.Last_Name,
                       app_users.UserName AS Username,
                       success_login.Login_Date,
                       success_login.Login_Month,
                       success_login.Login_Year,
                       success_login.Login_Count,
                       ROW_NUMBER() OVER (ORDER BY success_login.Login_Date DESC, success_login.Login_Count DESC) AS RowNum
                FROM admin.Application_Users AS app_users
                     INNER JOIN Successful_Logins AS success_login
                     ON app_users.UserName = success_login.User_Name
                WHERE ISNULL(app_users.Delete_Ind, 'N') = 'N'
            )
            SELECT First_Name,
                   Last_Name,
                   Username,
                   Login_Date,
                   Login_Month,
                   Login_Year,
                   Login_Count, 
				   (SELECT COUNT(*) FROM NumberedResults) AS TotalRows
            FROM NumberedResults
            WHERE RowNum BETWEEN @StartRow + 1 AND @StartRow + @RowsPerPage
            ORDER BY RowNum;

        ELSE IF @P_DateFrequency = 'M'
            WITH Successful_Logins AS (
                SELECT User_Name,
                       Login_Month,
                       Login_Year,
                       COUNT(Login_Success) AS Login_Count
                FROM api.UserLogin_Log
                WHERE Login_Success = 1
                      AND Source <> 'MPOG'
                GROUP BY User_Name, Login_Month, Login_Year
            ),
            NumberedResults AS (
                SELECT app_users.First_Name,
                       app_users.Last_Name,
                       app_users.UserName AS Username,
                       success_login.Login_Month,
                       success_login.Login_Year,
                       success_login.Login_Count,
                       ROW_NUMBER() OVER (ORDER BY success_login.Login_Year DESC, success_login.Login_Month DESC, success_login.Login_Count DESC) AS RowNum
                FROM admin.Application_Users AS app_users
                     INNER JOIN Successful_Logins AS success_login
                     ON app_users.UserName = success_login.User_Name
                WHERE ISNULL(app_users.Delete_Ind, 'N') = 'N'
            )
            SELECT First_Name,
                   Last_Name,
                   Username,
                   CAST(Login_Year AS VARCHAR) + ' ' + CASE 
						WHEN Login_Month = 1 THEN 'Jan'
						WHEN Login_Month = 2 THEN 'Feb'
						WHEN Login_Month = 3 THEN 'Mar'
						WHEN Login_Month = 4 THEN 'Apr'
						WHEN Login_Month = 5 THEN 'May'
						WHEN Login_Month = 6 THEN 'Jun'
						WHEN Login_Month = 7 THEN 'Jul'
						WHEN Login_Month = 8 THEN 'Aug'
						WHEN Login_Month = 9 THEN 'Sep'
						WHEN Login_Month = 10 THEN 'Oct'
						WHEN Login_Month = 11 THEN 'Nov'
						WHEN Login_Month = 12 THEN 'Dec'
					END AS Login_Date,
                   Login_Year,
                   Login_Count, 
				   (SELECT COUNT(*) FROM NumberedResults) AS TotalRows
            FROM NumberedResults
            WHERE RowNum BETWEEN @StartRow + 1 AND @StartRow + @RowsPerPage
            ORDER BY RowNum;
    END TRY
    BEGIN CATCH
        SELECT 'Error in GetUserDetails::' + CAST (ERROR_NUMBER() AS VARCHAR (100)) + ':' + CAST (ERROR_MESSAGE() AS VARCHAR (MAX));
    END CATCH
END
GO
/****** Object:  StoredProcedure [admin].[Log_External_Activity] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Zhe Zhang
-- Description:	External User Log
-- =============================================


CREATE PROCEDURE [admin].[Log_External_Activity]
    -- @User_ID NVARCHAR(255),
    @User_Token NVARCHAR(MAX),
    @Last_Activity_Comments NVARCHAR(MAX),
    @Age_Unit NVARCHAR(10),
    @Age_Value INT,
    @Weight_Unit NVARCHAR(10),
    @Weight_Value FLOAT,
    @Height_Unit NVARCHAR(10),
    @Height_Value FLOAT,
    @Sex NVARCHAR(10),
    @Reference_Time DATETIME,
    @Med_Table_Log NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- Check if the User_Token exists in the External_User table
    IF EXISTS (SELECT 1 FROM [admin].[External_User] WHERE User_Token = @User_Token)
    BEGIN
        -- Insert statement for procedure here
        INSERT INTO [admin].[External_Activity]
        (
            -- [User_ID],
            [User_Token],
            [Created_Date],
            [Last_Activity_Comments],
            [Age_Unit],
            [Age_Value],
            [Weight_Unit],
            [Weight_Value],
            [Height_Unit],
            [Height_Value],
            [Sex],
            [Reference_Time],
            [Med_Table_Log]
        )
        VALUES
        (
            -- @User_ID,                     -- User_ID - nvarchar(255)
            @User_Token,                  -- User_Token - nvarchar(255)
            GETDATE(),                    -- Created_Date - datetime (now)
            @Last_Activity_Comments,      -- Last_Activity_Comments - nvarchar(max)
            @Age_Unit,                    -- Age_Unit - nvarchar(10)
            @Age_Value,                   -- Age_Value - int
            @Weight_Unit,                 -- Weight_Unit - nvarchar(10)
            @Weight_Value,                -- Weight_Value - float
            @Height_Unit,                 -- Height_Unit - nvarchar(10)
            @Height_Value,                -- Height_Value - float
            @Sex,                         -- Sex - nvarchar(10)
            @Reference_Time,              -- Reference_Time - datetime
            @Med_Table_Log                -- Med_Table_Log - nvarchar(max)
        )
    END
    ELSE
    BEGIN
        -- Optionally, you can handle the case where the User_Token does not exist
        RAISERROR('User_Token not found in External_User table.', 16, 1);
    END
END
GO
/****** Object:  StoredProcedure [admin].[Log_External_User] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


-- =============================================
-- Author:		Zhe Zhang
-- Description:	External User Log
-- =============================================


CREATE PROCEDURE [admin].[Log_External_User]
    -- @User_ID NVARCHAR(255),
    @User_Token NVARCHAR(MAX),
	@IP_Adress NVARCHAR(MAX),
    @IP_Location NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- Insert statement for procedure here
    INSERT INTO [admin].[External_User]
    (
        -- [User_ID],
        [User_Token],
        [Created_Date],
		[IP_Adress], 
		[IP_Location], 
		[Deleted]
    )
    VALUES
    (
        -- @User_ID,                     -- User_ID - nvarchar(255)
        @User_Token,                  -- User_Token - nvarchar(255)
        GETDATE(),                    -- Created_Date - datetime (now)
		@IP_Adress, 
		@IP_Location, 
		0
    )
END
GO
/****** Object:  StoredProcedure [admin].[SaveRefreshToken] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alex
-- Create date: 2023-04-24
-- Description:	Saves refresh token to db
-- =============================================
CREATE PROCEDURE [admin].[SaveRefreshToken]
    @username NVARCHAR(100),
    @refreshToken NVARCHAR(100),
    @refreshTokenExpiryDate NVARCHAR(100),
    @isClient BIT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY

        IF NOT EXISTS
            (
                SELECT 'x'
                FROM admin.Application_Users WITH (NOLOCK)
                WHERE UserName = @username AND ISNULL(Is_Active, 1)=1 AND ISNULL(Delete_Ind, 'N')='N'
                UNION
                SELECT 'x'
                FROM admin.Application_Clients WITH(NOLOCK)
                WHERE Client_ID=@username AND ISNULL(Deleted, 0)=0
            )
            BEGIN
                RAISERROR(15600, -1, -1, 'Error:Username/ClientID does not exist.');

                RETURN;
            END;

    END TRY
    BEGIN CATCH

        DECLARE @ErrorMessage NVARCHAR(4000);
        DECLARE @ErrorSeverity INT;
        DECLARE @ErrorState INT;

        SELECT @ErrorMessage = ERROR_MESSAGE(),
               @ErrorSeverity = ERROR_SEVERITY(),
               @ErrorState = ERROR_STATE();

        -- Use RAISERROR inside the CATCH block to return error  
        -- information about the original error that caused  
        -- execution to jump to the CATCH block.  
        RAISERROR(   @ErrorMessage,  -- Message text.  
            @ErrorSeverity, -- Severity.  
            @ErrorState     -- State.  
            );
    END CATCH;

    IF @isClient=1
        UPDATE admin.Application_Clients SET
                                             Refresh_Token=@refreshToken,
                                             Refresh_Token_Expiry_Time=@refreshTokenExpiryDate
        WHERE ISNULL(Deleted, 0) = 0
          AND Client_ID = @username;
    ELSE
        UPDATE admin.Application_Users SET
                                           Refresh_Token=@refreshToken,
                                           Refresh_Token_Expiry_Time=@refreshTokenExpiryDate
        WHERE ISNULL(Delete_Ind, 'N') = 'N'
          AND ISNULL(Is_Active,1)=1
          AND UserName = @username;
END
GO
/****** Object:  StoredProcedure [admin].[UpdateApplicationRoleFunctionPairs] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		<Andres Ibarra>
-- Create date: <05/12/2020>
-- Description:	<Update Application Role Function Pairs>
-- =============================================
CREATE PROCEDURE [admin].[UpdateApplicationRoleFunctionPairs]
    -- Add the parameters for the stored procedure here
	@User VARCHAR(100),
    @Role_ID INT,
    @Application_Functions_To_Be_Added_List VARCHAR(100),
    @Application_Functions_To_Be_Removed_List VARCHAR(100)
AS
BEGIN
    -- SET NOCOUNT ON added to prevent extra result sets from
    -- interfering with SELECT statements.
    SET NOCOUNT ON;

    BEGIN TRAN T1;
    BEGIN TRY

        DECLARE @data_details VARCHAR(MAX);

        SET @data_details
            = ':Role_ID:' + CAST(@Role_ID AS VARCHAR) + ':Application_Functions_To_Be_Added_List:'
                    + @Application_Functions_To_Be_Added_List + ':Application_Functions_To_Be_Removed_List:'
                    + @Application_Functions_To_Be_Removed_List;

        EXEC api.SaveUserLog
             @User = @User,        -- varchar(255)
             @Activity_Source_IP = NULL,              -- varchar(50)
             @Activity_Server_IP = NULL,              -- varchar(50)
             @Activity_Browser_Details = NULL,        -- varchar(500)
             @Activity_Type = 'EDIT_ROLE_MANAGEMENT', -- varchar(50)
             @Activity_Details = @data_details;       -- varchar(max)

        UPDATE [admin].[Application_Role_Functions]
        SET Deleted = 1
        WHERE [admin].[Application_Role_Functions].Role_ID = @Role_ID
          AND Function_ID IN
              (
                  SELECT CAST(value AS INT)
                  FROM STRING_SPLIT(@Application_Functions_To_Be_Removed_List, ',')
              );


        IF EXISTS
            (
                SELECT value
                FROM STRING_SPLIT(@Application_Functions_To_Be_Added_List, ',') WHERE value <> 0
            )
            BEGIN
                INSERT INTO admin.Application_Role_Functions
                (
                    Role_ID,
                    Function_ID,
                    Created_By,
                    Created_Date
                )
                SELECT @Role_ID,
                       value,
                       @User,
                       GETDATE()
                FROM STRING_SPLIT(@Application_Functions_To_Be_Added_List, ',');

            END;



        COMMIT TRAN T1;
    END TRY
    BEGIN CATCH
        ROLLBACK TRAN T1;

        DECLARE @ErrorMessage NVARCHAR(4000);
        DECLARE @ErrorSeverity INT;
        DECLARE @ErrorState INT;

        SELECT @ErrorMessage = ERROR_MESSAGE(),
               @ErrorSeverity = ERROR_SEVERITY(),
               @ErrorState = ERROR_STATE();

        -- Use RAISERROR inside the CATCH block to return error  
        -- information about the original error that caused  
        -- execution to jump to the CATCH block.  
        RAISERROR(   @ErrorMessage,  -- Message text.  
            @ErrorSeverity, -- Severity.  
            @ErrorState     -- State.  
            );
    END CATCH;

END;
GO
/****** Object:  StoredProcedure [admin].[UpdateClient] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 2022-04-22
-- Description:	Updates Client Definition
-- =============================================
CREATE PROCEDURE [admin].[UpdateClient] 
	@User VARCHAR(100),
	@ID INT,
	@Client_Name NVARCHAR(50),
	@Client_ID NVARCHAR(50),
	@Activity_Notes NVARCHAR(100),
	@Deleted BIT
AS
BEGIN
	SET NOCOUNT ON;

UPDATE admin.Application_Clients SET
                                   Client_Name=ISNULL(@Client_Name, Client_Name),
                                   Client_ID=ISNULL(@Client_ID, Client_ID),
                                   Updated_By=ISNULL(@User, Updated_By),
                                   Activity_Notes=ISNULL(@Activity_Notes, Activity_Notes),
                                   Deleted=ISNULL(@Deleted, Deleted)
WHERE ID=@ID
END
GO
/****** Object:  StoredProcedure [api].[AddEndpoint] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 2021-10-13
-- Description:	Adds Endpoint Definition
-- =============================================
CREATE PROCEDURE [api].[AddEndpoint]
	@User VARCHAR(100),
    @Endpoint_Name NVARCHAR(100),
    @Request_Type NVARCHAR(10),
    @Stored_Procedure NVARCHAR(100),
    @Connection_Name NVARCHAR(50),
    @Result_Type NVARCHAR(100),
    @DataSet_Table_Names NVARCHAR(200),
	@UseParam0UserPass BIT,
    @Description NVARCHAR(200),
    @Activity_Notes NVARCHAR(200),
	@Allow_Anonymous BIT,
	@Call_Type NVARCHAR(50),
	@Credential_Source NVARCHAR(50),
	@Credential_Key NVARCHAR(50),
	@URL_Base NVARCHAR(50),
	@URL NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO api.Endpoints
    (
        Endpoint_Name,
		Call_Type,
		Credential_Source,
		Credential_Key,
        Request_Type,
		URL_Base,
		[URL],
        Stored_Procedure,
        Connection_Name,
        Result_Type,
        DataSet_Table_Names,
		UseParam0UserPass,
        Description,
        Created_Date,
        Created_By,
        Updated_Date,
        Updated_By,
        Activity_Notes,
        Deleted,
		Allow_Anonymous
    )
    OUTPUT Inserted.Endpoint_ID
    VALUES
        (   
			@Endpoint_Name,       -- Endpoint_Name - nvarchar(100)
			@Call_Type,			-- Call_Type - nvarchar(50)
			@Credential_Source,  -- Credential_Source nvarchar(50)
			@Credential_Key,  -- Credential_Key nvarchar(50)
            @Request_Type,       -- Request_Type - nvarchar(10)
			@URL_Base,			-- URL_Base - nvarchar(50)
			@URL,				-- URL - nvarchar(500)
            @Stored_Procedure,       -- Stored_Procedure - nvarchar(100)
            @Connection_Name,       -- Connection_Name - nvarchar(50)
            @Result_Type,       -- Result_Type - nvarchar(100)
            @DataSet_Table_Names,       -- DataSet_Table_Names - nvarchar(200)
			@UseParam0UserPass,
            @Description,       -- Description - nvarchar(200)
            GETDATE(), -- Created_Date - datetime
            @User,       -- Created_By - nvarchar(50)
            NULL, -- Updated_Date - datetime
            NULL,       -- Updated_By - nvarchar(50)
            @Activity_Notes,       -- Activity_Notes - nvarchar(200)
            NULL,      -- Deleted - bit
			@Allow_Anonymous -- Allow_Anonymous - bit
        )
END
GO
/****** Object:  StoredProcedure [api].[AddParameter] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 2021-10-13
-- Description:	Updates Endpoint Parameter Definition
-- =============================================
CREATE PROCEDURE [api].[AddParameter] 
	@User VARCHAR(100),
	@Endpoint_ID INT,
	@Parameter_Name NVARCHAR(100),
	@Parameter_Type NVARCHAR(50),
	@Parameter_Order INT,
	@Null_Value NVARCHAR(20),
	@Is_Optional BIT,
	@Description NVARCHAR(200),
	@Activity_Notes NVARCHAR(200),
	@Parameter_Destination NVARCHAR(50),
	@Is_User_Pass BIT,
	@System_Provided BIT,
	@Template NVARCHAR(200),
	@Delimiter NVARCHAR(10)
AS
BEGIN
	SET NOCOUNT ON;

INSERT INTO api.EndpointParameters
(
    Endpoint_ID,
    Parameter_Name,
    Parameter_Type,
	Parameter_Destination,
    Parameter_Order,
    Null_Value,
    Is_Optional,
	Is_User_Pass,
	System_Provided,
	Template,
	Delimiter,
    Description,
    Created_Date,
    Created_By,
    Updated_Date,
    Updated_By,
    Activity_Notes,
    Deleted
)
    OUTPUT Inserted.Parameter_ID
VALUES
    (   
		@Endpoint_ID,         -- Endpoint_ID - int
		@Parameter_Name,       -- Parameter_Name - nvarchar(100)
		@Parameter_Type,       -- Parameter_Type - nvarchar(50)
		@Parameter_Destination, -- Parameter_Destination - nvarchar(50)
		@Parameter_Order,         -- Parameter_Order - int
		@Null_Value,       -- Null_Value - nvarchar(100)
		@Is_Optional,      -- Is_Optional - bit
		@Is_User_Pass,      -- Is_User_Pass - bit
		@System_Provided,      -- System_Provided - bit
		@Template,			-- Template - nvarchar(200)
		@Delimiter,			-- Delimiter - nvarchar(10)
		@Description,       -- Description - nvarchar(200)
		GETDATE(), -- Created_Date - datetime
		@User,       -- Created_By - nvarchar(50)
		NULL, -- Updated_Date - datetime
		Null,       -- Updated_By - nvarchar(50)
		@Activity_Notes,       -- Activity_Notes - nvarchar(200)
		NULL       -- Deleted - bit
    )


END
GO
/****** Object:  StoredProcedure [api].[AddSecurityRole] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 2021-10-13
-- Description:	Updates Endpoint Security Definition
-- =============================================
CREATE PROCEDURE [api].[AddSecurityRole]
	@User VARCHAR(100),
    @Endpoint_ID INT,
    @Role_ID INT,
    @Activity_Notes NVARCHAR(200),
    @Has_Access BIT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO api.EndpointSecurity
    (
        Endpoint_ID,
        Role_ID,
        Created_Date,
        Created_By,
        Updated_Date,
        Updated_By,
        Activity_Notes,
        [Has_Access],
        Deleted
    )
    OUTPUT Inserted.Security_ID
    VALUES
        (   @Endpoint_ID,         -- Endpoint_ID - int
            @Role_ID,         -- Role_ID - int
            GETDATE(), -- Created_Date - datetime
            @User,       -- Created_By - nvarchar(50)
            NULL, -- Updated_Date - datetime
            NULL,       -- Updated_By - nvarchar(50)
            @Activity_Notes,       -- Activity_Notes - nvarchar(200)
            @Has_Access,      -- Has_Access - bit
            NULL       -- Deleted - bit
        )

END
GO
/****** Object:  StoredProcedure [api].[GetEndpoints] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Alexander Hoffmann
-- Create date: 2021-10-06
-- Description:	Grabs description of endpoints for CSTAPI
-- =============================================
CREATE PROCEDURE [api].[GetEndpoints]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        e.Endpoint_ID,
        e.Endpoint_Name,
		e.Call_Type,
		e.Credential_Source,
		e.Credential_Key,
        e.Request_Type,
		e.URL_Base,
		e.URL,
        e.Stored_Procedure,
		e.Connection_Name,
        e.Result_Type,
        ISNULL(e.Allow_Anonymous, 0) AS Allow_Anonymous,
        e.DataSet_Table_Names,
		ISNULL(e.UseParam0UserPass, 0) AS UseParam0UserPass,
        e.Description
    FROM api.Endpoints e WITH(NOLOCK)
    WHERE ISNULL(e.Deleted,0)=0

    SELECT
        e.Endpoint_ID,
        ep.Parameter_ID,
        ep.Parameter_Name,
        ep.Parameter_Type,
		ep.Parameter_Destination,
        ep.Parameter_Order,
        ep.Null_Value,
        ISNULL(ep.Is_Optional, 0) AS Is_Optional,
		ISNULL(ep.System_Provided, 0) AS System_Provided,
		ISNULL(ep.Is_User_Pass, 0) AS Is_User_Pass,
		ep.Template,
		ep.Delimiter,
        ep.Description AS Parameter_Description

    FROM api.Endpoints e WITH(NOLOCK)
             LEFT JOIN api.EndpointParameters ep WITH(NOLOCK) ON
                ep.Endpoint_ID = e.Endpoint_ID
            AND ISNULL(ep.Deleted,0)=0
    WHERE ISNULL(e.Deleted,0)=0 AND ep.Parameter_ID IS NOT NULL
    ORDER BY e.Endpoint_ID, ep.Parameter_Order

    SELECT
        e.Endpoint_ID,
        es.Security_ID,
        es.Role_ID,
        ar.Role_Name
    FROM api.Endpoints e WITH(NOLOCK)
             LEFT JOIN api.EndpointSecurity es WITH(NOLOCK)
                       ON es.Endpoint_ID = e.Endpoint_ID AND es.Has_Access=1 AND ISNULL(es.Deleted,0)=0
             LEFT JOIN admin.Application_Roles ar WITH(NOLOCK)
                       ON ar.Role_ID = es.Role_ID
    WHERE ISNULL(e.Deleted,0)=0

    SELECT
        SUBSTRING(Endpoint_Name, 0, CHARINDEX('/', Endpoint_Name)) AS Controller_Name,
        COUNT(*) AS Num_Endpoints
    FROM api.Endpoints WITH(NOLOCK)
    WHERE ISNULL(Deleted, 0)=0
    GROUP BY SUBSTRING(Endpoint_Name, 0, CHARINDEX('/', Endpoint_Name))
END
GO
/****** Object:  StoredProcedure [api].[Log_Login] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [api].[Log_Login]
@User_Name NVARCHAR (255), @Login_Success BIT, @Source NVARCHAR (50), @Patient_ID NVARCHAR (50), @Patient_MRN NVARCHAR (50), @MPOG_Case_ID NVARCHAR (50), @Surgical_Log_ID NVARCHAR (50), @Patient_First_Name NVARCHAR (100), @Patient_Last_Name NVARCHAR (100)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT  INTO api.UserLogin_Log (User_Name, MPOG_Case_ID, Surgical_Log_ID, Patient_ID, Patient_MRN, Patient_First_Name, Patient_Last_Name, Login_DateTime, Login_Date, Login_Month, Login_Year, Login_Success, Source)
    VALUES                        (@User_Name, @MPOG_Case_ID, @Surgical_Log_ID, @Patient_ID, @Patient_MRN, @Patient_First_Name, @Patient_Last_Name, GETDATE(), GETDATE(), MONTH(GETDATE()), YEAR(GETDATE()), @Login_Success, @Source);
END

GO
/****** Object:  StoredProcedure [api].[LogGraph] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [api].[LogGraph]
@provider NVARCHAR (50), @age FLOAT, @age_unit NVARCHAR (50), @weight FLOAT, @weight_unit NVARCHAR (50), @height FLOAT, @height_unit NVARCHAR (50), @sex CHAR (1), @med_tables NVARCHAR (MAX), @med_data NVARCHAR (MAX), @case_id NVARCHAR (50), @reference_time NVARCHAR (50), @max_time INT, @failure_reason NVARCHAR (150)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 'x'
                   FROM   api.Graph_Logs
                   WHERE  provider = @provider
                          AND ((case_id IS NULL
                                AND @case_id IS NULL)
                               OR case_id = @case_id)
                          AND age_unit = @age_unit
                          AND weight_unit = @weight_unit
                          AND height_unit = @height_unit
                          AND age = @age
                          AND weight = @weight
                          AND height = @height
                          AND sex = @sex
                          AND reference_time = @reference_time
                          AND max_time = @max_time
                          AND med_tables = @med_tables
                          AND ((failure_reason IS NULL
                                AND @failure_reason IS NULL)
                               OR failure_reason = @failure_reason))
        BEGIN
            INSERT  INTO api.Graph_Logs (provider, timestamp, age, age_unit, weight, weight_unit, height, height_unit, sex, med_tables, med_data, case_id, reference_time, max_time, failure_reason)
            VALUES                     (@provider, GETDATE(), @age, @age_unit, @weight, @weight_unit, @height, @height_unit, @sex, @med_tables, @med_data, @case_id, @reference_time, @max_time, @failure_reason);
        END
END

GO
/****** Object:  StoredProcedure [api].[SaveClientLog] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [api].[SaveClientLog]
	@User VARCHAR(255),
	@Activity_Client VARCHAR(255),
    @Activity_Source_IP VARCHAR(50),
    @Activity_Server_IP VARCHAR(50),
    @Activity_Browser_Details VARCHAR(500),
    @Activity_Type VARCHAR(50),
    @Activity_Details VARCHAR(MAX)
AS
BEGIN
INSERT INTO api.User_Logs
(
    Activity_Client,
    Activity_UserName,
    Activity_Date,
    Activity_Source_IP,
    Activity_Server_IP,
    Activity_Browser_Details,
    Activity_Type,
    Activity_Details
)
VALUES
    (
        @Activity_Client,
        @User,        -- Activity_UserName - varchar(255)
        GETDATE(),                 -- Activity_Date - datetime
        @Activity_Source_IP,       -- Activity_Source_IP - varchar(50)
        @Activity_Server_IP,       -- Activity_Server_IP - varchar(50)
        @Activity_Browser_Details, -- Activity_Browser_Details - varchar(500)
        @Activity_Type,            -- Activity_Type - varchar(50)
        @Activity_Details          -- Activity_Details - varchar(max)
    );


END;
GO
/****** Object:  StoredProcedure [api].[SaveErrorLog] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [api].[SaveErrorLog]
	@User VARCHAR(100),
    @ERROR_SOURCE VARCHAR(100),
    @ERROR_DESCRIPTION VARCHAR(MAX),
    @OTHER_INFO VARCHAR(255),
    @IP_ADDRESS VARCHAR(255)
AS
BEGIN
INSERT INTO api.Error_Logs
(
    ERROR_SOURCE,
    ERROR_DESCRIPTION,
    CREATED_BY,
    CREATED_DATE,
    OTHER_INFO,
    IP_ADDRESS
)
VALUES
    (   @ERROR_SOURCE,        -- ERROR_SOURCE - varchar(100)
        @ERROR_DESCRIPTION,        -- ERROR_DESCRIPTION - varchar(max)
        @User,        -- CREATED_BY - varchar(100)
        GETDATE(), -- CREATED_DATE - datetime
        @OTHER_INFO,        -- OTHER_INFO - varchar(255)
        @IP_ADDRESS         -- IP_ADDRESS - varchar(255)
    )

END;
GO
/****** Object:  StoredProcedure [api].[SaveUserLog] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [api].[SaveUserLog]
	@User VARCHAR(255),
    @Activity_Source_IP VARCHAR(50),
    @Activity_Server_IP VARCHAR(50),
    @Activity_Browser_Details VARCHAR(500),
    @Activity_Type VARCHAR(50),
    @Activity_Details VARCHAR(MAX)
AS
BEGIN
INSERT INTO api.User_Logs
(
    Activity_Client,
    Activity_UserName,
    Activity_Date,
    Activity_Source_IP,
    Activity_Server_IP,
    Activity_Browser_Details,
    Activity_Type,
    Activity_Details
)
VALUES
    (
        NULL,
        @User,        -- Activity_UserName - varchar(255)
        GETDATE(),                 -- Activity_Date - datetime
        @Activity_Source_IP,       -- Activity_Source_IP - varchar(50)
        @Activity_Server_IP,       -- Activity_Server_IP - varchar(50)
        @Activity_Browser_Details, -- Activity_Browser_Details - varchar(500)
        @Activity_Type,            -- Activity_Type - varchar(50)
        @Activity_Details          -- Activity_Details - varchar(max)
    );

			
END;
GO
/****** Object:  StoredProcedure [api].[UpdateEndpoint] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 2021-10-13
-- Description:	Updates Endpoint Definition
-- =============================================
CREATE PROCEDURE [api].[UpdateEndpoint]
	@User VARCHAR(100),
    @Endpoint_ID INT,
    @Endpoint_Name NVARCHAR(100),
    @Request_Type NVARCHAR(10),
    @Stored_Procedure NVARCHAR(100),
    @Connection_Name NVARCHAR(50),
    @Result_Type NVARCHAR(100),
    @DataSet_Table_Names NVARCHAR(200),
	@UseParam0UserPass BIT,
    @Description NVARCHAR(200),
    @Activity_Notes NVARCHAR(200),
    @Deleted BIT,
	@Allow_Anonymous BIT,
	@Call_Type NVARCHAR(50),
	@Credential_Source NVARCHAR(50),
	@Credential_Key NVARCHAR(50),
	@URL_Base NVARCHAR(50),
	@URL NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE api.Endpoints SET
                             Endpoint_Name=ISNULL(@Endpoint_Name, Endpoint_Name),
							 Call_Type=ISNULL(@Call_Type, Call_Type),
							 Credential_Source=ISNULL(@Credential_Source, Credential_Source),
							 Credential_Key=ISNULL(@Credential_Key, Credential_Key),
                             Request_Type=ISNULL(@Request_Type, Request_Type),
							 URL_Base=ISNULL(@URL_Base, URL_Base),
							 URL=ISNULL(@URL, [URL]),
                             Stored_Procedure=ISNULL(@Stored_Procedure, Stored_Procedure),
                             Connection_Name=ISNULL(@Connection_Name, Connection_Name),
                             Result_Type=ISNULL(@Result_Type, Result_Type),
							 Allow_Anonymous=ISNULL(@Allow_Anonymous, Allow_Anonymous),
                             DataSet_Table_Names=ISNULL(@DataSet_Table_Names, DataSet_Table_Names),
                             [Description]=ISNULL(@Description, [Description]),
                             Updated_Date=GETDATE(),
                             Updated_By=@User,
                             Activity_Notes=@Activity_Notes,
                             Deleted=ISNULL(@Deleted, Deleted),
							 UseParam0UserPass=ISNULL(@UseParam0UserPass, UseParam0UserPass)
							 
    WHERE Endpoint_ID=@Endpoint_ID
END
GO
/****** Object:  StoredProcedure [api].[UpdateParameter] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 2021-10-13
-- Description:	Updates Endpoint Parameter Definition
-- =============================================
CREATE PROCEDURE [api].[UpdateParameter] 
	@User VARCHAR(100),
	@Parameter_ID INT,
	@Endpoint_ID INT,
	@Parameter_Name NVARCHAR(100),
	@Parameter_Type NVARCHAR(50),
	@Null_Value NVARCHAR(20),
	@Parameter_Order INT,
	@Is_Optional BIT,
	@Description NVARCHAR(200),
	@Activity_Notes NVARCHAR(200),
	@Deleted BIT,
	@Parameter_Destination NVARCHAR(50),
	@Is_User_Pass BIT,
	@System_Provided BIT,
	@Template NVARCHAR(200),
	@Delimiter NVARCHAR(10)
AS
BEGIN
	SET NOCOUNT ON;

UPDATE api.EndpointParameters SET
    Endpoint_ID=ISNULL(@Endpoint_ID, Endpoint_ID),
    Parameter_Name=ISNULL(@Parameter_Name, Parameter_Name),
    Parameter_Type=ISNULL(@Parameter_Type, Parameter_Type),
	Parameter_Destination=ISNULL(@Parameter_Destination, Parameter_Destination),
    Parameter_Order=ISNULL(@Parameter_Order, Parameter_Order),
    Null_Value=ISNULL(@Null_Value, Null_Value),
    Is_Optional=ISNULL(@Is_Optional, Is_Optional),
	Is_User_Pass=ISNULL(@Is_User_Pass, Is_User_Pass),
	System_Provided=ISNULL(@System_Provided, System_Provided),
	Template=ISNULL(@Template, Template),
	Delimiter=ISNULL(@Delimiter, Delimiter),
    [Description]=ISNULL(@Description, Description),
    Updated_Date=GETDATE(),
    Updated_By=@User,
    Activity_Notes=@Activity_Notes,
    Deleted=ISNULL(@Deleted, Deleted)
WHERE Parameter_ID=@Parameter_ID
END
GO
/****** Object:  StoredProcedure [api].[UpdateSecurityRole] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 2021-10-13
-- Description:	Updates Endpoint Security Definition
-- =============================================
CREATE PROCEDURE [api].[UpdateSecurityRole]
	@User VARCHAR(100),
    @Endpoint_ID INT,
    @Role_ID INT,
    @Activity_Notes NVARCHAR(200),
    @Has_Access BIT,
    @Deleted BIT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE api.EndpointSecurity SET
                                    Endpoint_ID=ISNULL(@Endpoint_ID, Endpoint_ID),
                                    Role_ID=ISNULL(@Role_ID, Role_ID),
                                    Updated_Date=GETDATE(),
                                    Updated_By=@User,
                                    Activity_Notes=ISNULL(@Activity_Notes, Activity_Notes),
                                    [Has_Access]=ISNULL(@Has_Access, [Has_Access]),
                                    Deleted=ISNULL(@Deleted, Deleted)
    WHERE Endpoint_ID=@Endpoint_ID AND Role_ID=@Role_ID
END
GO
/****** Object:  StoredProcedure [core].[GetCaseFromMPOG] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- Reads MPOG data from a linked server, so it is only for MPOG members. Set @linked_server to the name of your
-- MPOG linked server. The procedure is created only if that linked server exists, because SQL Server will not create
-- a procedure that names an unknown linked server (error 7202). It also needs read access to the MPOG_MAS_Epic
-- tables used in the queries below. The default is the linked server of the site that wrote this procedure.
DECLARE @linked_server SYSNAME = N'MPOG-LOCAL.MED.UMICH.EDU';
IF EXISTS (SELECT 1 FROM sys.servers WHERE name = @linked_server)
BEGIN
    DECLARE @sql NVARCHAR(MAX) = N'CREATE PROCEDURE [core].[GetCaseFromMPOG]
@User NVARCHAR (50), @MPOG_CASE_ID NVARCHAR (50)
AS
BEGIN
    DECLARE @Today AS DATE = GETDATE();
    IF NOT EXISTS (SELECT ''x''
                   FROM   api.UserLogin_Log AS ull
                   WHERE  ull.Login_Date = @Today
                          AND @MPOG_CASE_ID = ull.MPOG_Case_ID
                          AND @User = ull.User_Name)
        BEGIN
            INSERT  INTO api.UserLogin_Log (User_Name, MPOG_Case_ID, Surgical_Log_ID, Patient_ID, Patient_MRN, Patient_First_Name, Patient_Last_Name, Login_DateTime, Login_Date, Login_Month, Login_Year, Login_Success, Source)
            VALUES                        (@User, @MPOG_CASE_ID, NULL, NULL, NULL, NULL, NULL, GETDATE(), GETDATE(), MONTH(GETDATE()), YEAR(GETDATE()), 1, ''MPOG'');
        END
    SET NOCOUNT ON;
    WITH     AnesthesiaStart
    AS       (SELECT   n.MPOG_Case_ID,
                       MIN(n.AIMS_Note_Observation_DT) AS Value
              FROM     {LINKED_SERVER}.MPOG_MAS_Epic.dbo.AIMS_IntraopNotes AS n
              WHERE    n.MPOG_Note_Concept_ID = 50002
                       AND n.MPOG_Deleted_CD = 0
                       AND n.AIMS_Note_Observation_DT >= ''1-1-1995''
                       AND n.AIMS_Note_Observation_DT < GETDATE()
                       AND n.MPOG_Case_ID = @MPOG_CASE_ID
              GROUP BY n.MPOG_Case_ID),
             AnesthesiaEnd
    AS       (SELECT   n.MPOG_Case_ID,
                       MIN(n.AIMS_Note_Observation_DT) AS Value
              FROM     {LINKED_SERVER}.MPOG_MAS_Epic.dbo.AIMS_IntraopNotes AS n
              WHERE    n.MPOG_Note_Concept_ID = 50009
                       AND n.MPOG_Deleted_CD = 0
                       AND n.AIMS_Note_Observation_DT >= ''1-1-1995''
                       AND n.AIMS_Note_Observation_DT < GETDATE()
                       AND n.MPOG_Case_ID = @MPOG_CASE_ID
              GROUP BY n.MPOG_Case_ID),
             Height
    AS       (SELECT d.MPOG_Case_ID,
                     d.CM_Height AS Height
              FROM   (SELECT Preop.MPOG_Case_ID,
                             v.CM_Height,
                             ROW_NUMBER() OVER (PARTITION BY Preop.MPOG_Case_ID ORDER BY CASE WHEN DATEDIFF(MINUTE, DATEADD(HOUR, 12, AnesEnd.Value), Preop.AIMS_User_Entered_TS) < 0 THEN Preop.AIMS_User_Entered_TS ELSE NULL END DESC, CASE MPOG_Preop_Concept_ID WHEN 70257 THEN 1 WHEN 70258 THEN 2 END ASC, v.CM_Height DESC) AS rn
                      FROM   {LINKED_SERVER}.[MPOG_MAS_Epic].dbo.AIMS_Preop AS Preop
                             INNER JOIN
                             AnesthesiaEnd AS AnesEnd
                             ON Preop.MPOG_Case_ID = AnesEnd.MPOG_Case_ID CROSS APPLY (VALUES (AIMS_Value_Numeric * CASE WHEN MPOG_Preop_Concept_ID = 70258 THEN 2.5441 ELSE 1 END)) AS v(CM_Height)
                      WHERE  Preop.MPOG_Preop_Concept_ID IN (70257, 70258)
                             AND Preop.MPOG_Deleted_CD = 0
                             AND v.CM_Height BETWEEN 12.7 AND 243.85) AS d
              WHERE  rn = 1),
             PTWeight
    AS       (SELECT d.MPOG_Case_ID,
                     d.KG_Weight AS Weight
              FROM   (SELECT Preop.MPOG_Case_ID,
                             v.KG_Weight,
                             ROW_NUMBER() OVER (PARTITION BY Preop.MPOG_Case_ID ORDER BY CASE WHEN DATEDIFF(MINUTE, DATEADD(HOUR, 12, AnesEnd.Value), Preop.AIMS_User_Entered_TS) < 0 THEN Preop.AIMS_User_Entered_TS ELSE NULL END DESC, CASE MPOG_Preop_Concept_ID WHEN 70264 THEN 1 WHEN 70265 THEN 2 WHEN 70065 THEN 3 END ASC, v.KG_Weight DESC) AS rn
                      FROM   {LINKED_SERVER}.MPOG_MAS_Epic.dbo.AIMS_Preop AS Preop
                             INNER JOIN
                             AnesthesiaEnd AS AnesEnd
                             ON Preop.MPOG_Case_ID = AnesEnd.MPOG_Case_ID CROSS APPLY (VALUES (AIMS_Value_Numeric * CASE WHEN MPOG_Preop_Concept_ID = 70265 THEN 0.453592 WHEN MPOG_Preop_Concept_ID = 70065 THEN 0.0283495 ELSE 1 END)) AS v(KG_Weight)
                      WHERE  Preop.MPOG_Preop_Concept_ID IN (70264, 70265, 70065)
                             AND Preop.MPOG_Deleted_CD = 0
                             AND v.KG_Weight BETWEEN 0.5 AND 250) AS d
              WHERE  rn = 1)
    SELECT   ic.mpog_case_id,
             ans.value AS anesStart,
             ane.value AS anesEnd,
             im.AIMS_Med_Name AS medication,
             im.aims_med_dose,
             im.AIMS_Med_UOM,
             im.aims_med_route,
             im.aims_dose_start_dt,
             im.aims_dose_end_dt,
             p.aims_reg_num,
             p.aims_sex,
             ic.aims_patient_age_years,
             ic.aims_procedure_room_name,
             ic.aims_actual_procedure_text,
             h.Height AS height_cm,
             w.Weight AS weight_kg
    FROM     {LINKED_SERVER}.[MPOG_MAS_Epic].[dbo].[AIMS_IntraopCaseInfo] AS ic WITH (NOLOCK)
             INNER JOIN
             {LINKED_SERVER}.[MPOG_MAS_Epic].[dbo].[AIMS_IntraopMedications] AS im WITH (NOLOCK)
             ON ic.mpog_case_id = im.mpog_case_id
             INNER JOIN
             {LINKED_SERVER}.[MPOG_MAS_Epic].[dbo].[AIMS_Patients] AS p WITH (NOLOCK)
             ON ic.MPOG_Patient_ID = p.MPOG_Patient_ID
             LEFT OUTER JOIN
             AnesthesiaStart AS ans WITH (NOLOCK)
             ON im.mpog_case_id = ans.mpog_case_id
             LEFT OUTER JOIN
             AnesthesiaEnd AS ane WITH (NOLOCK)
             ON im.mpog_case_id = ane.mpog_case_id
             LEFT OUTER JOIN
             Height AS h WITH (NOLOCK)
             ON im.mpog_case_id = h.mpog_case_id
             LEFT OUTER JOIN
             PTWeight AS w WITH (NOLOCK)
             ON im.mpog_case_id = w.mpog_case_id
    WHERE    im.aims_dose_start_dt BETWEEN ans.value AND ane.value
             AND ic.MPOG_Case_ID = @MPOG_CASE_ID
    ORDER BY ic.mpog_case_id, im.aims_dose_start_dt;
END';
    SET @sql = REPLACE(@sql, N'{LINKED_SERVER}', QUOTENAME(@linked_server));
    EXEC (@sql);
END
ELSE
    PRINT N'Skipped core.GetCaseFromMPOG: linked server ' + @linked_server + N' not found. Only MPOG members need it.';
GO
/****** Object:  StoredProcedure [core].[GetLists] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [core].[GetLists]
	@List NVARCHAR(100) = NULL
AS
BEGIN
	SET NOCOUNT ON;

    SELECT 
		lg.List_Group_ID,
        lg.List_Group_Name,
        lv.List_Value,
        lv.List_Order
	FROM core.List_Groups lg WITH(NOLOCK)
	JOIN core.List_Values lv WITH(NOLOCK)
		ON lv.List_Group_ID = lg.List_Group_ID AND ISNULL(lv.Deleted, 0)=0 AND ISNULL(lg.Include_In_All_Lists_SP,1)=1
	WHERE ISNULL(lg.Deleted,0)=0
	ORDER BY lv.List_Group_ID, lv.List_Order ASC
END
GO
/****** Object:  StoredProcedure [core].[GetMedicationModels] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 03-04-2024
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [core].[GetMedicationModels]
	@weight DECIMAL(10,4),
	@age DECIMAL(10,4),
	@sex CHAR(1),
	@height DECIMAL(10,4)
AS
BEGIN
	SET NOCOUNT ON;

	CREATE TABLE #ModelParameters
    (
        Model_ID INT,
		[name] NVARCHAR(100),
        Vc FLOAT,
		k01 FLOAT,
        k10 FLOAT,
        k12 FLOAT,
        k13 FLOAT,
        k21 FLOAT,
        k31 FLOAT,
        ke0 FLOAT,
		error NVARCHAR(500)
    );

	-- Cursor to iterate through each medication model
    DECLARE modelCursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT 
			mm.Model_ID,
			mm.Stored_Procedure, 
			mm.useWeightAdjusted,
			mm.useABWCorrection,
			mm.useLBMCorrection
        FROM core.Medication_Models mm;

	OPEN modelCursor;
    
	DECLARE @Model_ID INT;
    DECLARE @Stored_Procedure NVARCHAR(100);
	DECLARE @Procedure_ID INT;
	DECLARE @useWeightAdjusted BIT;
	DECLARE @useABWCorrection BIT;
	DECLARE @useLBMCorrection BIT;
    DECLARE @SQLCommand NVARCHAR(MAX);
	DECLARE @sexOrN CHAR(1) = ISNULL(@sex, 'N');

	FETCH NEXT FROM modelCursor INTO @Model_ID, @Stored_Procedure, @useWeightAdjusted, @useABWCorrection, @useLBMCorrection
	WHILE @@FETCH_STATUS = 0
    BEGIN
		SET @Procedure_ID = OBJECT_ID(@Stored_Procedure, 'P');

		IF @Stored_Procedure IS NOT NULL AND @Procedure_ID IS NULL
			INSERT INTO #ModelParameters (Model_ID, name, Vc, k01, k10, k12, k13, k21, k31, ke0, error)
			VALUES (@Model_ID, NULL, -1, -1, -1, -1, -1, -1, -1, -1, 'Stored procedure ' + @Stored_Procedure + ' not found');
		ELSE IF @Procedure_ID IS NOT NULL
		BEGIN
			-- The procedure name comes from sys.objects, so the column value cannot inject SQL.
			-- The correction flags are passed only to the models that use them.
			SET @SQLCommand = N'INSERT INTO #ModelParameters (Model_ID, name, Vc, k01, k10, k12, k13, k21, k31, ke0, error)
                            EXEC ' + QUOTENAME(OBJECT_SCHEMA_NAME(@Procedure_ID)) + N'.' + QUOTENAME(OBJECT_NAME(@Procedure_ID)) +
								N' @Model_ID=@Model_ID, @weight=@weight, @age=@age, @height=@height, @sex=@sex' +
								CASE WHEN @useWeightAdjusted=1 THEN N', @useWeightAdjusted=1' ELSE N'' END +
								CASE WHEN @useABWCorrection=1 THEN N', @useABWCorrection=1' ELSE N'' END +
								CASE WHEN @useLBMCorrection=1 THEN N', @useLBMCorrection=1' ELSE N'' END + N';';

			EXEC sp_executesql @SQLCommand,
				N'@Model_ID INT, @weight DECIMAL(10,4), @age DECIMAL(10,4), @height DECIMAL(10,4), @sex CHAR(1)',
				@Model_ID=@Model_ID, @weight=@weight, @age=@age, @height=@height, @sex=@sexOrN;
		END

        -- Fetch next row from the cursor
        FETCH NEXT FROM modelCursor INTO @Model_ID, @Stored_Procedure, @useWeightAdjusted, @useABWCorrection, @useLBMCorrection
    END;

    -- Clean up cursor
    CLOSE modelCursor;
    DEALLOCATE modelCursor;

    -- Return the collected model parameters
    SELECT mp.Model_ID,
		   mm.Model_Name,
		   m.Med_ID,
		   m.Medication_Name,
		   m.Medication_Search_Terms,
           mp.name,
           mp.Vc,
           mp.k01,
           mp.k10,
           mp.k12,
           mp.k13,
           mp.k21,
           mp.k31,
           mp.ke0,
		   mm.tci_unit,
		   mm.[Default] AS default_model,
           mp.error
    FROM #ModelParameters mp
	JOIN core.Medication_Models mm WITH(NOLOCK) 
		ON mm.Model_ID=mp.Model_ID
	JOIN core.Medications m WITH(NOLOCK)
		ON m.Med_ID=mm.Medication_ID
	ORDER BY mm.Model_ID

    -- Clean up temp table
    DROP TABLE #ModelParameters;
END
GO
/****** Object:  StoredProcedure [core].[GetMedications] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alex
-- Create date: 2023-11-28
-- Description:	Pulls down TIVA medication
-- =============================================
CREATE PROCEDURE [core].[GetMedications]
AS
BEGIN
	SET NOCOUNT ON;

	SELECT 
		med.Med_ID,
		med.Med_Order,
        med.Medication_Name,
        med.Medication_Search_Terms,
		med.Standard_Concentration,
		med.Standard_Concentration_Unit,
        med.Concentration_Units,
        med.Bolus_Units,
        med.Infusion_Units,
        med.Default_Units,
        med.Units,
        med.Lower,
        med.Upper,
        med.Typical,
        med.MEAC,
        med.EndCe,
        med.EndCeText,
        med.Load_Graph_Default
	FROM core.Medications med
	WHERE ISNULL(med.Deleted,0)=0 AND med.Active=1
	ORDER BY med.Med_Order
END
GO
/****** Object:  StoredProcedure [model].[PK_Alfentanil] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 03-04-2024
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [model].[PK_Alfentanil]
    @Model_ID INT,
    @age DECIMAL(10,4),
    @weight DECIMAL(10,4),
    @height DECIMAL(10,4),
    @sex CHAR(1),
    @useWeightAdjusted BIT=0
AS
BEGIN
    SET NOCOUNT ON;

    IF(@weight IS NULL AND @useWeightAdjusted=1)
        BEGIN
            SELECT @Model_ID AS Model_ID,
                   Model_Name AS Name,
                   -1 AS Vc,
                   -1 AS k01,
                   -1 AS k10,
                   -1 AS k12,
                   -1 AS k13,
                   -1 AS k21,
                   -1 AS k31,
                   -1 AS ke0,
                   'Need Weight' AS Errors
            FROM core.Medication_Models
            WHERE Model_ID=@Model_ID
        END
    ELSE
        BEGIN

            -- Declare variables for PK parameters to be computed
            DECLARE @k01 DECIMAL(10,4);
            DECLARE @k10 DECIMAL(10,4);
            DECLARE @k12 DECIMAL(10,4);
            DECLARE @k13 DECIMAL(10,4);
            DECLARE @k21 DECIMAL(10,4);
            DECLARE @k31 DECIMAL(10,4);
            DECLARE @name NVARCHAR(100);
            DECLARE @vc DECIMAL(10,4);
            DECLARE @ke0 DECIMAL(10,4);
            DECLARE @errors NVARCHAR(300);

            SELECT
                @k01=mm.k01,
                @k10=mm.k10,
                @k12=mm.k12,
                @k13=mm.k13,
                @k21=mm.k21,
                @k31=mm.k31,
                @name=mm.Model_Name,
                @vc=mm.Vc,
                @ke0=mm.ke0
            FROM core.Medication_Models mm WITH(NOLOCK)
            WHERE mm.Medication_ID=6 AND @useWeightAdjusted=mm.useWeightAdjusted

            -- adjust vc if the flag is set
            IF @useWeightAdjusted = 1
                BEGIN
                    SET @vc = (2.185 / 70.0) * @weight
                END

            -- Return PK parameters
            SELECT @Model_ID AS Model_ID,
                   @name AS Name,
                   @vc AS Vc,
                   @k01 AS k01,
                   @k10 AS k10,
                   @k12 AS k12,
                   @k13 AS k13,
                   @k21 AS k21,
                   @k31 AS k31,
                   @ke0 AS ke0,
                   @errors AS Errors;
        END
END
GO
/****** Object:  StoredProcedure [model].[PK_Dexmedetomidine] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 03-25-2024
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [model].[PK_Dexmedetomidine]
    @Model_ID INT,
    @age DECIMAL(10,4),
    @weight DECIMAL(10,4),
    @height DECIMAL(10,4),
    @sex CHAR(1)
AS
BEGIN
    SET NOCOUNT ON;

    -- Declare variables for PK parameters to be computed
    DECLARE @k01 DECIMAL(10,4);
    DECLARE @k10 DECIMAL(10,4);
    DECLARE @k12 DECIMAL(10,4);
    DECLARE @k13 DECIMAL(10,4);
    DECLARE @k21 DECIMAL(10,4);
    DECLARE @k31 DECIMAL(10,4);
    DECLARE @name NVARCHAR(100);
    DECLARE @vc DECIMAL(10,4);
    DECLARE @ke0 DECIMAL(10,4);
    DECLARE @errors NVARCHAR(300);

    SELECT
        @k01=mm.k01,
        @k10=mm.k10,
        @k12=mm.k12,
        @k13=mm.k13,
        @k21=mm.k21,
        @k31=mm.k31,
        @name=mm.Model_Name,
        @vc=mm.Vc,
        @ke0=mm.ke0
    FROM core.Medication_Models mm WITH(NOLOCK)
    WHERE mm.Medication_ID=5

    SELECT @k10 = (0.00791*@height-0.927)/@vc;

    -- Return PK parameters
    SELECT @Model_ID AS Model_ID,
           @name AS Name,
           @vc AS Vc,
           @k01 AS k01,
           @k10 AS k10,
           @k12 AS k12,
           @k13 AS k13,
           @k21 AS k21,
           @k31 AS k31,
           @ke0 AS ke0,
           @errors AS Errors;
END
GO
/****** Object:  StoredProcedure [model].[PK_Fentanyl] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 03-04-2024
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [model].[PK_Fentanyl]
    @Model_ID INT,
    @age DECIMAL(10,4),
    @weight DECIMAL(10,4),
    @height DECIMAL(10,4),
    @sex CHAR(1)
AS
BEGIN
    SET NOCOUNT ON;

    IF(@weight IS NULL)
        BEGIN
            SELECT @Model_ID AS Model_ID,
                   Model_Name AS Name,
                   -1 AS Vc,
                   -1 AS k01,
                   -1 AS k10,
                   -1 AS k12,
                   -1 AS k13,
                   -1 AS k21,
                   -1 AS k31,
                   -1 AS ke0,
                   'Need Weight' AS Errors
            FROM core.Medication_Models
            WHERE Model_ID=@Model_ID
        END
    ELSE
        BEGIN

            -- Declare variables for PK parameters to be computed
            DECLARE @cl1 DECIMAL(10,4);
            DECLARE @cl2 DECIMAL(10,4);
            DECLARE @cl3 DECIMAL(10,4);
            DECLARE @k01 DECIMAL(10,4);
            DECLARE @k10 DECIMAL(10,4);
            DECLARE @k12 DECIMAL(10,4);
            DECLARE @k13 DECIMAL(10,4);
            DECLARE @k21 DECIMAL(10,4);
            DECLARE @k31 DECIMAL(10,4);
            DECLARE @name NVARCHAR(100);
            DECLARE @vc DECIMAL(10,4);
            DECLARE @ke0 DECIMAL(10,4);
            DECLARE @errors NVARCHAR(300);

            SELECT
                @k01=mm.k01,
                @k10=mm.k10,
                @k12=mm.k12,
                @k13=mm.k13,
                @k21=mm.k21,
                @k31=mm.k31,
                @name=mm.Model_Name,
                @vc=mm.Vc,
                @ke0=mm.ke0
            FROM core.Medication_Models mm WITH(NOLOCK)
            WHERE mm.Medication_ID=2

            SET @cl1 = 0.00838 * @weight;
            SET @cl2 = 0.0474 * @weight;
            SET @cl3 = 0.0199 * @weight;

            SET @vc = 0.105 * @weight;
            SET @k10 = @cl1 / (0.105 * @weight);
            SET @k12 = @cl2 / (0.105 * @weight);
            SET @k13 = @cl3 / (0.105 * @weight);
            SET @k21 = @cl2 / (0.446 * @weight);
            SET @k31 = @cl3 / (3.37 * @weight);

            -- Return PK parameters
            SELECT @Model_ID AS Model_ID,
                   @name AS Name,
                   @vc AS Vc,
                   @k01 AS k01,
                   @k10 AS k10,
                   @k12 AS k12,
                   @k13 AS k13,
                   @k21 AS k21,
                   @k31 AS k31,
                   @ke0 AS ke0,
                   @errors AS Errors;
        END
END
GO
/****** Object:  StoredProcedure [model].[PK_Midazolam] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 03-04-2024
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [model].[PK_Midazolam]
    @Model_ID INT,
    @age DECIMAL(10,4),
    @weight DECIMAL(10,4),
    @height DECIMAL(10,4),
    @sex CHAR(1)
AS
BEGIN
    SET NOCOUNT ON;

    -- Declare variables for PK parameters to be computed
    DECLARE @k01 DECIMAL(10,4);
    DECLARE @k10 DECIMAL(10,4);
    DECLARE @k12 DECIMAL(10,4);
    DECLARE @k13 DECIMAL(10,4);
    DECLARE @k21 DECIMAL(10,4);
    DECLARE @k31 DECIMAL(10,4);
    DECLARE @name NVARCHAR(100);
    DECLARE @vc DECIMAL(10,4);
    DECLARE @ke0 DECIMAL(10,4);
    DECLARE @errors NVARCHAR(300);

    IF(@age IS NULL)
        BEGIN
            SELECT @Model_ID AS Model_ID,
                   Model_Name AS Name,
                   -1 AS Vc,
                   -1 AS k01,
                   -1 AS k10,
                   -1 AS k12,
                   -1 AS k13,
                   -1 AS k21,
                   -1 AS k31,
                   -1 AS ke0,
                   'Need Age' AS Errors
            FROM core.Medication_Models
            WHERE Model_ID=@Model_ID
        END
    ELSE
        BEGIN
            SELECT
                @k01=mm.k01,
                @k10=mm.k10,
                @k12=mm.k12,
                @k13=mm.k13,
                @k21=mm.k21,
                @k31=mm.k31,
                @name=mm.Model_Name,
                @vc=mm.Vc,
                @ke0=mm.ke0
            FROM core.Medication_Models mm WITH(NOLOCK)
            WHERE mm.Medication_ID=7

            IF @age <= 66
                BEGIN
                    SET @vc = 7.9;
                    SET @k10 = 0.0505;
                    SET @k12 = 0.190;
                    SET @k13 = 0.065;
                    SET @k21 = 0.060;
                    SET @k31 = 0.0083;
                    SET @ke0 = 0.11;
                END
            ELSE
                BEGIN
                    SET @vc = 8.5;
                    SET @k10 = 0.04565;
                    SET @k12 = 0.10;
                    SET @k13 = 0.066;
                    SET @k21 = 0.051;
                    SET @k31 = 0.0069;
                    SET @ke0 = 0.08;
                END



            -- Return PK parameters
            SELECT @Model_ID AS Model_ID,
                   @name AS Name,
                   @vc AS Vc,
                   @k01 AS k01,
                   @k10 AS k10,
                   @k12 AS k12,
                   @k13 AS k13,
                   @k21 AS k21,
                   @k31 AS k31,
                   @ke0 AS ke0,
                   @errors AS Errors;
        END
END
GO
/****** Object:  StoredProcedure [model].[PK_Morphine] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 03-04-2024
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [model].[PK_Morphine]
    @Model_ID INT,
    @age DECIMAL(10,4),
    @weight DECIMAL(10,4),
    @height DECIMAL(10,4),
    @sex CHAR(1)
AS
BEGIN
    SET NOCOUNT ON;

    -- Declare variables for PK parameters to be computed
    DECLARE @weightFactor DECIMAL(10,4);
    DECLARE @cl1 DECIMAL(10,4);
    DECLARE @cl2 DECIMAL(10,4);
    DECLARE @v2 DECIMAL(10,4);
    DECLARE @k01 DECIMAL(10,4);
    DECLARE @k10 DECIMAL(10,4);
    DECLARE @k12 DECIMAL(10,4);
    DECLARE @k13 DECIMAL(10,4);
    DECLARE @k21 DECIMAL(10,4);
    DECLARE @k31 DECIMAL(10,4);
    DECLARE @name NVARCHAR(100);
    DECLARE @vc DECIMAL(10,4);
    DECLARE @ke0 DECIMAL(10,4);
    DECLARE @errors NVARCHAR(300);

    IF(@weight IS NULL)
        BEGIN
            SELECT @Model_ID AS Model_ID,
                   Model_Name AS Name,
                   -1 AS Vc,
                   -1 AS k01,
                   -1 AS k10,
                   -1 AS k12,
                   -1 AS k13,
                   -1 AS k21,
                   -1 AS k31,
                   -1 AS ke0,
                   'Need Weight' AS Errors
            FROM core.Medication_Models
            WHERE Model_ID=@Model_ID
        END
    ELSE
        BEGIN
            SELECT
                @k01=mm.k01,
                @k10=mm.k10,
                @k12=mm.k12,
                @k13=mm.k13,
                @k21=mm.k21,
                @k31=mm.k31,
                @name=mm.Model_Name,
                @vc=mm.Vc,
                @ke0=mm.ke0
            FROM core.Medication_Models mm WITH(NOLOCK)
            WHERE mm.Medication_ID=8

            SET @weightFactor = @weight / 70.0;
            SET @v2 = 134.0 * @weightFactor;
            SET @cl1 = 1.37 * POWER(@weightFactor, 0.75);
            SET @cl2 = 2.73 * POWER(@weightFactor, 0.75);

            SET @vc = 19.4 * @weightFactor;
            SET @k10 = @cl1 / (19.4 * @weightFactor);
            SET @k12 = @cl2 / (19.4 * @weightFactor);
            SET @k13 = 0.0;
            SET @k21 = @cl2 / @v2;
            SET @k31 = 0.0;
            SET @ke0 = 0.00756;

            -- Return PK parameters
            SELECT @Model_ID AS Model_ID,
                   @name AS Name,
                   @vc AS Vc,
                   @k01 AS k01,
                   @k10 AS k10,
                   @k12 AS k12,
                   @k13 AS k13,
                   @k21 AS k21,
                   @k31 AS k31,
                   @ke0 AS ke0,
                   @errors AS Errors;
        END
END
GO
/****** Object:  StoredProcedure [model].[PK_Propofol] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 03-04-2024
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [model].[PK_Propofol]
    @Model_ID INT,
    @age DECIMAL(10,4),
    @weight DECIMAL(10,4),
    @height DECIMAL(10,4),
    @sex CHAR(1),
    @useABWCorrection BIT=0
AS
BEGIN
    SET NOCOUNT ON;

    -- Declare variables for PK parameters to be computed
    DECLARE @wt DECIMAL(10,4);
    DECLARE @lbm DECIMAL(10,4);
    DECLARE @v2 DECIMAL(10,4);
    DECLARE @v3 DECIMAL(10,4);
    DECLARE @cl1 DECIMAL(10,4);
    DECLARE @cl2 DECIMAL(10,4);
    DECLARE @cl3 DECIMAL(10,4);
    DECLARE @k01 DECIMAL(10,4);
    DECLARE @k10 DECIMAL(10,4);
    DECLARE @k12 DECIMAL(10,4);
    DECLARE @k13 DECIMAL(10,4);
    DECLARE @k21 DECIMAL(10,4);
    DECLARE @k31 DECIMAL(10,4);
    DECLARE @name NVARCHAR(100);
    DECLARE @vc DECIMAL(10,4);
    DECLARE @ke0 DECIMAL(10,4);
    DECLARE @errors NVARCHAR(300);

    IF(@age IS NULL OR @sex='N' OR @weight IS NULL OR @height IS NULL)
        BEGIN
            SELECT @Model_ID AS Model_ID,
                   Model_Name AS Name,
                   -1 AS Vc,
                   -1 AS k01,
                   -1 AS k10,
                   -1 AS k12,
                   -1 AS k13,
                   -1 AS k21,
                   -1 AS k31,
                   -1 AS ke0,
                   'Need' +
                   CASE WHEN @weight IS NULL THEN ' Weight' ELSE '' END +
                   CASE WHEN @height IS NULL THEN ' Height' ELSE '' END +
                   CASE WHEN @age IS NULL THEN ' Age' ELSE '' END +
                   CASE WHEN @sex='N' THEN ' Sex' ELSE '' END
                       AS Errors
            FROM core.Medication_Models
            WHERE Model_ID=@Model_ID
        END
    ELSE
        BEGIN
            SELECT
                @k01=mm.k01,
                @k10=mm.k10,
                @k12=mm.k12,
                @k13=mm.k13,
                @k21=mm.k21,
                @k31=mm.k31,
                @name=mm.Model_Name,
                @vc=mm.Vc,
                @ke0=mm.ke0
            FROM core.Medication_Models mm WITH(NOLOCK)
            WHERE mm.Medication_ID=1 AND @useABWCorrection=mm.useABWCorrection

            -- Use adjusted body weight if the flag is set
            IF @useABWCorrection = 1
                BEGIN
                    SET @wt = model.calcAdjustedBodyWeight(@sex, @height, @weight);
                END
            ELSE
                BEGIN
                    SET @wt = @weight;
                END

            -- Compute Lean Body Mass
            SET @lbm = model.pkLbmJames(@wt, @height, @sex);

            -- If the calculated LBM is less than when a small weight is subtracted, give a warning
            IF @lbm < 0 BEGIN
                SET @lbm = @lbm;
                SET @errors = @errors + '|' + 'WARNING: Lean body mass is inaccurate for obese weight values with the James equation'
            END

            -- Compute PK parameters
            SET @v2 = 18.9 - 0.391 * (@age - 53);
            SET @v3 = 238;
            SET @cl1 = 1.89 + 0.0456 * (@wt - 77) - 0.0681 * (@lbm - 59) + 0.0264 * (@height - 177);
            SET @cl2 = 1.29 - 0.024 * (@age - 53);
            SET @cl3 = 0.836;

            -- Calculate rate constants
            SET @k10 = @cl1 / @vc;
            SET @k12 = @cl2 / @vc;
            SET @k13 = @cl3 / @vc;
            SET @k21 = @cl2 / @v2;
            SET @k31 = @cl3 / @v3;

            -- Return PK parameters
            SELECT @Model_ID AS Model_ID,
                   @name AS Name,
                   @vc AS Vc,
                   @k01 AS k01,
                   @k10 AS k10,
                   @k12 AS k12,
                   @k13 AS k13,
                   @k21 AS k21,
                   @k31 AS k31,
                   @ke0 AS ke0,
                   @errors AS Errors;
        END
END
GO
/****** Object:  StoredProcedure [model].[PK_Remifentanil] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [model].[PK_Remifentanil]
@Model_ID INT, @age DECIMAL (10, 4), @weight DECIMAL (10, 4), @height DECIMAL (10, 4), @sex CHAR (1), @useLBMCorrection BIT=0
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @cl1 AS DECIMAL (10, 4);
    DECLARE @cl2 AS DECIMAL (10, 4);
    DECLARE @cl3 AS DECIMAL (10, 4);
    DECLARE @v2 AS DECIMAL (10, 4);
    DECLARE @v3 AS DECIMAL (10, 4);
    DECLARE @lbm AS DECIMAL (10, 4);
    DECLARE @ageDiff AS DECIMAL (10, 4);
    DECLARE @lbmDiff AS DECIMAL (10, 4);
    DECLARE @k01 AS DECIMAL (10, 4);
    DECLARE @k10 AS DECIMAL (10, 4);
    DECLARE @k12 AS DECIMAL (10, 4);
    DECLARE @k13 AS DECIMAL (10, 4);
    DECLARE @k21 AS DECIMAL (10, 4);
    DECLARE @k31 AS DECIMAL (10, 4);
    DECLARE @name AS NVARCHAR (100);
    DECLARE @vc AS DECIMAL (10, 4);
    DECLARE @ke0 AS DECIMAL (10, 4);
    DECLARE @errors AS NVARCHAR (300);
    IF (@age IS NULL
        OR @sex = 'N'
        OR @weight IS NULL
        OR @height IS NULL)
        BEGIN
            SELECT @Model_ID AS Model_ID,
                   Model_Name AS Name,
                   -1 AS Vc,
                   -1 AS k01,
                   -1 AS k10,
                   -1 AS k12,
                   -1 AS k13,
                   -1 AS k21,
                   -1 AS k31,
                   -1 AS ke0,
                   'Need' + CASE WHEN @weight IS NULL THEN ' Weight' ELSE '' END + CASE WHEN @height IS NULL THEN ' Height' ELSE '' END + CASE WHEN @age IS NULL THEN ' Age' ELSE '' END + CASE WHEN @sex = 'N' THEN ' Sex' ELSE '' END AS Errors
            FROM   core.Medication_Models
            WHERE  Model_ID = @Model_ID;
        END
    ELSE
        BEGIN
            SELECT @k01 = mm.k01,
                   @k10 = mm.k10,
                   @k12 = mm.k12,
                   @k13 = mm.k13,
                   @k21 = mm.k21,
                   @k31 = mm.k31,
                   @name = mm.Model_Name,
                   @vc = mm.Vc,
                   @ke0 = mm.ke0
            FROM   core.Medication_Models AS mm WITH (NOLOCK)
            WHERE  mm.Medication_ID = 3
                   AND @useLBMCorrection = mm.useLBMCorrection;
            IF @useLBMCorrection = 1
                BEGIN
                    SET @lbm = model.pkLbmJanmahasatian(@weight, @height, @sex);
                END
            ELSE
                BEGIN
                    SET @lbm = model.pkLbmJames(@weight, @height, @sex);
                END
            SET @ageDiff = @age - 40.0;
            SET @lbmDiff = @lbm - 55.0;
            SET @v2 = 9.82 - 0.0811 * @ageDiff + 0.108 * @lbmDiff;
            SET @v3 = 5.42;
            SET @cl1 = 2.6 - 0.0162 * @ageDiff + 0.0191 * @lbmDiff;
            SET @cl2 = 2.05 - 0.0301 * @ageDiff;
            SET @cl3 = 0.076 - 0.00113 * @ageDiff;
            SET @vc = 5.1 - 0.0201 * @ageDiff + 0.072 * @lbmDiff;
            SET @k10 = @cl1 / (5.1 - 0.0201 * @ageDiff + 0.072 * @lbmDiff);
            SET @k12 = @cl2 / (5.1 - 0.0201 * @ageDiff + 0.072 * @lbmDiff);
            SET @k13 = @cl3 / (5.1 - 0.0201 * @ageDiff + 0.072 * @lbmDiff);
            SET @k21 = @cl2 / @v2;
            SET @k31 = @cl3 / @v3;
            SET @ke0 = 0.595 - 0.007 * @ageDiff;
            SELECT @Model_ID AS Model_ID,
                   @name AS Name,
                   @vc AS Vc,
                   @k01 AS k01,
                   @k10 AS k10,
                   @k12 AS k12,
                   @k13 AS k13,
                   @k21 AS k21,
                   @k31 AS k31,
                   @ke0 AS ke0,
                   @errors AS Errors;
        END
END

GO
/****** Object:  StoredProcedure [model].[PK_Rocuronium] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 03-04-2024
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [model].[PK_Rocuronium]
    @Model_ID INT,
    @age DECIMAL(10,4),
    @weight DECIMAL(10,4),
    @height DECIMAL(10,4),
    @sex CHAR(1)
AS
BEGIN
    SET NOCOUNT ON;

    -- Declare variables for PK parameters to be computed
    DECLARE @k01 DECIMAL(10,4);
    DECLARE @k10 DECIMAL(10,4);
    DECLARE @k12 DECIMAL(10,4);
    DECLARE @k13 DECIMAL(10,4);
    DECLARE @k21 DECIMAL(10,4);
    DECLARE @k31 DECIMAL(10,4);
    DECLARE @name NVARCHAR(100);
    DECLARE @vc DECIMAL(10,4);
    DECLARE @ke0 DECIMAL(10,4);
    DECLARE @errors NVARCHAR(300);

    IF(@weight IS NULL)
        BEGIN
            SELECT @Model_ID AS Model_ID,
                   Model_Name AS Name,
                   -1 AS Vc,
                   -1 AS k01,
                   -1 AS k10,
                   -1 AS k12,
                   -1 AS k13,
                   -1 AS k21,
                   -1 AS k31,
                   -1 AS ke0,
                   'Need Weight' AS Errors
            FROM core.Medication_Models
            WHERE Model_ID=@Model_ID
        END
    ELSE
        BEGIN
            SELECT
                @k01=mm.k01,
                @k10=mm.k10,
                @k12=mm.k12,
                @k13=mm.k13,
                @k21=mm.k21,
                @k31=mm.k31,
                @name=mm.Model_Name,
                @vc=mm.Vc,
                @ke0=mm.ke0
            FROM core.Medication_Models mm WITH(NOLOCK)
            WHERE mm.Medication_ID=9

            SET @vc = 0.0385 * @weight;

            -- Return PK parameters
            SELECT @Model_ID AS Model_ID,
                   @name AS Name,
                   @vc AS Vc,
                   @k01 AS k01,
                   @k10 AS k10,
                   @k12 AS k12,
                   @k13 AS k13,
                   @k21 AS k21,
                   @k31 AS k31,
                   @ke0 AS ke0,
                   @errors AS Errors;
        END
END
GO
/****** Object:  StoredProcedure [model].[PK_Succinylcholine] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 03-04-2024
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [model].[PK_Succinylcholine]
    @Model_ID INT,
    @age DECIMAL(10,4),
    @weight DECIMAL(10,4),
    @height DECIMAL(10,4),
    @sex CHAR(1)
AS
BEGIN
    SET NOCOUNT ON;

    IF(@weight IS NULL)
        BEGIN
            SELECT @Model_ID AS Model_ID,
                   Model_Name AS Name,
                   -1 AS Vc,
                   -1 AS k01,
                   -1 AS k10,
                   -1 AS k12,
                   -1 AS k13,
                   -1 AS k21,
                   -1 AS k31,
                   -1 AS ke0,
                   'Need Weight' AS Errors
            FROM core.Medication_Models
            WHERE Model_ID=@Model_ID
        END
    ELSE
        BEGIN
            -- Declare variables for PK parameters to be computed
            DECLARE @k01 DECIMAL(10,4);
            DECLARE @k10 DECIMAL(10,4);
            DECLARE @k12 DECIMAL(10,4);
            DECLARE @k13 DECIMAL(10,4);
            DECLARE @k21 DECIMAL(10,4);
            DECLARE @k31 DECIMAL(10,4);
            DECLARE @name NVARCHAR(100);
            DECLARE @vc DECIMAL(10,4);
            DECLARE @ke0 DECIMAL(10,4);
            DECLARE @errors NVARCHAR(300);

            SELECT
                @k01=mm.k01,
                @k10=mm.k10,
                @k12=mm.k12,
                @k13=mm.k13,
                @k21=mm.k21,
                @k31=mm.k31,
                @name=mm.Model_Name,
                @vc=mm.Vc,
                @ke0=mm.ke0
            FROM core.Medication_Models mm WITH(NOLOCK)
            WHERE mm.Medication_ID=10

            SET @vc = 0.009 * @weight;

            -- Return PK parameters
            SELECT @Model_ID AS Model_ID,
                   @name AS Name,
                   @vc AS Vc,
                   @k01 AS k01,
                   @k10 AS k10,
                   @k12 AS k12,
                   @k13 AS k13,
                   @k21 AS k21,
                   @k31 AS k31,
                   @ke0 AS ke0,
                   @errors AS Errors;
        END
END
GO
/****** Object:  StoredProcedure [model].[PK_Sufentanil] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		Hoffmann, Alexander
-- Create date: 03-04-2024
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [model].[PK_Sufentanil]
    @Model_ID INT,
    @age DECIMAL(10,4),
    @weight DECIMAL(10,4),
    @height DECIMAL(10,4),
    @sex CHAR(1)
AS
BEGIN
    SET NOCOUNT ON;

    -- Declare variables for PK parameters to be computed
    DECLARE @k01 DECIMAL(10,4);
    DECLARE @k10 DECIMAL(10,4);
    DECLARE @k12 DECIMAL(10,4);
    DECLARE @k13 DECIMAL(10,4);
    DECLARE @k21 DECIMAL(10,4);
    DECLARE @k31 DECIMAL(10,4);
    DECLARE @name NVARCHAR(100);
    DECLARE @vc DECIMAL(10,4);
    DECLARE @ke0 DECIMAL(10,4);
    DECLARE @errors NVARCHAR(300);

    SELECT
        @k01=mm.k01,
        @k10=mm.k10,
        @k12=mm.k12,
        @k13=mm.k13,
        @k21=mm.k21,
        @k31=mm.k31,
        @name=mm.Model_Name,
        @vc=mm.Vc,
        @ke0=mm.ke0
    FROM core.Medication_Models mm WITH(NOLOCK)
    WHERE mm.Medication_ID=4

    -- Return PK parameters
    SELECT @Model_ID AS Model_ID,
           @name AS Name,
           @vc AS Vc,
           @k01 AS k01,
           @k10 AS k10,
           @k12 AS k12,
           @k13 AS k13,
           @k21 AS k21,
           @k31 AS k31,
           @ke0 AS ke0,
           @errors AS Errors;
END
GO
