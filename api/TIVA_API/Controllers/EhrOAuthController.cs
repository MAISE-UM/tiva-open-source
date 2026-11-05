using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;
using TIVA_API.Authentication;
using TIVA_API.Helpers;
using TIVA_API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json.Linq;

namespace TIVA_API.Controllers
{
    // SMART on FHIR login for an EHR (e.g. Epic).
    //
    // EHR launch:  EHR -> Launch -> EHR authorize -> Callback -> client loading page -> Complete -> client dashboard
    // Standalone:  StandaloneLaunch -> EHR authorize -> StandaloneCallback -> client
    //
    // The actions are mapped in Startup with paths from Ehr:Routes, so a site can keep the paths it has
    // registered with its EHR vendor.
    public class EhrOAuthController(
        SmartOnFhirService smart,
        SessionCache sessionCache,
        ITokenService tokenService,
        IRepository userRepository,
        IConfiguration config
    ) : Controller
    {
        // Cookie holding the authorization code between Callback and Complete
        private const string CodeCookie = "X-Identifier";
        // Cookie holding the OAuth state between Callback and Complete, used when the token response has no state
        private const string StateCookie = "X-Ehr-State";

        private EhrSettings Ehr => smart.Settings;
        private string BaseUrl => config["JwtAuthentication:ValidIssuer"];

        // Step 1 of the EHR launch. The EHR opens this URL with `iss`, `launch` and the case parameters
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> Launch()
        {
            var username = User.Identity is {IsAuthenticated: false} ? "anonymous" : User.Claims.First().Value;

            try
            {
                var queryParameters = HttpContext.Request.Query;
                LogUtil.WriteLog($"EHR launch received with parameters: {string.Join(",", queryParameters.Keys)}",
                    false, "", false, false, "", username);

                string iss = queryParameters["iss"];
                if (!smart.IsIssuerAllowed(iss))
                {
                    LogUtil.WriteLog($"EHR launch rejected, issuer not allowed: {iss}", true, "", true, false, "", username);
                    return StatusCode(StatusCodes.Status403Forbidden, "Launch issuer not allowed");
                }

                var endpoints = smart.GetEndpoints(await smart.GetMetadataAsync($"{iss}/metadata"));
                if (endpoints?.AuthorizeUrl == null)
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, "Internal Auth Security Error:");
                }

                var launchParameters = Ehr.LaunchParameters;
                var state = Guid.NewGuid().ToString();
                await sessionCache.SetStateMetadata(state,
                    $"{queryParameters[launchParameters.CaseId]}|{queryParameters[launchParameters.FirstName]}|{queryParameters[launchParameters.LastName]}");

                var redirectUrl =
                    $"{endpoints.AuthorizeUrl}?response_type=code&redirect_uri={WebUtility.UrlEncode(Ehr.RedirectUrl)}&client_id={Ehr.ClientId}&scope={Ehr.LaunchScope}&launch={queryParameters["launch"]}&aud={iss}&state={state}";
                return Redirect(redirectUrl);
            }
            catch (Exception ex)
            {
                LogUtil.WriteLog($"Error processing request: {ex.Message}", true, "", true, false, "", username);
                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Auth Error:");
            }
        }

        // Step 2 of the EHR launch. The EHR redirects here with the authorization code.
        // The code is kept in a cookie and the browser is sent to the client loading page, which calls Complete
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> Callback()
        {
            var queryParameters = HttpContext.Request.Query;
            LogUtil.WriteLog($"EHR callback received with parameters: {string.Join(",", queryParameters.Keys)}",
                false, "", false, false, "", "APIButton");

            string iss = queryParameters["iss"];
            await smart.GetMetadataAsync(string.IsNullOrEmpty(iss) ? null : $"{iss}/metadata");

            HttpContext.Response.Cookies.Append(CodeCookie, queryParameters["code"], CookieOptions(httpOnly: true));
            if (!string.IsNullOrEmpty(queryParameters["state"]))
            {
                HttpContext.Response.Cookies.Append(StateCookie, queryParameters["state"], CookieOptions(httpOnly: true));
            }

            return Redirect($"{BaseUrl}{Ehr.ClientRoutes.Loading}");
        }

        // Step 3 of the EHR launch. Exchanges the code for tokens, signs the user in to TIVA and stores the
        // FHIR tokens in the session cache
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> Complete()
        {
            try
            {
                if (config["Environment"] == "Development") userRepository.DevMode = true;

                var loginInfo = new LogUtil.UserLogin { Source = Ehr.DisplayName };

                var metadata = await smart.GetMetadataAsync();
                if (metadata == null)
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, "Error Retrieving EHR Metadata");
                }

                var endpoints = smart.GetEndpoints(metadata);
                if (endpoints == null)
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, "Failed to pull metadata");
                }

                var code = HttpContext.Request.Cookies[CodeCookie];
                if (code == null)
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, "Failed to pull identifier");
                }

                var tokenResponse = smart.ExchangeCode(endpoints.TokenUrl, code, Ehr.RedirectUrl);
                if (tokenResponse == null)
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, "Internal Auth Error:");
                }

                var authenticateResult = await smart.ValidateIdTokenAsync(tokenResponse.SelectToken("id_token")?.ToString());

                // Case and reporter details saved by Launch under the OAuth state
                string surgicalLogId = null;
                string reporterFirstName = null;
                string reporterLastName = null;
                var state = tokenResponse.SelectToken("state")?.ToString() ?? HttpContext.Request.Cookies[StateCookie];
                if (state != null)
                {
                    var stateArr = (await sessionCache.GetStateMetadata(state))?.Split("|");
                    if (stateArr is { Length: >= 3 })
                    {
                        surgicalLogId = stateArr[0];
                        reporterFirstName = stateArr[1];
                        reporterLastName = stateArr[2];
                    }
                    else
                    {
                        LogUtil.WriteLog("EHR launch state not found or expired, case details are unavailable",
                            true, "", true, false);
                    }
                }

                var patientId = tokenResponse.SelectToken("patient")?.ToString();
                loginInfo.SurgicalLog = surgicalLogId;
                loginInfo.PatientID = patientId;
                loginInfo.PatientMRN = tokenResponse.SelectToken("mrn")?.ToString();
                loginInfo.FirstName = reporterFirstName;
                loginInfo.LastName = reporterLastName;

                if (!authenticateResult.bSuccess || authenticateResult.oReturnObject == null)
                {
                    LogUtil.WriteLog($"EHR Authentication failed: {authenticateResult.sErrorInfo}", true, "", true, false);
                    LogLogin(loginInfo, null, false);
                    return Redirect($"{BaseUrl}{Ehr.ClientRoutes.Failure}");
                }

                var foundUser = smart.ResolveUser((IEnumerable<Claim>) authenticateResult.oReturnObject, Ehr.User,
                    userRepository, reporterFirstName, reporterLastName, out var userId, out var created);

                if (created)
                {
                    LogUtil.WriteLog(
                        $"EHR Authentication: user {userId} does not exist in TIVA. Creating User",
                        false, userId, true, false);
                    LogLogin(loginInfo, userId, false);
                }

                if (foundUser == null)
                {
                    LogUtil.WriteLog($"User not found for:{userId?.ToLower()}", true, "", true, false,
                        "", userId?.ToLower());
                    LogLogin(loginInfo, userId, false);
                    return Redirect($"{BaseUrl}{Ehr.ClientRoutes.Failure}");
                }

                LogUtil.WriteLog($"EHR Authentication Successful for {userId}", false, "", false, false, "", userId);

                var sessionSurgicalLogId = $"{surgicalLogId}||{patientId}";
                if (!await SignIn(foundUser, userId, tokenResponse, sessionSurgicalLogId))
                {
                    LogLogin(loginInfo, userId, false);
                    return Redirect($"{BaseUrl}{Ehr.ClientRoutes.Failure}");
                }

                LogLogin(loginInfo, userId, true);
                if (surgicalLogId != null)
                {
                    HttpContext.Response.Cookies.Append("X-SurgicalID", sessionSurgicalLogId, CookieOptions(httpOnly: false));
                }

                return Redirect($"{BaseUrl}{Ehr.ClientRoutes.Launched}");
            }
            catch (Exception ex)
            {
                LogUtil.WriteLog($"Error processing callback request: {ex.Message}", true, "", true, false, "",
                    "APIButton");

                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Auth Error:");
            }
        }

        // Standalone launch (outside the EHR). Sends the browser to the EHR authorize page
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> StandaloneLaunch()
        {
            var authorizeUrl = Ehr.StandaloneAuthorizeUrl;
            if (string.IsNullOrEmpty(authorizeUrl))
            {
                authorizeUrl = smart.GetEndpoints(await smart.GetMetadataAsync())?.AuthorizeUrl;
                if (authorizeUrl == null)
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, "Internal Auth Security Error:");
                }
            }

            var redirectUrl =
                $"{authorizeUrl}?response_type=code&redirect_uri={WebUtility.UrlEncode(StandaloneRedirectUrl)}&client_id={Ehr.ClientId}&scope={Ehr.StandaloneScope}";
            return Redirect(redirectUrl);
        }

        // Standalone callback. Exchanges the code for tokens and signs the user in to TIVA
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> StandaloneCallback()
        {
            try
            {
                var endpoints = smart.GetEndpoints(await smart.GetMetadataAsync());
                if (endpoints == null)
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, "Failed to pull metadata");
                }

                var tokenResponse = smart.ExchangeCode(endpoints.TokenUrl, HttpContext.Request.Query["code"],
                    StandaloneRedirectUrl);
                if (tokenResponse == null)
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, "Internal Auth Error:");
                }

                var authenticateResult = await smart.ValidateIdTokenAsync(tokenResponse.SelectToken("id_token")?.ToString());
                if (!authenticateResult.bSuccess || authenticateResult.oReturnObject == null)
                {
                    LogUtil.WriteLog($"EHR Authentication failed: {authenticateResult.sErrorInfo}", true, "", true, false);
                    return Redirect(BaseUrl);
                }

                if (config["Environment"] == "Development") userRepository.DevMode = true;
                var validUser = smart.ResolveUser((IEnumerable<Claim>) authenticateResult.oReturnObject,
                    Ehr.StandaloneUser, userRepository, null, null, out var userId, out _);
                if (validUser == null)
                {
                    LogUtil.WriteLog($"User not found for:{userId?.ToLower()}", true, "", true, false,
                        "", userId?.ToLower());
                    return Redirect(BaseUrl);
                }

                LogUtil.WriteLog($"EHR Authentication Successful for {userId}", false, "", false, false, "", userId);

                return await SignIn(validUser, userId, tokenResponse, null)
                    ? Redirect($"{BaseUrl}{Ehr.ClientRoutes.StandaloneLaunched}")
                    : Redirect(BaseUrl);
            }
            catch (Exception ex)
            {
                LogUtil.WriteLog($"Error processing callback request: {ex.Message}", true, "", true, false, "",
                    "APIButton");

                return StatusCode(StatusCodes.Status500InternalServerError, "Internal Auth Error:");
            }
        }

        private string StandaloneRedirectUrl => string.IsNullOrEmpty(Ehr.StandaloneRedirectUrl)
            ? $"{BaseUrl}REST/{Ehr.Routes.StandaloneCallback}"
            : Ehr.StandaloneRedirectUrl;

        // Issues the TIVA tokens, stores the session (including the FHIR tokens) and sets the auth cookies
        private async Task<bool> SignIn(UserDto user, string userId, JObject tokenResponse, string surgicalLogId)
        {
            var generatedToken = tokenService.BuildToken(
                config["JwtAuthentication:JWT_PRIVATE_KEY"],
                config["JwtAuthentication:ValidIssuer"],
                config["JwtAuthentication:ValidIssuer"],
                user,
                config["AppSettings:AUTH_JKU_URL"]
            );
            var refreshToken = tokenService.GenerateRefreshToken(
                config["JwtAuthentication:JWT_PRIVATE_KEY"],
                config["JwtAuthentication:ValidIssuer"],
                config["JwtAuthentication:ValidIssuer"],
                user,
                config["AppSettings:AUTH_JKU_URL"]
            );

            if (generatedToken == null || refreshToken == null)
            {
                LogUtil.WriteLog($"Token Gen failed for:{userId?.ToLower()}", true, "", true, false,
                    "", userId?.ToLower());
                return false;
            }

            LogUtil.WriteLog($"Authentication successful for:{userId?.ToLower()}", false, "", false, false,
                "", userId?.ToLower());

            await sessionCache.WriteSessionToCacheAsync(new Session
            {
                User = userId?.ToLower(),
                FhirId = tokenResponse.SelectToken("id_token")?.ToString(),
                FhirAccessToken = tokenResponse.SelectToken("access_token")?.ToString(),
                FhirRefreshToken = tokenResponse.SelectToken("refresh_token")?.ToString(),
                ApiAccessToken = generatedToken,
                ApiRefreshToken = refreshToken,
                FhirTokenGenTime = DateTime.Now.ToString("o"),
                SurgicalLogId = surgicalLogId,
                LoginTime = DateTime.Now.ToString("o")
            });

            HttpContext.Response.Cookies.Append("X-Access-Token", generatedToken, CookieOptions(httpOnly: true));
            HttpContext.Response.Cookies.Append("X-Refresh-Token", refreshToken, CookieOptions(httpOnly: true));
            HttpContext.Response.Cookies.Append("X-Username", user.UserName.ToLower(), CookieOptions(httpOnly: false));

            var removeOptions = CookieOptions(httpOnly: true);
            removeOptions.Expires = DateTime.UtcNow.AddYears(-1); // Expiration in the past deletes the cookie
            HttpContext.Response.Cookies.Append(CodeCookie, "", removeOptions);
            HttpContext.Response.Cookies.Append(StateCookie, "", removeOptions);

            return true;
        }

        private static void LogLogin(LogUtil.UserLogin loginInfo, string userId, bool success)
        {
            loginInfo.UserName = userId;
            loginInfo.LoginSuccess = success;
            loginInfo.MPOGCaseId = null;
            LogUtil.LogUserLogin(loginInfo);
        }

        private CookieOptions CookieOptions(bool httpOnly) => new()
        {
            Domain = config["AppSettings:COOKIE_DOMAIN"],
            Path = "/",
            HttpOnly = httpOnly,
            Secure = true,
            SameSite = SameSiteMode.None,
        };
    }

    // Non-secret EHR settings the client needs (display name, data labels, Complete path)
    [ApiController]
    [Route("ehr/client-config")]
    public class EhrClientConfigController(IOptions<EhrSettings> options) : Controller
    {
        [HttpGet]
        [AllowAnonymous]
        public ActionResult<ReturnInfo> GetClientConfig()
        {
            var ehr = options.Value;
            return new ReturnInfo
            {
                bSuccess = true,
                oReturnObject = System.Text.Json.JsonSerializer.Serialize(new
                {
                    ehr.Enabled,
                    ehr.DisplayName,
                    CompletePath = ehr.Routes.Complete,
                    ehr.DataMapping
                })
            };
        }
    }

    // Public keys used to verify TIVA signed JWTs:
    // - the EHR client assertion key (Ehr:ClientAssertion), fetched by the EHR vendor
    // - the API token key (JwtAuthentication), used by the client to verify X-Access-Token
    [ApiController]
    [Route("/.well-known/jwks.json")]
    public class JwksController(
        IConfiguration config,
        IOptions<EhrSettings> ehrOptions
    ) : Controller
    {
        [HttpGet]
        [AllowAnonymous]
        public IActionResult GetJwks()
        {
            var jwks = GenerateJwks();
            return Ok(jwks);
        }

        protected virtual object GenerateJwks()
        {
            // Public Private Key generation documentation: https://vendorservices.epic.com/Article?docId=oauth2&section=Creating-Key-Pair-OpenSSL
            var keys = new List<object>();

            var ehrAssertion = ehrOptions.Value.ClientAssertion;
            if (!string.IsNullOrEmpty(ehrAssertion.PublicCertificate))
            {
                // kid must match the kid in the client assertion header when the EHR requires one
                keys.Add(BuildKey(ehrAssertion.PublicCertificate, ehrAssertion.Kid, "EHR"));
            }

            var apiPublicKeyPem = config["JwtAuthentication:JWT_PUBLIC_KEY"];
            if (apiPublicKeyPem == null)
            {
                throw new Exception("Public key var not found");
            }
            // kid must match the kid TokenService puts in the API token header
            keys.Add(BuildKey(apiPublicKeyPem, TokenService.GetKid(config), "API"));

            // Must be an array: with the API's ReferenceHandler.Preserve JSON option a List is written as
            // {"$values": [...]}, which is not a valid JWKS "keys" member
            return new { keys = keys.ToArray() };
        }

        private static object BuildKey(string certificatePem, string kid, string name)
        {
            var base64Certificate = certificatePem
                .Replace("-----BEGIN CERTIFICATE-----", "")
                .Replace("-----END CERTIFICATE-----", "")
                .Replace("\n", "")
                .Replace("\r", "");

            // Convert base64-encoded certificate to X509Certificate2 and extract the RSA public key
            var certificate = X509CertificateLoader.LoadCertificate(Convert.FromBase64String(base64Certificate));
            var rsa = certificate.GetRSAPublicKey();
            if (rsa == null)
            {
                throw new Exception($"{name} Public key not found");
            }

            var rsaParams = rsa.ExportParameters(false);
            return new
            {
                kty = "RSA",
                alg = "RS384",
                use = "sig",
                kid,
                e = Base64UrlEncoder.Encode(rsaParams.Exponent),
                n = Base64UrlEncoder.Encode(rsaParams.Modulus)
            };
        }
    }
}
