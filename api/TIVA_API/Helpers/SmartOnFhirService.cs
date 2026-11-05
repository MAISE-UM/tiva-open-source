using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Newtonsoft.Json.Linq;
using RestSharp;
using RestSharp.Serializers.Json;
using TIVA_API.Authentication;
using TIVA_API.Models;

namespace TIVA_API.Helpers
{
    // SMART on FHIR client logic shared by the EHR launch, standalone launch and FHIR token refresh.
    // All EHR specific values come from EhrSettings (appsettings "Ehr" section).
    public class SmartOnFhirService(IOptions<EhrSettings> options, SessionCache sessionCache)
    {
        private const string SmartOAuthUrisExtension =
            "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";

        public EhrSettings Settings => options.Value;

        public record EhrEndpoints(string AuthorizeUrl, string TokenUrl);

        // Returns the cached FHIR metadata, otherwise downloads it from metadataUrl (default Ehr:MetadataUrl)
        public async Task<string> GetMetadataAsync(string metadataUrl = null)
        {
            var metadata = await sessionCache.getFhirMetadata();
            if (!string.IsNullOrEmpty(metadata))
            {
                return metadata;
            }

            var url = string.IsNullOrEmpty(metadataUrl) ? Settings.MetadataUrl : metadataUrl;
            if (string.IsNullOrEmpty(url))
            {
                return null;
            }

            metadata = GeneralUtil.GetFhirMetadata(url, GetMetadataHeaders())?.Content;
            if (!string.IsNullOrEmpty(metadata))
            {
                await sessionCache.setFhirMetadata(metadata);
            }

            return metadata;
        }

        // Finds the authorize and token URLs in the metadata security extension
        public EhrEndpoints GetEndpoints(string metadata)
        {
            if (string.IsNullOrEmpty(metadata))
            {
                return null;
            }

            var security = JObject.Parse(metadata).SelectToken("rest[0].security.extension");
            if (security == null)
            {
                return null;
            }

            if (string.Equals(Settings.EndpointDiscovery, "ByIndex", StringComparison.OrdinalIgnoreCase))
            {
                var extension = security.SelectToken("[0].extension");
                var authorizeUrl = extension?.SelectToken("[0].valueUri")?.ToString();
                var tokenUrl = extension?.SelectToken("[1].valueUri")?.ToString();
                return tokenUrl == null ? null : new EhrEndpoints(authorizeUrl, tokenUrl);
            }

            // ByUrl: use the SMART oauth-uris extension, or the first extension when it is not labelled
            var oauthUris = security.Children()
                                .FirstOrDefault(e => e.Value<string>("url") == SmartOAuthUrisExtension)
                            ?? security.SelectToken("[0]");
            var uris = oauthUris?["extension"]?.Children().ToList() ?? [];

            string FindUri(string name) => uris
                .FirstOrDefault(e => string.Equals(e.Value<string>("url"), name, StringComparison.OrdinalIgnoreCase))
                ?.Value<string>("valueUri");

            var token = FindUri("token");
            return token == null ? null : new EhrEndpoints(FindUri("authorize"), token);
        }

        // Launch issuers accepted by Ehr:AllowedIssuers. An empty list accepts every issuer
        public bool IsIssuerAllowed(string iss)
        {
            if (Settings.AllowedIssuers == null || Settings.AllowedIssuers.Count == 0)
            {
                return true;
            }

            return !string.IsNullOrEmpty(iss) && Settings.AllowedIssuers.Any(allowed =>
                string.Equals(allowed.TrimEnd('/'), iss.TrimEnd('/'), StringComparison.OrdinalIgnoreCase));
        }

        // Exchanges an authorization code for tokens. Returns the token response body, or null if it is not JSON
        public JObject ExchangeCode(string tokenUrl, string code, string redirectUri)
        {
            var response = PostTokenRequest(tokenUrl, new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["code"] = code,
                ["redirect_uri"] = redirectUri,
            });

            if (!response.IsSuccessful)
            {
                LogUtil.WriteLog($"EHR token exchange failed: {response.StatusCode} - {response.ErrorMessage}",
                    true, "", true, false);
            }

            return ParseJson(response.Content);
        }

        // Refreshes the FHIR access token in the user's session when it is older than Ehr:TokenRefreshMinutes
        public async Task<bool> RefreshAsync(string username, bool forceRefresh = false)
        {
            var userSession = await sessionCache.GetSessionByUserAsync(username);
            if (userSession?.FhirRefreshToken == null)
            {
                return false;
            }

            var tokenGenTime = DateTime.ParseExact(userSession.FhirTokenGenTime, "o", CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind);
            if ((DateTime.Now - tokenGenTime).TotalMinutes <= Settings.TokenRefreshMinutes && !forceRefresh)
            {
                return true;
            }

            try
            {
                var endpoints = GetEndpoints(await GetMetadataAsync());
                if (endpoints == null)
                {
                    return false;
                }

                var response = PostTokenRequest(endpoints.TokenUrl, new Dictionary<string, string>
                {
                    ["grant_type"] = "refresh_token",
                    ["refresh_token"] = userSession.FhirRefreshToken,
                });

                if (!response.IsSuccessful)
                {
                    LogUtil.WriteLog(
                        $"FHIR token refresh failed: {response.StatusCode} - {response.ErrorMessage} - Content: {response.Content}",
                        true, username, true, false, "", username);
                    return false;
                }

                var responseBody = ParseJson(response.Content);
                if (responseBody == null)
                {
                    return false;
                }

                userSession.FhirAccessToken = responseBody.SelectToken("access_token")?.ToString();
                // Some EHRs only return a new refresh token occasionally, keep the current one otherwise
                userSession.FhirRefreshToken = responseBody.SelectToken("refresh_token")?.ToString()
                                               ?? userSession.FhirRefreshToken;
                userSession.FhirTokenGenTime = DateTime.Now.ToString("o");

                await sessionCache.WriteSessionToCacheAsync(userSession);
                return true;
            }
            catch (Exception ex)
            {
                LogUtil.WriteLog($"FHIR token refresh failed: {ex.Message}", true, username, true, false, "", username);
                return false;
            }
        }

        // Validates the id_token against Ehr:JwksUrl, Ehr:Issuer and Ehr:ClientId
        public async Task<ReturnInfo> ValidateIdTokenAsync(string idToken)
        {
            var auth = new Models.Authentication("", "", "", "", idToken);
            return await auth.AuthenticateEhrIdTokenAsync(Settings.JwksUrl, Settings.Issuer, Settings.ClientId);
        }

        // Maps the validated id_token claims to a TIVA user using the given rules (Ehr:User or Ehr:StandaloneUser).
        // userId is the username the user was found (or created) under. created is true when a new user was added
        public UserDto ResolveUser(IEnumerable<Claim> claims, EhrUserSettings rules, IRepository repository,
            string firstName, string lastName, out string userId, out bool created)
        {
            created = false;

            var rawUserId = claims.FirstOrDefault(c => c.Type == rules.ClaimType)?.Value;
            if (rawUserId != null)
            {
                foreach (var prefix in rules.StripPrefixes.Where(prefix =>
                             rawUserId.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)))
                {
                    rawUserId = rawUserId[prefix.Length..];
                    break;
                }

                if (rules.Lowercase)
                {
                    rawUserId = rawUserId.ToLower();
                }
            }

            userId = rawUserId;
            if (string.IsNullOrEmpty(rawUserId))
            {
                return null;
            }

            var userAuth = new Models.Authentication("", "", "", rawUserId, "")
            {
                First_Name = firstName,
                Last_Name = lastName
            };

            var foundUser = repository.GetUser(userAuth);
            foreach (var suffix in rules.FallbackSuffixes)
            {
                if (foundUser != null) break;
                userAuth.UserId = $"{rawUserId}{suffix}";
                foundUser = repository.GetUser(userAuth);
            }

            if (foundUser != null)
            {
                userId = userAuth.UserId;
                return foundUser;
            }

            if (rules.AutoCreate)
            {
                foundUser = GeneralUtil.CreateTivaUser(rawUserId, "SYSTEM", firstName, lastName, rules.DefaultRoleId);
                created = foundUser != null;
            }

            return foundUser;
        }

        // Builds the private key JWT used to authenticate to the token endpoint
        private string BuildClientAssertion(string tokenUrl)
        {
            var assertion = Settings.ClientAssertion;
            return GeneralUtil.GenerateFhirjwt(
                assertion.PrivateKey,
                Settings.ClientId,
                tokenUrl,
                assertion.IncludeKidHeader ? assertion.Kid : null,
                assertion.Algorithm,
                assertion.LifetimeMinutes);
        }

        private RestResponse PostTokenRequest(string tokenUrl, Dictionary<string, string> parameters)
        {
            var client = new RestClient(new RestClientOptions(tokenUrl), configureSerialization: s =>
                s.UseSystemTextJson(new JsonSerializerOptions(JsonSerializerDefaults.Web)
                {
                    PropertyNamingPolicy = null
                }));

            var request = new RestRequest();
            foreach (var (name, value) in parameters)
            {
                request.AddParameter(name, value);
            }
            request.AddParameter("client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer");
            request.AddParameter("client_assertion", BuildClientAssertion(tokenUrl));

            return client.ExecutePost(request);
        }

        private Dictionary<string, string> GetMetadataHeaders()
        {
            return Settings.MetadataHeaders.ToDictionary(
                header => header.Key,
                header => header.Value?.Replace("{ClientId}", Settings.ClientId) ?? "");
        }

        private static JObject ParseJson(string content)
        {
            if (string.IsNullOrEmpty(content))
            {
                return null;
            }

            try
            {
                return JObject.Parse(content);
            }
            catch (Newtonsoft.Json.JsonReaderException)
            {
                return null;
            }
        }
    }
}
