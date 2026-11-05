using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using TIVA_API.Authentication;
using TIVA_API.Helpers;
using TIVA_API.Models;

namespace TIVA_API.Controllers
{
    [ApiController]
    [Route("Auth/[controller]")]
    public class AuthenticationController : ControllerBase
    {
        // Dependencies
        private readonly IConfiguration _config;
        private readonly IRepository _repository;
        private readonly ITokenService _tokenService;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly SessionCache _cache;
        private readonly AccessCheckerService _accessChecker;

        // Dependency Injection and Check if in DevMode
        public AuthenticationController(IConfiguration config, ITokenService tokenService, IRepository repository, IWebHostEnvironment env, SessionCache cache,  AccessCheckerService accessChecker)
        {
            _config = config;
            _tokenService = tokenService;
            _repository = repository;
            _webHostEnvironment = env;
            _cache = cache;
            _accessChecker = accessChecker;

            if (_config["Environment"] == "Development") _repository.DevMode = true;
        }
        
        [HttpPost]
        [AllowAnonymous]
        [HttpPost("/Auth/LogOut")]
        public ActionResult<ReturnInfo> LogOut()
        {
            var ri = new ReturnInfo();
            var cookieOptions = new CookieOptions
            {
                Domain = _config["AppSettings:COOKIE_DOMAIN"],
                Path = "/",
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Expires = DateTime.UtcNow.AddYears(-1) // Set expiration in the past to delete the cookie
            };
            Response.Cookies.Append("X-Refresh-Token", "", cookieOptions);
            Response.Cookies.Append("X-Access-Token", "", cookieOptions);
            Response.Cookies.Append("X-Username", "", cookieOptions);
            ri.bSuccess = true;
            return ri;
        }
        
        // Authenticates with Client/Secret. Must Allow Anonymous Connections
        [HttpPost("/Auth/AuthenticateClient")]
        public ActionResult<ReturnInfo> AuthenticateClient(Models.Authentication auth)
        {
            var ri = new ReturnInfo();
            
            // Verify Parameters
            if (string.IsNullOrEmpty(auth.Client_ID) || string.IsNullOrEmpty(auth.Secret_ID))
            {
                ri.bSuccess = false;
                ri.oReturnObject = null;
                ri.sErrorInfo = "Client_ID or Secret_ID not Supplied";
                return ri;
            }
            
            var validClient = _repository.GetClient(auth);
            if (validClient != null)
            {
                ri = auth.AuthenticateClient(validClient);

                if (ri.bSuccess)
                {
                    // Generate JWT Token if Auth Succeeds
                    var generatedToken = _tokenService.BuildToken(
                        _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                        _config["JwtAuthentication:ValidIssuer"],
                        _config["JwtAuthentication:ValidIssuer"],
                        validClient,
                        _config["AppSettings:AUTH_JKU_URL"]);
                    var refreshToken = _tokenService.GenerateRefreshToken(
                        _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                        _config["JwtAuthentication:ValidIssuer"],
                        _config["JwtAuthentication:ValidIssuer"],
                        validClient,
                        _config["AppSettings:AUTH_JKU_URL"]);
                    if (generatedToken != null && refreshToken != null)
                    {
                        // JWT Token Build Succeeds
                        LogUtil.WriteLog("Authentication successful for:" + auth.Client_ID,false, auth.Client_ID, false,false,"",auth.Client_ID);
                        ri.bSuccess = true;
                        ri.oReturnObject = new {generatedToken, refreshToken};
                        ri.sErrorInfo = null;
                        return ri;
                    }

                    // JWT Token Build Fails
                    LogUtil.WriteLog("Authentication failed for:1:" + auth.Client_ID + ":" + ri.sErrorInfo, true, auth.Client_ID, true, false, "", auth.Client_ID);
                    ri.bSuccess = false;
                    ri.oReturnObject = null;
                    ri.sErrorInfo = "Authentication Error";
                    return ri;
                }

                // Invalid Credentials Supplied
                LogUtil.WriteLog("Authentication failed for:2:" + auth.Client_ID + ":" + ri.sErrorInfo, true, auth.Client_ID, true, false, "", auth.Client_ID);
                ri.bSuccess = false;
                ri.oReturnObject = null;
                ri.sErrorInfo = "Authentication Error";
                return ri;
            }

            // User Not Found in DB
            LogUtil.WriteLog("Authentication failed for:3:" + auth.Client_ID + ":" + ri.sErrorInfo, true, auth.Client_ID, true, false, "", auth.Client_ID);
            ri.bSuccess = false;
            ri.oReturnObject = null;
            ri.sErrorInfo = "Authentication Error";
            return ri;
        }
        
        // Checks if User Exists in LDAP
        [HttpPost("/Auth/ClientExists")]
        public ActionResult<ReturnInfo> ClientExists(Models.Authentication auth)
        {
            var ri = new ReturnInfo();
            const string endpoint = "Auth/ClientExists";
            if (!_accessChecker.HasAccess(User, endpoint))
            {
                ri.bSuccess = false;
                ri.oReturnObject = null;
                ri.sErrorInfo = "This Endpoint Either Does Not Exist Or User Does Not Have Access";
            }

            try
            {
                // Verify Parameters
                if (string.IsNullOrEmpty(auth.Client_ID))
                {
                    ri.bSuccess = false;
                    ri.oReturnObject = null;
                    ri.sErrorInfo = "Client_ID or Secret_ID not Supplied";
                    return ri;
                }

                ri.bSuccess = _repository.GetClient(auth) != null;

                return ri;
            }
            catch (Exception ex)
            {
                ri.bSuccess = false;
                ri.sErrorInfo = $"{ex.Message}{ex.StackTrace}";
            }

            return ri;
        }
        
        // Authenticates with LDAP. Must Allow Anonymous Connections
        // This Authenticate Function if for use with the Swagger UI. Other authenticates set cookies
        [HttpPost("/Auth/AuthenticateUserAPI")]
        [AllowAnonymous]
        public ActionResult<ReturnInfo> AuthenticateUserApi(Models.Authentication auth)
        {
            string generatedToken;
            string refreshToken;
            var ri = new ReturnInfo();
            
            var loginInfo = new LogUtil.UserLogin();
            
            // Verify Parameters
            if (string.IsNullOrEmpty(auth.UserId) || string.IsNullOrEmpty(auth.Password))
            {
                ri.bSuccess = false;
                ri.oReturnObject = null;
                ri.sErrorInfo = "Credentials not Supplied";
                return ri;
            }
            
            var validUser = _repository.GetUser(auth);
            if (validUser is { TestAccount: false })
            {
                // Non-Test Account User Found
                // Use Regular LDAP Auth   
                ri = auth.AuthenticateUser();

                if (ri.bSuccess)
                {
                    // Generate JWT Token if LDAP Auth Succeeds
                    generatedToken = _tokenService.BuildToken(
                        _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                        _config["JwtAuthentication:ValidIssuer"],
                        _config["JwtAuthentication:ValidIssuer"],
                        validUser,
                        _config["AppSettings:AUTH_JKU_URL"]);
                    refreshToken = _tokenService.GenerateRefreshToken(
                        _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                        _config["JwtAuthentication:ValidIssuer"],
                        _config["JwtAuthentication:ValidIssuer"],
                        validUser,
                        _config["AppSettings:AUTH_JKU_URL"]);
                    if (generatedToken != null && refreshToken != null)
                    {
                        // JWT Token Build Succeeds
                        // HttpContext.Session.SetString("Token", generatedToken);
                        LogUtil.WriteLog($"Authentication successful for:{auth.UserId}",false, auth.UserId, false,false,"",auth.UserId);
                        loginInfo.LoginSuccess = true;
                        loginInfo.UserName = auth.UserId;
                        loginInfo.Source = "AuthenticateUserAPI";
                        LogUtil.LogUserLogin(loginInfo);
                        ri.bSuccess = true;
                        ri.oReturnObject = new {generatedToken, refreshToken};
                        ri.sErrorInfo = null;
                        return ri;
                    }

                    // JWT Token Build Fails
                    LogUtil.WriteLog($"Authentication failed for:1:{auth.UserId}:{ri.sErrorInfo}", true, auth.UserId, true, false, "", auth.UserId);
                    loginInfo.LoginSuccess = false;
                    loginInfo.UserName = auth.UserId;
                    loginInfo.Source = "AuthenticateUserAPITokenFailed";
                    LogUtil.LogUserLogin(loginInfo);
                    ri.bSuccess = false;
                    ri.oReturnObject = null;
                    ri.sErrorInfo = "Login Error";
                    return ri;
                }

                // Invalid Credentials Supplied
                LogUtil.WriteLog($"Authentication failed for:2:{auth.UserId}:{ri.sErrorInfo}", true, auth.UserId, true, false, "", auth.UserId);
                loginInfo.LoginSuccess = false;
                loginInfo.UserName = auth.UserId;
                loginInfo.Source = "AuthenticateUserAPIBadCredentials";
                LogUtil.LogUserLogin(loginInfo);
                ri.bSuccess = false;
                ri.oReturnObject = null;
                ri.sErrorInfo = "Login Error";
                return ri;
            }
            
            if (validUser != null && _repository.DevMode && validUser.TestAccount)
            {
                // Test Account Valid and DevMode=True
                // Generate JWT Token, No Password Check Necessary
                generatedToken = _tokenService.BuildToken(
                    _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                    _config["JwtAuthentication:ValidIssuer"],
                    _config["JwtAuthentication:ValidIssuer"],
                    validUser,
                    _config["AppSettings:AUTH_JKU_URL"]);
                refreshToken = _tokenService.GenerateRefreshToken(
                    _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                    _config["JwtAuthentication:ValidIssuer"],
                    _config["JwtAuthentication:ValidIssuer"],
                    validUser,
                    _config["AppSettings:AUTH_JKU_URL"]);

                if (generatedToken != null && refreshToken != null)
                {
                    // JWT Token Build Succeeds
                    LogUtil.WriteLog("Authentication successful for:" + auth.UserId,false, auth.UserId, false,false,"",auth.UserId);
                    loginInfo.LoginSuccess = true;
                    loginInfo.UserName = auth.UserId;
                    loginInfo.Source = "AuthenticateUserAPITestAccount";
                    LogUtil.LogUserLogin(loginInfo);
                    ri.bSuccess = true;
                    ri.oReturnObject =  new {generatedToken, refreshToken};
                    ri.sErrorInfo = null;
                    return ri;
                }
                // JWT Token Build Fails
                LogUtil.WriteLog("Authentication failed for:" + auth.UserId + ":" + ri.sErrorInfo, true, auth.UserId, true, false, "", auth.UserId);
                loginInfo.LoginSuccess = false;
                loginInfo.UserName = auth.UserId;
                loginInfo.Source = "AuthenticateUserAPITestAccountJWT";
                LogUtil.LogUserLogin(loginInfo);
                ri.bSuccess = false;
                ri.oReturnObject = null;
                ri.sErrorInfo = $"Token Creation failed for:{auth.UserId}:{ri.sErrorInfo}";
                return ri;
            }
            
            // User Not Found in DB
            loginInfo.LoginSuccess = false;
            loginInfo.UserName = auth.UserId;
            loginInfo.Source = "AuthenticateUserAPIUserNotFound";
            LogUtil.LogUserLogin(loginInfo);
            ri.bSuccess = false;
            ri.oReturnObject = null;
            ri.sErrorInfo = $"Authentication failed for:3:{auth.UserId}:{ri.sErrorInfo}";
            return ri;
        }
        
        // Authenticates with LDAP. Must Allow Anonymous Connections
        [HttpPost("/Auth/AuthenticateUser")]
        [AllowAnonymous]
        public ActionResult<ReturnInfo> AuthenticateUser(Models.Authentication auth)
        {
            var userLogin = new LogUtil.UserLogin();
            string generatedToken;
            string refreshToken;
            var ri = new ReturnInfo();
            
            var cookieOptionsHttpOnly = new CookieOptions
            {
                Domain = _config["AppSettings:COOKIE_DOMAIN"],
                Path = "/",
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                // Expires = DateTimeOffset.UtcNow.AddMinutes(60) // Set expiration to 7 days from now
            };
            var cookieOptions = new CookieOptions
            {
                Domain =  _config["AppSettings:COOKIE_DOMAIN"],
                Path = "/",
                HttpOnly = false,
                Secure = true,
                SameSite = SameSiteMode.None,
                // Expires = DateTimeOffset.UtcNow.AddMinutes(60) // Set expiration to 7 days from now
            };
            
            // Verify Parameters
            if (string.IsNullOrEmpty(auth.UserId) || string.IsNullOrEmpty(auth.Password))
            {
                ri.bSuccess = false;
                ri.oReturnObject = null; 
                ri.sErrorInfo = "Credentials not Supplied";
                return ri;
            }
            
            var validUser = _repository.GetUser(auth);
            if (validUser is { TestAccount: false })
            {
                // Non-Test Account User Found
                // Use Regular LDAP Auth   
                ri = auth.AuthenticateUser();

                if (ri.bSuccess)
                {
                    // Generate JWT Token if LDAP Auth Succeeds
                    // Generate JWT Token if LDAP Auth Succeeds
                    generatedToken = _tokenService.BuildToken(
                        _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                        _config["JwtAuthentication:ValidIssuer"],
                        _config["JwtAuthentication:ValidIssuer"],
                        validUser,
                        _config["AppSettings:AUTH_JKU_URL"]);
                    refreshToken = _tokenService.GenerateRefreshToken(
                        _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                        _config["JwtAuthentication:ValidIssuer"],
                        _config["JwtAuthentication:ValidIssuer"],
                        validUser,
                        _config["AppSettings:AUTH_JKU_URL"]);
                    if (generatedToken != null && refreshToken != null)
                    {
                        // JWT Token Build Succeeds
                        // HttpContext.Session.SetString("Token", generatedToken);
                        LogUtil.WriteLog($"Authentication successful for:{auth.UserId}",false, "",false,false,"",auth.UserId);
                        userLogin.UserName = auth.UserId;
                        userLogin.Source = "LDAP";
                        userLogin.LoginSuccess = true;
                        userLogin.MPOGCaseId = null;
                        userLogin.SurgicalLog = null;
                        userLogin.PatientID = null;
                        userLogin.PatientMRN = null;
                        userLogin.FirstName = null;
                        userLogin.LastName = null;
                        LogUtil.LogUserLogin(userLogin);
                        
                        var userSession = _cache.GetSessionByUserAsync(validUser.UserName.ToLower()).Result;

                        if (userSession == null)
                        {
                            userSession = new Session()
                            {
                                User = validUser.UserName.ToLower(),
                                FhirId = null,
                                FhirAccessToken = null,
                                FhirRefreshToken = null,
                                ApiAccessToken = generatedToken,
                                ApiRefreshToken = refreshToken,
                                FhirTokenGenTime = null,
                                SurgicalLogId = null,
                                LoginTime = DateTime.Now.ToShortTimeString()
                            };
                        }
                        else
                        {
                            userSession.ApiAccessToken = generatedToken;
                            userSession.ApiRefreshToken = refreshToken;
                            userSession.LoginTime = DateTime.Now.ToShortTimeString();
                        }
                        var writeSession = _cache.WriteSessionToCacheAsync(userSession);
                        writeSession.Wait();
                        
                        HttpContext.Response.Cookies.Append("X-Access-Token", generatedToken, cookieOptionsHttpOnly);
                        HttpContext.Response.Cookies.Append("X-Refresh-Token", refreshToken, cookieOptionsHttpOnly);
                        HttpContext.Response.Cookies.Append("X-Username", validUser.UserName.ToLower(), cookieOptions);
                        ri.bSuccess = true;
                        ri.oReturnObject = true;
                        ri.sErrorInfo = null;
                        return ri;
                    }

                    // JWT Token Build Fails
                    LogUtil.WriteLog($"Authentication failed for:1:{auth.UserId}:{ri.sErrorInfo}", true, "", true, false, "", auth.UserId);
                    userLogin.UserName = auth.UserId;
                    userLogin.Source = "LDAP";
                    userLogin.LoginSuccess = false;
                    userLogin.MPOGCaseId = null;
                    userLogin.SurgicalLog = null;
                    userLogin.PatientID = null;
                    userLogin.PatientMRN = null;
                    userLogin.FirstName = null;
                    userLogin.LastName = null;
                    LogUtil.LogUserLogin(userLogin);
                    ri.bSuccess = false;
                    ri.oReturnObject = null;
                    ri.sErrorInfo = "Login Error";
                    return ri;
                }

                // Invalid Credentials Supplied
                LogUtil.WriteLog($"Authentication failed for:2:{auth.UserId}:{ri.sErrorInfo}", true, "", true, false, "", auth.UserId);
                userLogin.UserName = auth.UserId;
                userLogin.Source = "LDAP";
                userLogin.LoginSuccess = false;
                userLogin.MPOGCaseId = null;
                userLogin.SurgicalLog = null;
                userLogin.PatientID = null;
                userLogin.PatientMRN = null;
                userLogin.FirstName = null;
                userLogin.LastName = null;
                LogUtil.LogUserLogin(userLogin);
                ri.bSuccess = false;
                ri.oReturnObject = null;
                ri.sErrorInfo = "Login Error";
                return ri;
            }
            
            if (validUser != null && _repository.DevMode && validUser.TestAccount)
            {
                // Test Account Valid and DevMode=True
                // Generate JWT Token, No Password Check Necessary
                generatedToken = _tokenService.BuildToken(
                    _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                    _config["JwtAuthentication:ValidIssuer"],
                    _config["JwtAuthentication:ValidIssuer"],
                    validUser,
                    _config["AppSettings:AUTH_JKU_URL"]);
                refreshToken = _tokenService.GenerateRefreshToken(
                    _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                    _config["JwtAuthentication:ValidIssuer"],
                    _config["JwtAuthentication:ValidIssuer"],
                    validUser,
                    _config["AppSettings:AUTH_JKU_URL"]);
                if (generatedToken != null && refreshToken != null)
                {
                    // JWT Token Build Succeeds
                    var userSession = _cache.GetSessionByUserAsync(validUser.UserName.ToLower()).Result;

                    if (userSession == null)
                    {
                        userSession = new Session()
                        {
                            User = validUser.UserName.ToLower(),
                            FhirId = null,
                            FhirAccessToken = null,
                            FhirRefreshToken = null,
                            ApiAccessToken = generatedToken,
                            ApiRefreshToken = refreshToken,
                            FhirTokenGenTime = null,
                            SurgicalLogId = null,
                            LoginTime = DateTime.Now.ToShortTimeString()
                        };
                    }
                    else
                    {
                        userSession.ApiAccessToken = generatedToken;
                        userSession.ApiRefreshToken = refreshToken;
                        userSession.LoginTime = DateTime.Now.ToShortTimeString();
                    }
                    
                    var writeSession = _cache.WriteSessionToCacheAsync(userSession);
                    writeSession.Wait();
                    
                    HttpContext.Response.Cookies.Append("X-Access-Token", generatedToken, cookieOptionsHttpOnly);
                    HttpContext.Response.Cookies.Append("X-Refresh-Token", refreshToken, cookieOptionsHttpOnly);
                    HttpContext.Response.Cookies.Append("X-Username", validUser.UserName.ToLower(), cookieOptions);
                    LogUtil.WriteLog("Authentication successful for:" + auth.UserId,false, "", false,false,"",auth.UserId);
                    userLogin.UserName = auth.UserId;
                    userLogin.Source = "LDAP";
                    userLogin.LoginSuccess = true;
                    userLogin.MPOGCaseId = null;
                    userLogin.SurgicalLog = null;
                    userLogin.PatientID = null;
                    userLogin.PatientMRN = null;
                    userLogin.FirstName = null;
                    userLogin.LastName = null;
                    LogUtil.LogUserLogin(userLogin);
                    ri.bSuccess = true;
                    ri.oReturnObject =  true;
                    ri.sErrorInfo = null;
                    return ri;
                }
                // JWT Token Build Fails
                LogUtil.WriteLog("Authentication failed for:" + auth.UserId + ":" + ri.sErrorInfo, true, "",  true, false, "", auth.UserId);
                userLogin.UserName = auth.UserId;
                userLogin.Source = "LDAP";
                userLogin.LoginSuccess = false;
                userLogin.MPOGCaseId = null;
                userLogin.SurgicalLog = null;
                userLogin.PatientID = null;
                userLogin.PatientMRN = null;
                userLogin.FirstName = null;
                userLogin.LastName = null;
                LogUtil.LogUserLogin(userLogin);
                ri.bSuccess = false;
                ri.oReturnObject = null;
                ri.sErrorInfo = $"Token Creation failed for:{auth.UserId}:{ri.sErrorInfo}";
                return ri;
            }
            
            // User Not Found in DB
            userLogin.UserName = auth.UserId;
            userLogin.Source = "LDAP";
            userLogin.LoginSuccess = false;
            userLogin.MPOGCaseId = null;
            userLogin.SurgicalLog = null;
            userLogin.PatientID = null;
            userLogin.PatientMRN = null;
            userLogin.FirstName = null;
            userLogin.LastName = null;
            LogUtil.LogUserLogin(userLogin);
            ri.bSuccess = false;
            ri.oReturnObject = null;
            ri.sErrorInfo = $"Authentication failed for:3:{auth.UserId}:{ri.sErrorInfo}";
            return ri;
        }
        
        // Checks if User Exists in LDAP
        [HttpPost("/Auth/UserExists")]
        public ActionResult<ReturnInfo> UserExists(Models.Authentication auth)
        {
            var ri = new ReturnInfo();
            
            const string endpoint = "Auth/UserExists";
            if (!_accessChecker.HasAccess(User, endpoint))
            {
                ri.bSuccess = false;
                ri.oReturnObject = null;
                ri.sErrorInfo = "This Endpoint Either Does Not Exist Or User Does Not Have Access";
            }
            
            try
            {
                ri = auth.UserExists();
            }
            catch (Exception ex)
            {
                ri.bSuccess = false;
                ri.sErrorInfo = $"{ex.Message}{ex.StackTrace}";
            }

            return ri;
        }

        [HttpPost("/Auth/RefreshTokenUser")]
        [AllowAnonymous]
        public ActionResult<ReturnInfo> RefreshTokenUser()
        {
            var ri = new ReturnInfo();
            
            // Get Users Refresh Token from DB
            var username = User.Identity is {IsAuthenticated: false} ? "anonymous" : User.Claims.First().Value;
            if(username == "anonymous" || (string.IsNullOrEmpty(HttpContext.Request.Headers["Authorization"]) && string.IsNullOrEmpty(HttpContext.Request.Cookies["X-Refresh-Token"])))
            {
                return new StatusCodeResult(401);
            }
            var auth = new Models.Authentication("", null, "", username, "");
            
            // Fetch the Auth Token from the Header and remove the Bearer Prefix
            var refreshToken = HttpContext.Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
            if (string.IsNullOrEmpty(refreshToken))
            {
                refreshToken = HttpContext.Request.Cookies["X-Refresh-Token"];
            }
            
            // Refresh Token Validation is the same as validating the Access Token
            var isValid = _tokenService.ValidateToken(
                _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                _config["JwtAuthentication:ValidIssuer"],
                _config["JwtAuthentication:ValidIssuer"],
                refreshToken
            );

            if (!isValid) return new StatusCodeResult(401);
            
            var validUser = _repository.GetUser(auth);

            var generatedToken = _tokenService.BuildToken(
                _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                _config["JwtAuthentication:ValidIssuer"],
                _config["JwtAuthentication:ValidIssuer"],
                validUser,
                _config["AppSettings:AUTH_JKU_URL"]);
            refreshToken = _tokenService.GenerateRefreshToken(
                _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                _config["JwtAuthentication:ValidIssuer"],
                _config["JwtAuthentication:ValidIssuer"],
                validUser,
                _config["AppSettings:AUTH_JKU_URL"]);
            
            // check for token gen errors
            if (generatedToken == null || refreshToken == null) return new StatusCodeResult(401);
            
            ri.bSuccess = true;
            ri.oReturnObject = true;
                    
            var cookieOptionsHttpOnly = new CookieOptions
            {
                Domain = _config["AppSettings:COOKIE_DOMAIN"],
                Path = "/",
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                // Expires = DateTimeOffset.UtcNow.AddMinutes(60) // Set expiration to 7 days from now
            };
            var cookieOptions = new CookieOptions
            {
                Domain = _config["AppSettings:COOKIE_DOMAIN"],
                Path = "/",
                HttpOnly = false,
                Secure = true,
                SameSite = SameSiteMode.None,
                // Expires = DateTimeOffset.UtcNow.AddMinutes(60) // Set expiration to 7 days from now
            };
                    
            var userSession = _cache.GetSessionByUserAsync(validUser.UserName.ToLower()).Result;

            if (userSession == null)
            {
                userSession = new Session()
                {
                    User = validUser.UserName.ToLower(),
                    FhirId = null,
                    FhirAccessToken = null,
                    FhirRefreshToken = null,
                    FhirTokenGenTime = null,
                    ApiAccessToken = generatedToken,
                    ApiRefreshToken = refreshToken,
                    LoginTime = DateTime.Now.ToShortTimeString()
                };
            }
            else
            {
                userSession.ApiAccessToken = generatedToken;
                userSession.ApiRefreshToken = refreshToken;
                userSession.LoginTime = DateTime.Now.ToShortTimeString();
            }
            var writeSession = _cache.WriteSessionToCacheAsync(userSession);
            writeSession.Wait();
                    
            HttpContext.Response.Cookies.Append("X-Access-Token", generatedToken, cookieOptionsHttpOnly);
            HttpContext.Response.Cookies.Append("X-Refresh-Token", refreshToken, cookieOptionsHttpOnly);
            HttpContext.Response.Cookies.Append("X-Username", validUser.UserName.ToLower(), cookieOptions);
                    
            return ri;
        }
        
        [HttpPost("/Auth/RefreshTokenClient")]
        [AllowAnonymous]
        public ActionResult<ReturnInfo> RefreshTokenClient([FromBody] RefreshToken rt)
        {
            var ri = new ReturnInfo();

            // Get Users Refresh Token from DB
            var client = User.Identity is {IsAuthenticated: false} ? "anonymous" : User.Claims.First().Value;
            if(client == "anonymous" || string.IsNullOrEmpty(HttpContext.Request.Headers["Authorization"]))
            {
                return new StatusCodeResult(401);
            }
            var auth = new Models.Authentication(client, null,"", "", "");

            // Fetch the Auth Token from the Header and remove the Bearer Prefix
            var refreshToken = HttpContext.Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
            
            var isValid = _tokenService.ValidateToken(
                _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                _config["JwtAuthentication:ValidIssuer"],
                _config["JwtAuthentication:ValidIssuer"],
                refreshToken
            );

            if (!isValid) return new StatusCodeResult(401);
            
            var validClient = _repository.GetClient(auth);

            var generatedToken = _tokenService.BuildToken(
                _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                _config["JwtAuthentication:ValidIssuer"],
                _config["JwtAuthentication:ValidIssuer"],
                validClient,
                _config["AppSettings:AUTH_JKU_URL"]);
            refreshToken = _tokenService.GenerateRefreshToken(
                _config["JwtAuthentication:JWT_PRIVATE_KEY"],
                _config["JwtAuthentication:ValidIssuer"],
                _config["JwtAuthentication:ValidIssuer"],
                validClient,
                _config["AppSettings:AUTH_JKU_URL"]);
            
            if (generatedToken == null || refreshToken == null) return new StatusCodeResult(401);

            ri.bSuccess = true;
            ri.oReturnObject = true;
            
            var cookieOptionsHttpOnly = new CookieOptions
            {
                Domain = _config["AppSettings:COOKIE_DOMAIN"],
                Path = "/",
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                // Expires = DateTimeOffset.UtcNow.AddMinutes(60) // Set expiration to 7 days from now
            };
            var cookieOptions = new CookieOptions
            {
                Domain = _config["AppSettings:COOKIE_DOMAIN"],
                Path = "/",
                HttpOnly = false,
                Secure = true,
                SameSite = SameSiteMode.None,
                // Expires = DateTimeOffset.UtcNow.AddMinutes(60) // Set expiration to 7 days from now
            };
            
            var userSession = _cache.GetSessionByUserAsync(validClient.Client_ID.ToLower()).Result;

            if (userSession == null)
            {
                userSession = new Session()
                {
                    User = validClient.Client_ID.ToLower(),
                    FhirId = null,
                    FhirAccessToken = null,
                    FhirRefreshToken = null,
                    FhirTokenGenTime = null,
                    ApiAccessToken = generatedToken,
                    ApiRefreshToken = refreshToken,
                    LoginTime = DateTime.Now.ToShortTimeString()
                };
            }
            else
            {
                userSession.ApiAccessToken = generatedToken;
                userSession.ApiRefreshToken = refreshToken;
                userSession.LoginTime = DateTime.Now.ToShortTimeString();
            }
            var writeSession = _cache.WriteSessionToCacheAsync(userSession);
            writeSession.Wait();
                    
            HttpContext.Response.Cookies.Append("X-Access-Token", generatedToken, cookieOptionsHttpOnly);
            HttpContext.Response.Cookies.Append("X-Refresh-Token", refreshToken, cookieOptionsHttpOnly);
            HttpContext.Response.Cookies.Append("X-Username", validClient.Client_ID, cookieOptions);
                    
            return ri;
        }

        // Checks if Provided JWT Token is Valid 
        [HttpGet("/Auth/IsUserAuthenticated")]
        public ActionResult<bool> IsUserAuthenticated()
        {
            var expClaim = User.Claims.FirstOrDefault(c => c.Type == "exp");
            if (expClaim != null)
            {
                var expValue = Convert.ToInt64(expClaim.Value);
                var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

                if (now > expValue)
                {
                    return Unauthorized();
                }
            }
            return true;
        }
    }
}
