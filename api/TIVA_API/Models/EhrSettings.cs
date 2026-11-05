using System.Collections.Generic;

namespace TIVA_API.Models
{
    // Settings for the SMART on FHIR EHR integration (EHR launch + standalone launch).
    // Bound from the "Ehr" section of appsettings.json, or MA_Ehr__* environment variables.
    // See docs/EHR_INTEGRATION.md for a description of every setting.
    public class EhrSettings
    {
        public const string SectionName = "Ehr";

        public bool Enabled { get; set; } = false;

        // Name of the EHR shown in the UI and recorded as the login source
        public string DisplayName { get; set; } = "EHR";

        // OAuth client ID registered with the EHR vendor. Also used as the id_token audience.
        public string ClientId { get; set; } = "";

        // id_token validation
        public string Issuer { get; set; } = "";
        public string JwksUrl { get; set; } = "";

        // FHIR server metadata (CapabilityStatement). Used when the launch does not supply `iss`
        // (standalone launch, token refresh)
        public string MetadataUrl { get; set; } = "";

        // Launch `iss` values that are accepted. Empty list accepts any issuer (a warning is logged at startup)
        public List<string> AllowedIssuers { get; set; } = [];

        // Redirect URI registered with the EHR vendor for the EHR launch flow
        public string RedirectUrl { get; set; } = "";

        // Redirect URI for the standalone flow. Empty uses {JwtAuthentication:ValidIssuer}REST/{Routes:StandaloneCallback}
        public string StandaloneRedirectUrl { get; set; } = "";

        // Authorize URL for the standalone flow. Empty uses the authorize URL from the FHIR metadata
        public string StandaloneAuthorizeUrl { get; set; } = "";

        public string LaunchScope { get; set; } = "openid fhirUser profile launch";
        public string StandaloneScope { get; set; } = "openid fhirUser profile";

        // How the authorize and token URLs are found in the metadata security extension.
        // ByUrl matches the "authorize" and "token" extension urls, ByIndex uses position [0] and [1]
        public string EndpointDiscovery { get; set; } = "ByUrl";

        // Extra headers sent when requesting the FHIR metadata. "{ClientId}" is replaced with ClientId
        public Dictionary<string, string> MetadataHeaders { get; set; } = new();

        // FHIR access token is refreshed when it is older than this
        public int TokenRefreshMinutes { get; set; } = 45;

        public EhrRouteSettings Routes { get; set; } = new();
        public EhrClientRouteSettings ClientRoutes { get; set; } = new();
        public EhrClientAssertionSettings ClientAssertion { get; set; } = new();
        public EhrLaunchParameterSettings LaunchParameters { get; set; } = new();

        // User mapping for the EHR launch flow
        public EhrUserSettings User { get; set; } = new();

        // User mapping for the standalone flow
        public EhrUserSettings StandaloneUser { get; set; } = new() { Lowercase = true, AutoCreate = false };

        // Values the client uses to read the EHR data. Returned by GET ehr/client-config
        public EhrDataMappingSettings DataMapping { get; set; } = new();
    }

    // API paths (relative to the API root). Launch and Callback are registered with the EHR vendor
    public class EhrRouteSettings
    {
        public string Launch { get; set; } = "ehr/launch";
        public string Callback { get; set; } = "ehr/callback";
        public string Complete { get; set; } = "ehr/complete";
        public string StandaloneLaunch { get; set; } = "ehr/standalone";
        public string StandaloneCallback { get; set; } = "ehr/standalone/callback";
    }

    // Client (Next.js) paths the API redirects to, relative to JwtAuthentication:ValidIssuer.
    // Paths under auth/ skip the client route permission check
    public class EhrClientRouteSettings
    {
        public string Loading { get; set; } = "auth/ehrloading";
        public string Launched { get; set; } = "auth/ehrlaunch";
        public string Failure { get; set; } = "Search";
        public string StandaloneLaunched { get; set; } = "";
    }

    // Private key JWT used to authenticate TIVA to the EHR token endpoint
    public class EhrClientAssertionSettings
    {
        public string PrivateKey { get; set; } = "";
        // X.509 certificate PEM published at /.well-known/jwks.json
        public string PublicCertificate { get; set; } = "";
        public string Kid { get; set; } = "ehr";
        public bool IncludeKidHeader { get; set; } = true;
        public string Algorithm { get; set; } = "RS384";
        public int LifetimeMinutes { get; set; } = 2;
    }

    // Query parameter names the EHR adds to the launch URL
    public class EhrLaunchParameterSettings
    {
        public string CaseId { get; set; } = "SurgeryID";
        public string FirstName { get; set; } = "ReporterFirstName";
        public string LastName { get; set; } = "ReporterLastName";
    }

    // How the EHR username claim is mapped to a TIVA user
    public class EhrUserSettings
    {
        public string ClaimType { get; set; } = "preferred_username";
        // Removed from the start of the claim value, e.g. a DOMAIN\ prefix
        public List<string> StripPrefixes { get; set; } = [];
        // Tried in order when the plain username is not found, e.g. "@hospital.org"
        public List<string> FallbackSuffixes { get; set; } = [];
        public bool Lowercase { get; set; } = false;
        // Create the TIVA user when no match is found
        public bool AutoCreate { get; set; } = true;
        public string DefaultRoleId { get; set; } = "2";
    }

    public class EhrDataMappingSettings
    {
        public string WeightLabel { get; set; } = "Weight";
        public string HeightLabel { get; set; } = "Height";
        public string AnesthesiaStartEvent { get; set; } = "Anesthesia Start";
        public string AnesthesiaStopEvent { get; set; } = "Anesthesia Stop";
        public int ProcedurePafIndex { get; set; } = 1;
    }
}
