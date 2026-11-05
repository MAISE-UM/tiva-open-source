using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TIVA_API.Models;

namespace TIVA_API.Helpers
{
    // The purpose of this code is to cache the endpoints and their parameters and security objects
    // The API runs as a single instance, so the cache lives in process memory and is rebuilt from the DB on startup
    public class EndpointCache
    {
        private readonly ILogger<EndpointCache> _logger;

        private readonly ConcurrentDictionary<int, Endpoint> _endpointsCache = new();
        private readonly ConcurrentDictionary<string, int> _endpointControllerCache = new();

        public EndpointCache(ILogger<EndpointCache> logger)
        {
            _logger = logger;
        }

        // Adds or Updates an Endpoint in the Cache
        public Task AddOrUpdateToEndpoints(int endpointId, Endpoint endpoint)
        {
            _endpointsCache[endpointId] = endpoint;
            return Task.CompletedTask;
        }

        // Adds or Updates an Endpoint Controller in the Cache
        public Task AddOrUpdateEndpointControllerCache(string endpointName, int endpointId)
        {
            _endpointControllerCache[endpointName] = endpointId;
            return Task.CompletedTask;
        }

        // Removes an Endpoint from the Cache
        public Task RemoveFromEndpoints(int endpointId)
        {
            _endpointsCache.TryRemove(endpointId, out _);
            return Task.CompletedTask;
        }

        // Removes an Endpoint Controller from the Cache
        public Task RemoveFromEndpointControllerCache(string endpointName)
        {
            _endpointControllerCache.TryRemove(endpointName, out _);
            return Task.CompletedTask;
        }

        // Tries to get an Endpoint from the Cache
        public Task<(bool success, Endpoint endpoint)> TryGetEndpoint(int endpointId)
        {
            return Task.FromResult(_endpointsCache.TryGetValue(endpointId, out var endpoint)
                ? (true, endpoint)
                : (false, (Endpoint) null));
        }

        // Tries to get an Endpoint Controller from the Cache
        public Task<(bool success, int endpointId)> TryGetEndpointControllerCache(string endpointName)
        {
            return Task.FromResult(_endpointControllerCache.TryGetValue(endpointName, out var endpointId)
                ? (true, endpointId)
                : (false, 0));
        }

        // Checks if an Endpoint is in the Cache
        public Task<bool> ContainsEndpoint(int endpointId)
        {
            return Task.FromResult(_endpointsCache.ContainsKey(endpointId));
        }

        // Checks if an Endpoint Controller is in the Cache
        public Task<bool> ContainsEndpointControllerCache(string endpointName)
        {
            return Task.FromResult(_endpointControllerCache.ContainsKey(endpointName));
        }

        // Serializes the Cache to a string so Comparison can be done with DB
        public Task<string> SerializeCache()
        {
            try
            {
                var list = new Dictionary<string, List<Dictionary<string, object>>>();

                var endpointList = new List<Dictionary<string, object>>();
                var endpointParameters = new List<Dictionary<string, object>>();
                var endpointSecurity = new List<Dictionary<string, object>>();

                foreach (var (endpointId, endpointObj) in _endpointsCache.OrderBy(pair => pair.Key))
                {
                    endpointList.Add(new Dictionary<string, object>
                    {
                        ["Endpoint_ID"] = endpointId,
                        ["Endpoint_Name"] = endpointObj.EndpointName,
                        ["Stored_Procedure"] = endpointObj.StoredProcedure,
                        ["Url"] = endpointObj.Url,
                        ["Url_Base"] = endpointObj.UrlBase,
                        ["Call_Type"] = SerializeCallType(endpointObj.CallType),
                        ["Request_Type"] = SerializeRequestType(endpointObj.RequestType),
                        ["Result_Type"] = SerializeResultType(endpointObj.ResultType),
                        ["Credential_Source"] = SerializeCredentialSource(endpointObj.CredentialSource),
                        ["Credential_Key"] = endpointObj.CredentialKey,
                        ["Connection_Name"] = endpointObj.ConnectionName,
                        ["Allow_Anonymous"] = endpointObj.AllowAnonymous,
                        ["UseParam0UserPass"] = endpointObj.UseParam0UserPass,
                        ["DataSet_Table_Names"] = endpointObj.DataSetTableNames,
                        ["Description"] = endpointObj.Description
                    });

                    // Add Parameters
                    endpointParameters.AddRange(endpointObj.Parameters.Select(parameterItem => new Dictionary<string, object>
                    {
                        ["Endpoint_ID"] = endpointId,
                        ["Parameter_ID"] = parameterItem.ParameterId,
                        ["Parameter_Name"] = parameterItem.ParameterName,
                        ["Parameter_Type"] = SerializeParamType(parameterItem.ParameterType),
                        ["Parameter_Order"] = parameterItem.ParameterOrder,
                        ["Null_Value"] = parameterItem.NullValue,
                        ["Is_Optional"] = parameterItem.IsOptional,
                        ["Parameter_Description"] = parameterItem.ParameterDescription
                    }));

                    endpointSecurity.AddRange(endpointObj.SecurityObjects.Select(securityObjectItem => new Dictionary<string, object>
                    {
                        ["Endpoint_ID"] = endpointId,
                        ["Security_ID"] = securityObjectItem.SecurityId,
                        ["Role_Name"] = securityObjectItem.Role
                    }));
                }

                list["Endpoints"] = endpointList;
                list["EndpointParameters"] = endpointParameters;
                list["EndpointSecurity"] = endpointSecurity;
                return Task.FromResult(JsonConvert.SerializeObject(list));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error serializing cache");
                return Task.FromResult("{}");
            }
        }

        // Cache warming method
        public Task WarmCache()
        {
            try
            {
                _logger.LogInformation("Starting cache warm-up");

                // Check if the cache is already populated
                if (!_endpointsCache.IsEmpty && !_endpointControllerCache.IsEmpty)
                {
                    _logger.LogInformation("Cache is already populated");
                    return Task.CompletedTask;
                }

                // Load endpoints from database
                var admin = new Admin();
                var ri = admin.ReloadEndpoints(this, null, null);

                if (!ri.bSuccess)
                {
                    _logger.LogError("Failed to warm cache: {Error}", ri.sErrorInfo);
                    throw new Exception($"Failed to warm cache: {ri.sErrorInfo}");
                }

                _logger.LogInformation("Cache warm-up completed successfully");
                return Task.CompletedTask;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error warming cache");
                throw;
            }
        }

        // Clears the cache, the next ReloadEndpoints or WarmCache repopulates it
        public Task InvalidateCache()
        {
            _endpointsCache.Clear();
            _endpointControllerCache.Clear();

            _logger.LogInformation("Cache invalidated");
            return Task.CompletedTask;
        }

        private static string SerializeCallType(Endpoint.CallTypes callType)
        {
            return callType switch
            {
                Endpoint.CallTypes.StoredProcedure => "StoredProcedure",
                Endpoint.CallTypes.REST => "REST",
                Endpoint.CallTypes.Invalid => "INVALID",
                _ => ""
            };
        }

        private static string SerializeCredentialSource(Endpoint.CredentialSources credentialSource)
        {
            return credentialSource switch
            {
                Endpoint.CredentialSources.None => "None",
                Endpoint.CredentialSources.CacheToken => "CacheToken",
                Endpoint.CredentialSources.UserSession => "UserSession",
                Endpoint.CredentialSources.AdminConfigTable => "AdminConfigTable",
                Endpoint.CredentialSources.Invalid => "INVALID",
                _ => ""
            };
        }

        private static string SerializeRequestType(Endpoint.RequestTypes requestType)
        {
            return requestType switch
            {
                Endpoint.RequestTypes.Get => "GET",
                Endpoint.RequestTypes.Post => "POST",
                Endpoint.RequestTypes.Update => "UPDATE",
                Endpoint.RequestTypes.Delete => "DELETE",
                Endpoint.RequestTypes.Put => "PUT",
                Endpoint.RequestTypes.Builtin => "BUILTIN",
                Endpoint.RequestTypes.Invalid => "INVALID",
                _ => ""
            };
        }

        private static string SerializeResultType(Endpoint.ResultTypes resultType)
        {
            return resultType switch
            {
                Endpoint.ResultTypes.Data => "data",
                Endpoint.ResultTypes.DataSet => "dataset",
                Endpoint.ResultTypes.Builtin => "builtin",
                Endpoint.ResultTypes.Invalid => "invalid",
                _ => ""
            };
        }

        private static string SerializeParamType(DAL.SQLParameterTypes paramType)
        {
            return paramType switch
            {
                DAL.SQLParameterTypes.INT => "int",
                DAL.SQLParameterTypes.STR => "string",
                DAL.SQLParameterTypes.DBL => "double",
                DAL.SQLParameterTypes.DATE => "date",
                DAL.SQLParameterTypes.DATETIME => "datetime",
                DAL.SQLParameterTypes.BOOL => "bool",
                DAL.SQLParameterTypes.USERTYPE => "usertype",
                DAL.SQLParameterTypes.OBJECT => "object",
                DAL.SQLParameterTypes.OBJECTLIST => "object[]",
                _ => ""
            };
        }

        private static string SerializeParamDestination(DAL.SQLParameterDestinationTypes paramDestinationType)
        {
            return paramDestinationType switch
            {
                DAL.SQLParameterDestinationTypes.PARAMETER => "Parameter",
                DAL.SQLParameterDestinationTypes.BODY => "Body",
                DAL.SQLParameterDestinationTypes.URL => "URL",
                _ => "INVALID"
            };
        }
    }
}
