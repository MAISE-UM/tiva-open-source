using System.Collections.Generic;
using TIVA_API.Helpers;

namespace TIVA_API.Models
{
    // Model for Endpoint Defined in DB
    public class Endpoint
    {
        // Possible Result Types of SPs
        public enum ResultTypes
        {
            Data,
            DataSet,
            Builtin,
            Invalid
        }
        
        // Possible HTTP Request Types 
        public enum RequestTypes
        {
            Get,
            Post,
            Update,
            Delete,
            Put,
            Builtin,
            Invalid
        }
        
        // Possible Call Types
        public enum CallTypes
        {
            StoredProcedure,
            REST,
            Invalid
        }
        
        // Possible Credential Sources
        public enum CredentialSources
        {
            None,
            UserSession,
            CacheToken,
            AdminConfigTable,
            Invalid
        }
        
        // Defines a Parameter Defined in DB
        public struct Parameter
        {
            public int ParameterId;
            public int ParameterOrder;
            public string ParameterName;
            public string ParameterDescription;
            public DAL.SQLParameterDestinationTypes ParameterDestination;
            public string NullValue;
            // Uses DAL SQLParameterTypes for Convenience
            public DAL.SQLParameterTypes ParameterType;
            public bool SystemProvided;
            public string Template;
            public string Delimiter;
            public bool IsOptional;
            public bool IsUserPass;
            
            // Turns String from DB into SQLParameterType
            public void SetParameterType(string parameterTypeStr)
            {
                ParameterType = parameterTypeStr.ToUpper().Trim() switch
                {
                    "INT" => DAL.SQLParameterTypes.INT,
                    "DOUBLE" => DAL.SQLParameterTypes.DBL,
                    "STRING" => DAL.SQLParameterTypes.STR,
                    "DATE" => DAL.SQLParameterTypes.DATE,
                    "DATETIME" => DAL.SQLParameterTypes.DATETIME,
                    "BOOL" => DAL.SQLParameterTypes.BOOL,
                    "USERTYPE" => DAL.SQLParameterTypes.USERTYPE,
                    "OBJECT" => DAL.SQLParameterTypes.OBJECT,
                    "OBJECT[]" => DAL.SQLParameterTypes.OBJECTLIST,
                    _ => DAL.SQLParameterTypes.INVALID
                };
            }
            // Turns String from DB into SQLParameterType
            public void SetParameterDestinationType(string parameterDestinationTypeStr)
            {
                ParameterDestination = parameterDestinationTypeStr.ToUpper().Trim() switch
                {
                    "PARAMETER" => DAL.SQLParameterDestinationTypes.PARAMETER,
                    "BODY" => DAL.SQLParameterDestinationTypes.BODY,
                    "URL" => DAL.SQLParameterDestinationTypes.URL,
                    _ => DAL.SQLParameterDestinationTypes.INVALID
                };
            }
        }

        public struct SecurityObject
        {
            public int SecurityId;
            public string Role;
        }

        // Endpoint Member Vars
        public int EndpointId;
        public string EndpointName;
        public CallTypes CallType;
        public CredentialSources CredentialSource;
        public string CredentialKey;
        public RequestTypes RequestType;
        public string UrlBase;
        public string Url;
        public string StoredProcedure;
        public string ConnectionName;
        public ResultTypes ResultType;
        public bool AllowAnonymous;
        public string DataSetTableNames;
        public bool UseParam0UserPass;
        public string Description;
        public readonly List<Parameter> Parameters = new();
        public readonly List<SecurityObject> SecurityObjects = new ();
        public readonly HashSet<string> RolesWithAccess = new();

        // Turns String from DB into RequestType
        public void SetCallType(string callTypeString)
        {
            CallType = callTypeString.ToUpper().Trim() switch
            {
                "STOREDPROCEDURE" => CallTypes.StoredProcedure,
                "REST" => CallTypes.REST,
                _ => CallTypes.Invalid
            };
        }
        
        // Turns String from DB into RequestType
        public void SetCredentialSource(string credentialSourceString)
        {
            CredentialSource = credentialSourceString.ToUpper().Trim() switch
            {
                "NONE" => CredentialSources.None,
                "USERSESSION" => CredentialSources.UserSession,
                "CACHETOKEN" => CredentialSources.CacheToken,
                "ADMINCONFIGTABLE" => CredentialSources.AdminConfigTable,
                _ => CredentialSources.Invalid
            };
        }
        
        // Turns String from DB into RequestType
        public void SetRequestType(string requestTypeString)
        {
            RequestType = requestTypeString.ToUpper().Trim() switch
            {
                "GET" => RequestTypes.Get,
                "POST" => RequestTypes.Post,
                "UPDATE" => RequestTypes.Update,
                "DELETE" => RequestTypes.Delete,
                "PUT" => RequestTypes.Put,
                _ => RequestTypes.Invalid
            };
        }
        
        // Turns String from DB into ResultType
        public void SetResultType(string resultTypeString)
        {
            ResultType = resultTypeString.ToUpper() switch
            {
                "DATA" => ResultTypes.Data,
                "DATASET" => ResultTypes.DataSet,
                _ => ResultTypes.Invalid
            };
        }
    }
}