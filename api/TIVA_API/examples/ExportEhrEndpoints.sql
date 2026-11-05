-- Exports the EHR (FHIR) endpoint definitions from a working TIVA database.
-- Read only: run against an existing (e.g. development) database and save the results.
--
-- Use the output to create the same rows in a new site's database:
--   1. Script the rows (SSMS: Tasks > Generate Scripts > Types of data to script: Data only, for these tables),
--      or copy the result sets into INSERT statements.
--   2. Replace site specific values (EHR hostnames in the URL bases, Created_By usernames) before sharing.
--   3. Point the URL base at the new site's EHR, e.g. https://ehr.example.org/api/FHIR/R4
--   4. Call POST /Admin/ReloadEndpoints (or restart the API) to load the new rows.
--
-- The client calls these endpoints (tiva-nextjs-client api/ehr-api.tsx):
--   FHIR/GetVitalSigns              GET   patient                         FHIR Observation (vital signs)
--   FHIR/GetMedicationStatements    GET   patient, effective              FHIR MedicationStatement
--   FHIR/GetMedication              GET   medication id                   FHIR Medication
--   FHIR/GetSurgicalCase            POST  SurgicalRecordID                Epic proprietary API (not standard FHIR)
--   FHIR/GetMedicationAdministration POST PatientID, ContactID, OrderIDs  Epic proprietary API (not standard FHIR)
-- They use Credential_Source = UserSession and Credential_Key = FhirAccessToken, so the user's EHR access
-- token from the login session is sent as the bearer token.

-- Endpoints
SELECT e.*
FROM api.Endpoints e
WHERE e.Endpoint_Name LIKE 'FHIR/%'
ORDER BY e.Endpoint_ID;

-- Endpoint parameters
SELECT p.*
FROM api.EndpointParameters p
    JOIN api.Endpoints e ON e.Endpoint_ID = p.Endpoint_ID
WHERE e.Endpoint_Name LIKE 'FHIR/%'
ORDER BY p.Endpoint_ID, p.Parameter_Order;

-- Endpoint security (which roles may call each endpoint)
SELECT s.*
FROM api.EndpointSecurity s
    JOIN api.Endpoints e ON e.Endpoint_ID = s.Endpoint_ID
WHERE e.Endpoint_Name LIKE 'FHIR/%'
ORDER BY s.Endpoint_ID;

-- URL bases (List_Value is the base URL, URL_Base on the endpoint is the key)
SELECT DISTINCT e.URL_Base
FROM api.Endpoints e
WHERE e.Endpoint_Name LIKE 'FHIR/%';

-- Run once per URL_Base returned above
-- EXEC admin.GetApplicationLists @Category = 'APIEditor', @Section = 'URLBases', @Key = '<URL_Base>';
