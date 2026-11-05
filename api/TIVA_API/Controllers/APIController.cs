using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using TIVA_API.Helpers;
using TIVA_API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using RestSharp;
using RestSharp.Authenticators;
using RestSharp.Serializers.Json;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace TIVA_API.Controllers
{
    [ApiController]
    [Route("Api/[controller]")]
    public class ApiController(EndpointCache endpointCache, SessionCache sessionCache, SmartOnFhirService smartOnFhir, IConfiguration config) : Controller
    {
        // Executes Dynamic GET Request if Matches with DB
        [HttpGet("/Api/{schema}/{endpoint}")]
        [AllowAnonymous]
        public ActionResult<ReturnInfo> DynamicGetEndpoint(string schema, string endpoint)
        {
            var ri = new ReturnInfo();

            // Removes the ? from the start of the query string
            var queryString = HttpContext.Request.QueryString.ToString();
            if(queryString.Length > 0) 
                queryString = HttpContext.Request.QueryString.ToString()[1..];
            
            // Gets Username if JWT authenticated, otherwise anonymous
            var username = User.Identity is {IsAuthenticated: false} ? "anonymous" : User.Claims.FirstOrDefault(x => x.Type == ClaimTypes.Name)?.Value;
            
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
            
            // Get Endpoint Called, Decode Needed to Get Proper Path
            var endpointStr = $"{schema}/{endpoint}";
            
            // Get Endpoint Parameters from Query String and Parse out Parameters
            Dictionary<string, object> parameters = null;
            if (queryString.Length > 0)
            {
                try
                {
                    parameters = HandleQueryParameters(queryString);
                }
                catch (Exception e)
                {
                    ri.bSuccess = false;
                    ri.sErrorInfo = "Invalid query string parameter structure";
                    LogUtil.WriteLog(
                        $"Invalid query string for dynamic GET endpoint: {endpointStr}, query string: {queryString}, exception: {e.Message} {e.StackTrace}",
                        true, username, true, false, "", username);
                    return ri;
                }
            }

            // Checks if Endpoint Exists
            var (controllerSuccess, endpointId) = endpointCache.TryGetEndpointControllerCache(endpointStr).Result;
            if (controllerSuccess)
            {
                // Grabs Endpoint form Cache 
                var (endpointSuccess, endpointObj) = endpointCache.TryGetEndpoint(endpointId).Result;
                if (endpointSuccess)
                {

                    if (UserHasAccess(endpointObj))
                    {
                        // User Has Role with Access to Endpoint, Execute Endpoint
                        ri.oReturnObject = HandleApiCall(endpointObj, parameters, username, out var success,
                            out var errorMessage);
                        ri.bSuccess = success;
                        ri.sErrorInfo = errorMessage;
                        LogUtil.WriteLog($"GET 1 {queryString} | {JsonConvert.SerializeObject(ri.oReturnObject)}", false, username, false, false, "", username);
                    }
                    else
                    {
                        // User Does not Have Role with Access to Endpoint
                        return Forbid();
                    }
                }
                else
                {
                    // Endpoint Requested Does not Exist
                    ri.bSuccess = false;
                    ri.sErrorInfo = "This Endpoint Either Does Not Exist Or User Does Not Have Access";
                    LogUtil.WriteLog("User tried to call a non-existent dynamic GET endpoint: " + endpointStr,true, "",true,false,"",username);
                }
            }
            else
            {
                // Endpoint Requested Does not Exist
                ri.bSuccess = false;
                ri.sErrorInfo = "This Endpoint Either Does Not Exist Or User Does Not Have Access";
                LogUtil.WriteLog("User tried to call a non-existent dynamic GET endpoint: " + endpointStr,true, username, true,false,"",username);
            }
            
            return ri;
        }
        
        // Executes Dynamic GET Request with Slug if Matches with DB
        [HttpGet("/Api/{schema}/{endpoint}/{slug}")]
        [AllowAnonymous]
        public ActionResult<ReturnInfo> DynamicGetEndpoint(string schema, string endpoint, string slug)
        {
            var ri = new ReturnInfo();

            // Removes the ? from the start of the query string
            var queryString = HttpContext.Request.QueryString.ToString();
            if(queryString.Length > 0) 
                queryString = HttpContext.Request.QueryString.ToString()[1..];
            
            // Gets Username if JWT authenticated, otherwise anonymous
            var username = User.Identity is {IsAuthenticated: false} ? "anonymous" : User.Claims.FirstOrDefault(x => x.Type == ClaimTypes.Name)?.Value;
            
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
            
            // Get Endpoint Called, Decode Needed to Get Proper Path
            var endpointStr = $"{schema}/{endpoint}";
            
            // Get Endpoint Parameters from Query String and Parse out Parameters
            Dictionary<string, object> parameters = null;
            if (queryString.Length > 0)
            {
                try
                {
                    parameters = HandleQueryParameters(queryString);
                }
                catch (Exception e)
                {
                    ri.bSuccess = false;
                    ri.sErrorInfo = "Invalid query string parameter structure";
                    LogUtil.WriteLog(
                        $"Invalid query string for dynamic GET endpoint: {endpointStr}, query string: {queryString}, exception: {e.Message} {e.StackTrace}",
                        true, username, true, false, "", username);
                    return ri;
                }
            }

            // Checks if Endpoint Exists
            var (controllerSuccess, endpointId) = endpointCache.TryGetEndpointControllerCache(endpointStr).Result;
            if (controllerSuccess)
            {
                // Grabs Endpoint form Cache 
                var (endpointSuccess, endpointObj) = endpointCache.TryGetEndpoint(endpointId).Result;
                if (endpointSuccess)
                {

                    if (UserHasAccess(endpointObj))
                    {
                        // User Has Role with Access to Endpoint, Execute Endpoint
                        ri.oReturnObject = HandleApiCall(endpointObj, parameters, username, out var success,
                            out var errorMessage, slug);
                        ri.bSuccess = success;
                        ri.sErrorInfo = errorMessage;
                        LogUtil.WriteLog($"GET 2 {queryString} | {JsonConvert.SerializeObject(ri.oReturnObject)}", false, username, false, false, "", username);
                    }
                    else
                    {
                        // User Does not Have Role with Access to Endpoint
                        return Forbid();
                    }
                }
                else
                {
                    // Endpoint Requested Does not Exist
                    ri.bSuccess = false;
                    ri.sErrorInfo = "This Endpoint Either Does Not Exist Or User Does Not Have Access";
                    LogUtil.WriteLog("User tried to call a non-existent dynamic GET endpoint: " + endpointStr,true, "",true,false,"",username);
                }
            }
            else
            {
                // Endpoint Requested Does not Exist
                ri.bSuccess = false;
                ri.sErrorInfo = "This Endpoint Either Does Not Exist Or User Does Not Have Access";
                LogUtil.WriteLog("User tried to call a non-existent dynamic GET endpoint: " + endpointStr,true, username, true,false,"",username);
            }
            
            return ri;
        }
        
        // Executes Dynamic POST Request if Matches with DB
        [HttpPost("/Api/{schema}/{endpoint}")]
        [AllowAnonymous]
        public ActionResult DynamicPostEndpoint(string schema, string endpoint, [FromBody] JsonElement jsonString)
        {
            var ri = new ReturnInfo();

            endpoint = $"{schema}/{endpoint}";
            
            // Gets Username if JWT authenticated, otherwise anonymous
            var username = User.Identity is {IsAuthenticated: false} ? "anonymous" : User.Claims.FirstOrDefault(x => x.Type == ClaimTypes.Name)?.Value;
            
            // Get Input JSON from Request Body
            JObject json;
            try
            {
                json = (JObject) JsonConvert.DeserializeObject(jsonString.GetRawText());
            }
            catch (Exception e)
            {
                ri.bSuccess = false;
                ri.sErrorInfo = "Invalid JSON";
                LogUtil.WriteLog($"User tried to call dynamic POST endpoint: {endpoint} but has invalid JSON: {jsonString.GetRawText()} {e.Message} {e.StackTrace}",true,username, true,false,"", username);
                return Json(ri);
            }
            
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

            // Parse out Parameters
            var parameters = new Dictionary<string, object>();
            if (json != null)
                foreach (var parameter in json)
                {
                    var parameterName = parameter.Key;
                    var parameterValue = (string) parameter.Value;
                    parameters[parameterName] = parameterValue;
                }

            // Checks if Endpoint Exists
            var (controllerSuccess, endpointId) = endpointCache.TryGetEndpointControllerCache(endpoint).Result;
            if (controllerSuccess)
            {
                // Grabs Endpoint form Cache 
                var (endpointSuccess, endpointObj) = endpointCache.TryGetEndpoint(endpointId).Result;
                if (endpointSuccess)
                {
                    if (UserHasAccess(endpointObj))
                    {
                        // User Has Role with Access to Endpoint, Execute Endpoint
                        try
                        {
                            ri.oReturnObject = HandleApiCall(endpointObj, parameters, username, out var success,
                                out var errorMessage);
                            ri.bSuccess = success;
                            ri.sErrorInfo = errorMessage;
                            LogUtil.WriteLog($"POST {jsonString.GetRawText()} | {JsonConvert.SerializeObject(ri.oReturnObject)}", false, username, false, false, "",
                                username);

                        }
                        catch (Exception e)
                        {
                            // User Does not Have Role with Access to Endpoint
                            ri.bSuccess = false;
                            ri.sErrorInfo = $"Missing {e.Message}";
                            LogUtil.WriteLog($"User tried to call dynamic POST endpoint: {endpoint} but is missing " +
                                             $"{e.Message}, parameters provided: {jsonString.GetRawText()}",
                                true, username, true, false, "", username);
                        }
                    }
                    else
                    {
                        return Forbid();
                    }
                }
                else
                {
                    // Endpoint Requested Does not Exist
                    ri.bSuccess = false;
                    ri.sErrorInfo = "This Endpoint Either Does Not Exist Or User Does Not Have Access";
                    LogUtil.WriteLog($"User {username} tried to call a non-existent dynamic POST endpoint: " +
                                     $"{endpoint}, parameters provided: {jsonString.GetRawText()}",
                        true, "", true,false,"",username);
                }
            }
            else
            {
                // Endpoint Requested Does not Exist
                ri.bSuccess = false;
                ri.sErrorInfo = "This Endpoint Either Does Not Exist Or User Does Not Have Access";
                LogUtil.WriteLog($"User tried to call a non-existent dynamic POST endpoint: " +
                                 $"{endpoint}, parameters provided: {jsonString.GetRawText()}",
                            true,username, true,false,"",username);
            }
            
            return Ok(ri);
        }

        // Check if User Has Role with Access to Endpoint
        private bool UserHasAccess(Endpoint endpoint)
        {
            // See if the roles on the endpoint match the roles principal claims
            if (endpoint.AllowAnonymous) return true;
            return User.Claims.Any(claim => claim.Type.Contains("claims/role") 
                                            && endpoint.RolesWithAccess.Contains(claim.Value));
        }

        private object HandleApiCall(Endpoint endpoint, Dictionary<string, object> parameters, string username,
            out bool success, out string errorMessage, string slug=null)
        {
            switch (endpoint.CallType)
            {
                case Endpoint.CallTypes.StoredProcedure:
                    // Only Stored Procedure calls support slug
                    return HandleApiSpCall(endpoint, parameters, username, out success, out errorMessage, slug);
                case Endpoint.CallTypes.REST:
                    return HandleApiRestCall(endpoint, parameters, username, out success, out errorMessage);
                case Endpoint.CallTypes.Invalid:
                default:
                    success = false;
                    errorMessage = "Invalid Call Type Defined for Endpoint";
                    return null;
            }
        }

        protected virtual object HandleApiRestCall(Endpoint endpoint, Dictionary<string, object> parameters, 
            string username, out bool success, out string errorMessage)
        {
            // Refresh FHIR token for any endpoint that uses UserSession credentials (EHR FHIR endpoints)
            if (endpoint.CredentialSource == Endpoint.CredentialSources.UserSession)
            {
                var refreshed = smartOnFhir.RefreshAsync(username).Result;
                if (!refreshed)
                {
                    success = false;
                    errorMessage = "Failed to refresh FHIR token. Session may be invalid.";
                    LogUtil.WriteLog($"FHIR token refresh failed for user {username}", true, username, true, false, "", username);
                    return null;
                }
            }
            
            var urlResp = sessionCache.GetCacheItem(endpoint.UrlBase).Result;
            string urlBase;
            
            // URL bases are defined in admin.Application_Lists. Stored in Cache for easy retrieval
            if (urlResp == null)
            {
                urlBase = GeneralUtil.GetUrlBase(endpoint.UrlBase);
                
                if(urlBase == null)
                {
                    success = false;
                    errorMessage = "URL Base Not Found";
                    return null;
                }
                
                _ = sessionCache.SetCacheItem(endpoint.UrlBase, urlBase);
            }
            else
            {
                urlBase = urlResp;
            }

            var url = urlBase + endpoint.Url;
            
            // If any endpoint parameter has a destination type of URL then we need to add that parameter to end of URL
            var urlParameters = endpoint.Parameters.Where(p => p.ParameterDestination == DAL.SQLParameterDestinationTypes.URL).ToList();
            if (urlParameters.Count == 1)
            {
                var urlParameter = urlParameters.First();
                if(parameters.TryGetValue(urlParameter.ParameterName, out object value))
                    url += $"/{value}";
            }
            
            var credentialSource = endpoint.CredentialSource;
            var credentialKey = endpoint.CredentialKey;
            
            // STEP 1: Fetch Auth Bearer Token
            string bearerToken = null;
            switch (credentialSource)
            {
                case Endpoint.CredentialSources.None:
                    break;
                // Uses Encrypted value from Admin.Application_Configurations
                case Endpoint.CredentialSources.AdminConfigTable:
                    var aConfig = new AppConfigurations
                    {
                        ConfigurationName = "RESTAuthenticationKeys"
                    };
                    aConfig.GetApplicationConfigurations();
                    bearerToken = aConfig.ConfigurationsDetails.Find(item => item.ConfigurationKeyName == credentialKey)
                        ?.ConfigurationKeyValue;
                    if (username == "anonymous" || string.IsNullOrEmpty(bearerToken))
                    {
                        success = false;
                        errorMessage = "Authentication Token Invalid";
                        return null;
                    }
                    break;
                // Grabs value from User Session Cache. Primarily used for the EHR (FHIR) integration but can be expanded
                case Endpoint.CredentialSources.UserSession:
                    // Session is null if it expired or the app restarted (sessions are held in memory)
                    var bearerTokenResult = sessionCache.GetSessionByUserAsync(username).Result;
                    bearerToken = bearerTokenResult?.GetType().GetProperty(credentialKey)?.GetValue(bearerTokenResult)?.ToString();
                    if (username == "anonymous" || string.IsNullOrEmpty(bearerToken))
                    {
                        success = false;
                        errorMessage = "Authentication Token Invalid";
                        return null;
                    }
                    break;
                // Grabs value from API Cache
                case Endpoint.CredentialSources.CacheToken:
                    bearerToken = sessionCache.GetCacheItem(credentialKey).Result;
                    if (string.IsNullOrEmpty(bearerToken))
                    {
                        success = false;
                        errorMessage = "Authentication Token Invalid";
                        return null;
                    }
                    break;
                case Endpoint.CredentialSources.Invalid:
                default:
                    success = false;
                    errorMessage = "Invalid Credential Source Defined for Endpoint";
                    return null;
            }
            
            // Step 2: Start Forming the REST API Call
            var restOptions =  new RestClientOptions(url) {
                Authenticator = string.IsNullOrEmpty(bearerToken) ? null : new JwtAuthenticator(bearerToken)
            };

            var client = new RestClient(restOptions, configureSerialization: s=> 
                s.UseSystemTextJson(new JsonSerializerOptions(JsonSerializerDefaults.Web)
            {
                PropertyNamingPolicy = null
            }));

            // LogUtil.WriteLog($"User called POST endpoint: ${endpoint.EndpointName} with JSON: {parameters.ToString()}",false,"", false,false,"", username);

            var request = new RestRequest();
            request.AddHeader("Accept", "application/json");
            request.AddHeader("Content-Type", "application/json");
            
            // Step 3: Handle Parameters
            var endpointNeededParams = endpoint.Parameters.Where(endpointParameter => !endpointParameter.SystemProvided).ToList();

            // Check all needed Parameters are Provided
            var missingParams = endpointNeededParams.Where(parameter => !parameters.ContainsKey(parameter.ParameterName)).ToList();
            if (missingParams.Count != 0)
            {
                var missingParamsNames = string.Join(", ", missingParams.Select(p => p.ParameterName));
                success = false;
                errorMessage = $"Missing Required Parameters: {missingParamsNames}";
                return null;
            }

            var jsonBody = new Dictionary<string, dynamic>();
            var jsonParameters = new Dictionary<string, dynamic>();
            foreach (var endpointParameter in endpoint.Parameters)
            {
                // System Provided Parameters are static and defined in DB or JWT token
                if (endpointParameter.SystemProvided)
                {
                    if (endpointParameter.IsUserPass)
                    {
                        if (string.IsNullOrEmpty(endpointParameter.Template))
                        {
                            if (endpointParameter.ParameterDestination == DAL.SQLParameterDestinationTypes.BODY)
                            {
                                jsonBody[endpointParameter.ParameterName] = username;
                            }
                            else
                            {
                                jsonParameters[endpointParameter.ParameterName] = username;
                            }
                        }
                        else
                        {
                            if (endpointParameter.ParameterType == DAL.SQLParameterTypes.OBJECT)
                            {
                                // Objects use a template to define the object structure
                                var template = endpointParameter.Template;
                                var parameterValue = template.Replace("{var}", username);
                                if (endpointParameter.ParameterDestination == DAL.SQLParameterDestinationTypes.BODY)
                                {
                                    jsonBody[endpointParameter.ParameterName] =
                                        JsonConvert.DeserializeObject<Dictionary<string,string>>(parameterValue);
                                }
                                else
                                {
                                    jsonParameters[endpointParameter.ParameterName] =
                                        JsonConvert.DeserializeObject<Dictionary<string,string>>(parameterValue);
                                }
                            }
                            else
                            {
                                // Basic types like string, int, bool
                                var template = endpointParameter.Template;
                                if (endpointParameter.ParameterDestination == DAL.SQLParameterDestinationTypes.BODY)
                                {
                                    jsonBody[endpointParameter.ParameterName] = template.Replace("{var}", username);
                                } 
                                else
                                {
                                    jsonParameters[endpointParameter.ParameterName] = template.Replace("{var}", username);
                                }
                            }
                        }
                    }
                    else
                    {
                        if (endpointParameter.ParameterType == DAL.SQLParameterTypes.OBJECT)
                        {
                            // Objects use a template to define the object structure
                            var template = endpointParameter.Template;
                            var parameterValue = template.Replace("{var}", username);
                            if (endpointParameter.ParameterDestination == DAL.SQLParameterDestinationTypes.BODY)
                            {
                                jsonBody[endpointParameter.ParameterName] =
                                    JsonConvert.DeserializeObject<Dictionary<string,string>>(parameterValue);
                            }
                            else
                            {
                                jsonParameters[endpointParameter.ParameterName] =
                                    JsonConvert.DeserializeObject<Dictionary<string,string>>(parameterValue);
                            }
                        }
                        else if (endpointParameter.ParameterType == DAL.SQLParameterTypes.OBJECTLIST)
                        {
                            // Object Lists use a template to define the object structure
                            var template = endpointParameter.Template;
                            // Values to loop through are stored in NullValue delimited by the delimiter character
                            var parameterValues = endpointParameter.NullValue.Split(endpointParameter.Delimiter);
                            var objectList = new List<string>();
                            if (parameterValues != null)
                            {
                                objectList.AddRange(parameterValues.Select(paramValue => template.Replace("{var}", paramValue)));
                            }
                            var deserializedObject = JsonConvert.DeserializeObject<List<Dictionary<string,string>>>($"[{string.Join(",", objectList)}]");
                            if (endpointParameter.ParameterDestination == DAL.SQLParameterDestinationTypes.BODY)
                            {
                                jsonBody[endpointParameter.ParameterName] = deserializedObject;
                            } 
                            else
                            {
                                jsonParameters[endpointParameter.ParameterName] = deserializedObject;
                            }
                        }
                        else 
                        {
                            // Basic types like string, int, bool
                            if (endpointParameter.ParameterDestination == DAL.SQLParameterDestinationTypes.BODY)
                            {
                                jsonBody[endpointParameter.ParameterName] = endpointParameter.Template;
                            }
                            else
                            {
                                jsonParameters[endpointParameter.ParameterName] = endpointParameter.Template;
                            }
                        }
                    }
                }
                else
                {
                    string template;
                    switch (endpointParameter.ParameterType)
                    {
                        case DAL.SQLParameterTypes.DBL:
                        case DAL.SQLParameterTypes.INT:
                        case DAL.SQLParameterTypes.BOOL:
                        case DAL.SQLParameterTypes.STR:
                            if(string.IsNullOrEmpty(endpointParameter.Template)) {
                                // If no template is provided, just use the parameter value
                                if (endpointParameter.ParameterDestination == DAL.SQLParameterDestinationTypes.BODY)
                                {
                                    jsonBody[endpointParameter.ParameterName] =
                                        parameters[endpointParameter.ParameterName].ToString();
                                }
                                else
                                {
                                    jsonParameters[endpointParameter.ParameterName] =
                                        parameters[endpointParameter.ParameterName].ToString();
                                }
                            } else {
                                // If a template is provided, replace {var} with the parameter value
                                template = endpointParameter.Template;
                                if (endpointParameter.ParameterDestination == DAL.SQLParameterDestinationTypes.BODY)
                                {
                                    jsonBody[endpointParameter.ParameterName] = template.Replace("{var}",
                                        parameters[endpointParameter.ParameterName].ToString());
                                }
                                else
                                {
                                    jsonParameters[endpointParameter.ParameterName] = template.Replace("{var}",
                                        parameters[endpointParameter.ParameterName].ToString());
                                }
                            }
                            break;
                        case DAL.SQLParameterTypes.OBJECT:
                            // Objects use a template to define the object structure
                            template = endpointParameter.Template;
                            var parameterValue = template.Replace("{var}",
                                parameters[endpointParameter.ParameterName].ToString());
                            if (endpointParameter.ParameterDestination == DAL.SQLParameterDestinationTypes.BODY)
                            {
                                jsonBody[endpointParameter.ParameterName] =
                                    JsonConvert.DeserializeObject<Dictionary<string,string>>(parameterValue);
                            } 
                            else
                            {
                                jsonParameters[endpointParameter.ParameterName] =
                                    JsonConvert.DeserializeObject<Dictionary<string,string>>(parameterValue);
                            }

                            break;
                        case DAL.SQLParameterTypes.OBJECTLIST:
                            // Object Lists use a template to define the object structure
                            template = endpointParameter.Template;
                            // Values to loop through delimited by the delimiter character
                            var parameterValues = parameters[endpointParameter.ParameterName].ToString()?.Split(endpointParameter.Delimiter);
                            var objectList = new List<string>();
                            if (parameterValues != null)
                            {
                                objectList.AddRange(parameterValues.Select(paramValue => template.Replace("{var}", paramValue)));
                            }
                            var deserializedObject = JsonConvert.DeserializeObject<List<Dictionary<string,string>>>($"[{string.Join(",", objectList)}]");
                            if (endpointParameter.ParameterDestination == DAL.SQLParameterDestinationTypes.BODY)
                            {
                                jsonBody[endpointParameter.ParameterName] = deserializedObject;
                            } 
                            else
                            {
                                jsonParameters[endpointParameter.ParameterName] = deserializedObject;
                            }
                            break;
                        case DAL.SQLParameterTypes.DATE:
                        case DAL.SQLParameterTypes.DATETIME:
                        case DAL.SQLParameterTypes.USERTYPE:
                        case DAL.SQLParameterTypes.INVALID:
                            break;
                        default:
                            throw new ArgumentOutOfRangeException();
                    }
                }
            }

            // Only POST requests have a body
            if (endpoint.RequestType == Endpoint.RequestTypes.Post)
            {
                var bodyObj = JsonSerializer.Serialize(jsonBody);

                request.AddJsonBody(bodyObj);
            }

            // Add Query Parameters
            var endpointParameterKeys = jsonParameters.Keys.ToList();
            if(endpointParameterKeys.Count > 0)
            {
                foreach (var newParameter in endpointParameterKeys.Select(parameter => 
                             Parameter.CreateParameter(parameter, jsonParameters[parameter], ParameterType.QueryString)))
                {
                    request.AddParameter(newParameter);
                }
            }

            // Execute Request
            if (endpoint.RequestType == Endpoint.RequestTypes.Post)
            {
                var response = client.Execute(request, Method.Post);

                if (response.ResponseStatus != ResponseStatus.Completed)
                {
                    success = false;
                    errorMessage = $"REST call failed for {endpoint.EndpointName}. Status: {response.StatusCode}, Error: {response.ErrorMessage}, Content: {response.Content}";
                    LogUtil.WriteLog($"REST POST failed: {url} | StatusCode: {response.StatusCode} | ErrorMessage: {response.ErrorMessage} | Content: {response.Content}", true, username, true, false, "", username);
                    return null;
                }

                var content = response.Content;

                success = true;
                errorMessage = "";
                return content;
            }
            else
            {
                var response = client.Execute(request, Method.Get);

                if (response.ResponseStatus != ResponseStatus.Completed)
                {
                    success = false;
                    errorMessage = $"REST call failed for {endpoint.EndpointName}. Status: {response.StatusCode}, Error: {response.ErrorMessage}, Content: {response.Content}";
                    LogUtil.WriteLog($"REST GET failed: {url} | StatusCode: {response.StatusCode} | ErrorMessage: {response.ErrorMessage} | Content: {response.Content}", true, username, true, false, "", username);
                    return null;
                }

                var content = response.Content;

                success = true;
                errorMessage = "";
                return content;
            }
        }

        // Executes API Call Returning Error if Necessary
        protected virtual object HandleApiSpCall(Endpoint endpoint, Dictionary<string, object> parameters, string username, 
            out bool success, out string errorMessage, string slug)
        {
            var storedProcedure = endpoint.StoredProcedure;
            var connectionSource = endpoint.ConnectionName;
            var returnType = endpoint.ResultType;
            
            try
            {

                var sqlDal = new DAL(connectionSource);

                var sbSql = new StringBuilder();
                sbSql.Append($"EXEC {storedProcedure}");

                sqlDal.ClearSqlParameter();
                
                // System Provided Optional Parameters
                // Handle ParamPass Parameters
                if (endpoint.UseParam0UserPass)
                {
                    sbSql.Append($" @User");
                    sqlDal.AddSqlParameter("@User", DAL.SQLParameterTypes.STR, username);
                }

                // Handle Slug Parameter if Necessary
                if (slug != null)
                {
                    if(endpoint.UseParam0UserPass)
                        sbSql.Append(',');
                    sbSql.Append($" @Slug");
                    sqlDal.AddSqlParameter("@Slug", DAL.SQLParameterTypes.STR, slug);
                }
                
                // First Param Needs Space Before Others Need , Before
                var first = !endpoint.UseParam0UserPass && slug == null;
                foreach (var parameter in endpoint.Parameters)
                {
                    if(parameters == null) 
                        continue;
                    
                    object parameterValue;
                    
                    // Loops through every parameter in the endpoint and checks to see if it was received in the request
                    if (parameters.ContainsKey(parameter.ParameterName) ||
                        (!parameters.ContainsKey(parameter.ParameterName) && parameter.IsOptional))
                    {
                        // Checks if Parameter Exists or parameter does not exist and is optional
                        parameterValue = parameters.GetValueOrDefault(parameter.ParameterName);
                    } 
                    else
                    {
                        // Parameter is missing and needed, raise custom exception
                        throw new Exception($"missing required parameter: {parameter.ParameterName}");
                    }

                    var separator = first ? " " : ",";

                    bool isNull;
                    // Dynamically Handles Adding Parameters Based on Type TODO: Investigate Ways to Avoid Boxing
                    switch (parameter.ParameterType)
                    {
                        case DAL.SQLParameterTypes.STR:
                            sbSql.Append($"{separator}@{parameter.ParameterName}");
                            isNull = parameterValue == null || (parameter.NullValue != null && ((string)parameterValue).Equals(parameter.NullValue));
                            if (isNull)
                            {
                                sqlDal.AddSqlParameter(
                                    $"@{parameter.ParameterName}", 
                                    parameter.ParameterType, DBNull.Value
                                );
                            }
                            else
                            {
                                sqlDal.AddSqlParameter(
                                    $"@{parameter.ParameterName}", 
                                    parameter.ParameterType, GeneralUtil.StringValue(parameterValue)
                                );
                            }
                            first = false;
                            break;
                        case DAL.SQLParameterTypes.INT:
                            sbSql.Append($"{separator}@{parameter.ParameterName}");
                            isNull = parameterValue == null || (parameter.NullValue != null && ((int)parameterValue == int.Parse(parameter.NullValue)));
                            if (isNull)
                            {
                                sqlDal.AddSqlParameter(
                                    $"@{parameter.ParameterName}", 
                                    parameter.ParameterType, DBNull.Value
                                );
                            }
                            else
                            {
                                sqlDal.AddSqlParameter(
                                    $"@{parameter.ParameterName}", 
                                    parameter.ParameterType, GeneralUtil.IntValue(parameterValue)
                                );
                            }
                            first = false;
                            break;
                        case DAL.SQLParameterTypes.DBL:
                            sbSql.Append($"{separator}@{parameter.ParameterName}");
                            isNull = parameterValue == null || (parameter.NullValue != null && (Math.Abs((double)parameterValue - double.Parse(parameter.NullValue)) < 0.01));
                            if (isNull)
                            {
                                sqlDal.AddSqlParameter(
                                    $"@{parameter.ParameterName}", 
                                    parameter.ParameterType, DBNull.Value
                                );
                            }
                            else
                            {
                                sqlDal.AddSqlParameter(
                                    $"@{parameter.ParameterName}", 
                                    parameter.ParameterType, GeneralUtil.DblValue(parameterValue)
                                );
                            }
                            first = false;
                            break;
                        case DAL.SQLParameterTypes.BOOL:
                            sbSql.Append($"{separator}@{parameter.ParameterName}");
                            isNull = parameterValue == null || (parameter.NullValue != null && ((bool)parameterValue == bool.Parse(parameter.NullValue)));
                            if (isNull)
                            {
                                sqlDal.AddSqlParameter(
                                    $"@{parameter.ParameterName}", 
                                    parameter.ParameterType, DBNull.Value
                                );
                            }
                            else
                            {
                                sqlDal.AddSqlParameter(
                                    $"@{parameter.ParameterName}",
                                    parameter.ParameterType, GeneralUtil.BoolValue(parameterValue)
                                );
                            }
                            first = false;
                            break;
                        case DAL.SQLParameterTypes.DATE:
                        case DAL.SQLParameterTypes.DATETIME:
                            sbSql.Append($"{separator}@{parameter.ParameterName}");
                            sqlDal.AddSqlParameter(
                                $"@{parameter.ParameterName}", 
                                parameter.ParameterType, GeneralUtil.DateTimeValue(parameterValue)
                            );
                            first = false;
                            break;
                        case DAL.SQLParameterTypes.USERTYPE:
                        case DAL.SQLParameterTypes.OBJECT:
                        case DAL.SQLParameterTypes.OBJECTLIST:
                        case DAL.SQLParameterTypes.INVALID:
                        default:
                            throw new ArgumentOutOfRangeException();
                    }
                }

                // Handle Result Based on Return Type of Data or DataSet
                string jsonResult;
                switch (returnType)
                {
                    case Endpoint.ResultTypes.Data:
                    {
                        // Data Sets are Strait Forward, Just need Serialized
                        var rdi = sqlDal.RetrieveData(sbSql.ToString());
                        jsonResult = JsonConvert.SerializeObject(rdi.oDT);
                        success = rdi.bSuccess;
                        errorMessage = rdi.sErrorMessage;
                        break;
                    }
                    case Endpoint.ResultTypes.DataSet:
                    {
                        // DataSets Sometimes Rely on Naming Tables
                        // Name Tables if Defined in DB and Ignore Otherwise
                        var tableNames = endpoint.DataSetTableNames is null or "" 
                            ? [] 
                            : endpoint.DataSetTableNames.Split(';');
                        var rdi = sqlDal.RetrieveDataSet(sbSql.ToString());
                        if (!rdi.bSuccess)
                        {
                            success = false;
                            errorMessage = rdi.sErrorMessage;
                            return "";
                        }
                        for (var i = 0; i <  rdi.oDS.Tables.Count; ++i)
                        {
                            if(tableNames.Length > i) 
                                rdi.oDS.Tables[i].TableName = tableNames[i];
                        }
                        // Serialize all Tables at Once
                        jsonResult = JsonConvert.SerializeObject(rdi.oDS);
                        success = true;
                        errorMessage = rdi.sErrorMessage;
                        break;
                    }
                    case Endpoint.ResultTypes.Builtin:
                    case Endpoint.ResultTypes.Invalid:
                    default:
                        // Invalid Data Type Defined in DB 
                        success = false;
                        errorMessage = $"Invalid Result Type Defined for Endpoint {endpoint.EndpointName}, Check DB";
                        jsonResult = null;
                        break;
                }

                return jsonResult;
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("missing required parameter"))
                    throw new Exception(ex.Message);
                // Some Exception in Query Process Occured
                success = false;
                errorMessage = ex.Message + ' ' + ex.StackTrace;
                
                var usernameClaim = User.Claims.First().Value;
                LogUtil.WriteLog($"Error encountered while trying to run stored procedure: " +
                                 $"{storedProcedure}, parameters provided: {parameters}",
                    true, usernameClaim, true,false,"",usernameClaim);
                return "";
            }
        }

        // Handles GET Request Query Parameter Processing
        private Dictionary<string, object> HandleQueryParameters(string queryParameters)
        {
            // Format of Parameter = (key:value)
            // Query String Formatted As Parameter Array Seperated by &
            var parameters = new Dictionary<string, object>();
            
            // Separate Parameters
            var parameterList = queryParameters.Split('&');
            
            // Separate Key Value Pairs
            foreach (var parameterPair in parameterList)
            {
                var parameterDetails = parameterPair.Split('=');
                parameters[parameterDetails[0]] = parameterDetails[1];
            }

            return parameters;
        }
    }
}
