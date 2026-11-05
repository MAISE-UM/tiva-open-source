using System;
using System.Collections.Generic;
using System.Data;
using System.Text;
using TIVA_API.Helpers;
using Newtonsoft.Json;
// ReSharper disable all InconsistentNaming

namespace TIVA_API.Models
{
    public class Admin
    {
	    public struct ClientStruct
	    {
		    public int? ID { get; set; }
		    public string Client_Name { get; set; }
		    public string Client_ID { get; set; }
		    public string Secret_ID { get; set; }
		    public string Created_By { get; set; }
		    public string Updated_By { get; set; }
		    public string Activity_Notes { get; set; }
		    public bool? Deleted { get; set; }
	    }
	    public struct EndpointStruct
	    {
		    public int Endpoint_ID { get; set; }
		    public string  Endpoint_Name { get; set; }
		    public string  Call_Type { get; set; }
		    public string  Credential_Source { get; set; }
		    public string  Credential_Key { get; set; }
		    public string  Request_Type { get; set; }
		    public string  URL { get; set; }
		    public string  Stored_Procedure { get; set; }
		    public string  Connection_Name { get; set; }
		    public string  Result_Type { get; set; }
		    public string  DataSet_Table_Names { get; set; }
		    public bool? UseParam0UserPass { get; set; }
		    public string  Description { get; set; }
		    public string Activity_Notes { get; set; }
		    public bool?  Deleted { get; set; }
	    }

	    public struct EndpointParameterStruct
	    {
		    public int Parameter_ID { get; set; }
		    public int? Endpoint_ID { get; set; }
		    public string  Parameter_Name { get; set; }
		    public string Parameter_Type { get; set; }
		    public string Parameter_Destination { get; set; }
		    public int? Parameter_Order { get; set; }
		    public string Null_Value { get; set; }
		    public bool? Is_Optional { get; set; }
		    public bool? SystemProvided { get; set; }
		    public string Template { get; set; }
		    public string Description { get; set; }
		    public string Activity_Notes { get; set; }
		    public bool? Deleted { get; set; }
	    }
	    public struct EndpointSecurityRoleStruct
	    {
		    public int Security_ID { get; set; }
		    public int? Endpoint_ID { get; set; }
		    public int? Role_ID { get; set; }
		    public string Activity_Notes { get; set; }
		    public bool? Has_Access { get; set; }
		    public bool? Deleted { get; set; }
	    }
	    
	    // Updates the Endpoint Definitions Cache by Pulling Fresh Data from DB
        public ReturnInfo ReloadEndpoints(EndpointCache endpointCache, SessionCache sessionCache, string api)
        {
	        var ri = new ReturnInfo();
	        try
	        {
		        var sqlDAL = new DAL("DEFAULT");

		        var sbSQL = new StringBuilder();
		        sbSQL.Append("EXEC api.GetEndpoints");
		        sqlDAL.ClearSqlParameter();
		        var rdsi = sqlDAL.RetrieveDataSet(sbSQL.ToString());


		        if (rdsi.bSuccess)
		        {
			        ri.bSuccess = true;
			        ri.sErrorInfo = "";
			        
			        // Naming of Tables for Return to Client
			        if (rdsi.oDS.Tables.Count == 4)
			        {
				        rdsi.oDS.Tables[0].TableName = "Endpoints";
				        rdsi.oDS.Tables[1].TableName = "EndpointParameters";
				        rdsi.oDS.Tables[2].TableName = "EndpointSecurity";
				        rdsi.oDS.Tables[3].TableName = "EndpointControllers";
			        }

			        // Cache Variables
			        var endpoints = new  Dictionary<int, Endpoint>();
			        var endpointControllerCache = new  Dictionary<string, int>();

			        // Handle Initial Int
			        foreach (DataRow row in rdsi.oDS.Tables[0].Rows)
			        {
				        Endpoint e = new Endpoint();
				        // Set General Endpoint Information
				        e.EndpointId = (int) row["Endpoint_ID"];
				        e.EndpointName = row["Endpoint_Name"].ToString();
				        e.SetCallType(row["Call_Type"].ToString());
				        e.SetCredentialSource(row["Credential_Source"].ToString());
				        e.CredentialKey = row["Credential_Key"].ToString();
				        e.SetRequestType(row["Request_Type"].ToString());
				        e.UrlBase = row["URL_Base"].ToString();
				        e.Url = row["URL"].ToString();
				        e.StoredProcedure = row["Stored_Procedure"].ToString();
				        e.ConnectionName = row["Connection_Name"].ToString();
				        e.SetResultType(row["Result_Type"].ToString());
				        e.AllowAnonymous = row["Allow_Anonymous"] != DBNull.Value && (bool) row["Allow_Anonymous"];
				        e.DataSetTableNames = GetString(row["DataSet_Table_Names"]);
				        e.UseParam0UserPass = row["UseParam0UserPass"] != DBNull.Value && (bool) row["UseParam0UserPass"];
				        e.Description = GetString(row["Description"]);
				        endpoints[e.EndpointId] = e;
				        endpointControllerCache[e.EndpointName] = e.EndpointId;
			        }
			        
			        // Handle Parameter Processing
			        foreach (DataRow row in rdsi.oDS.Tables[1].Rows)
			        {
				        var p = new Endpoint.Parameter();
				        var endpointId = (int)row["Endpoint_ID"];
				        p.ParameterId = (int)row["Parameter_ID"];
				        p.ParameterOrder = row["Parameter_Order"] != DBNull.Value ? (int)row["Parameter_Order"] : 0;
				        p.NullValue = GetString(row["Null_Value"]);
				        p.ParameterName = row["Parameter_Name"].ToString();
				        p.SetParameterDestinationType(row["Parameter_Destination"].ToString());
				        p.ParameterDescription = GetString(row["Parameter_Description"]);
				        p.SetParameterType(row["Parameter_Type"].ToString());
				        p.IsOptional = (bool)row["Is_Optional"];
				        p.IsUserPass = (bool)row["Is_User_Pass"];
				        p.SystemProvided = (bool)row["System_Provided"];
				        p.Template = row["Template"].ToString();
				        p.Delimiter = row["Delimiter"].ToString();
				        endpoints[endpointId].Parameters.Add(p);
			        }
			        
			        // Handle Permission Processing
			        if (rdsi.oDS.Tables[2].Rows.Count > 0)
			        {
				        foreach (DataRow row in rdsi.oDS.Tables[2].Rows)
				        {
					        if(row["Security_ID"] == DBNull.Value) continue;
					        var endpointId = (int) row["Endpoint_ID"];
					        var securityId = (int)row["Security_ID"];
					        var roleName = row["Role_Name"].ToString();
					        var securityObj = new Endpoint.SecurityObject
					        {
						        Role = roleName,
						        SecurityId = securityId
					        };
					        endpoints[endpointId].SecurityObjects.Add(securityObj);
					        endpoints[endpointId].RolesWithAccess.Add(roleName);
				        }
			        }

			        // Set the Cache
			        foreach (var valuePair in endpoints)
			        {
				        endpointCache.AddOrUpdateToEndpoints(valuePair.Key, valuePair.Value).Wait();
			        }
			        foreach (var valuePair in endpointControllerCache)
			        {
				        endpointCache.AddOrUpdateEndpointControllerCache(valuePair.Key, valuePair.Value).Wait();
			        }
			        
			        // Return Updated API Information to Client
			        ri.oReturnObject = JsonConvert.SerializeObject(rdsi.oDS);
		        }
		        else
		        {
			        ri.bSuccess = false;
			        ri.sErrorInfo = rdsi.sErrorMessage;
			        return ri;
		        }
	        }
	        catch (Exception ex)
	        {
		        ri.bSuccess = false;
		        ri.sErrorInfo = "Error in getting user permissions." + ex.Message + ex.StackTrace;
	        }
	        return ri;
        }
        
        private string GetString(object inputObj)
        {
	        return inputObj == DBNull.Value ? null : inputObj.ToString();
        }
    }
}