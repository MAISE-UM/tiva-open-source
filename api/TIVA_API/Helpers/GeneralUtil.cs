using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Net.Http.Headers;
using RestSharp;
using RestSharp.Serializers.Json;
using TIVA_API.Authentication;

namespace TIVA_API.Helpers
{
    public static class GeneralUtil
    {

        public static string StringValue(object obj)
        {
            if (obj == null || obj == DBNull.Value)
            {
                return "";
            }
            return obj.ToString();
        }

        public static int IntValue(object obj)
        {
            if (obj == null || obj == DBNull.Value)
            {
                return 0;
            }
            return Convert.ToInt32(obj);
        }

        public static double DblValue(object obj)
        {
            if (obj == null || obj == DBNull.Value)
            {
                return 0.0;
            }
            var tryParse = double.TryParse(obj.ToString(), out var returnedValue);
            return tryParse ? returnedValue : 0.0;
        }

        public static decimal DecimalValue(object obj)
        {
            if (obj == null || obj == DBNull.Value)
            {
                return 0;
            }
            var tryParse = decimal.TryParse(obj.ToString(), out var returnedValue);
            return tryParse ? returnedValue : 0;
        }

        public static bool BoolValue(object obj)
        {
            if (obj == null || obj == DBNull.Value)
            {
                return false;
            }
            var tryParse = bool.TryParse(obj.ToString(), out var returnedValue);
            return tryParse && returnedValue;
        }

        public static DateTime DateTimeValue(object obj)
        {
            if (obj == null || obj == DBNull.Value)
            {
                return new DateTime(1990, 01, 01);
            }
            var tryParse = DateTime.TryParse(obj.ToString(), out var returnedValue);
            return tryParse ? returnedValue : new DateTime(1990, 01, 01);
        }

        public static string GetUser_IP()
        {
            var visitorsIpAddr = "UNKNOWN";
            try
            {
                var currContext = AppContext.Current;
                if (currContext != null)
                {
                    if (currContext.Request.Headers.TryGetValue("HTTP_X_FORWARDED_FOR", out var value))
                    {
                        visitorsIpAddr = value.ToString();
                    }
                    else if (currContext.Request.Headers.ContainsKey("X-Forwarded-For"))
                    {
                        visitorsIpAddr = currContext.Request.Headers["X-Forwarded-For"].ToString();
                    }
                    else if (currContext.Connection.RemoteIpAddress != null)
                    {
                        visitorsIpAddr = currContext.Connection.RemoteIpAddress.ToString();
                    }
                }

            }
            catch (Exception ex)
            {
                visitorsIpAddr = "Error in getting ip address.";
                LogUtil.WriteLog(visitorsIpAddr + "/" + ex.Message + ex.StackTrace, true, "SYSTEM");
            }

            return visitorsIpAddr;
        }

        public static string GetUser_BrowserDetails()
        {
            string s;
            try {
                if(AppContext.Current.Request.Headers.ContainsKey(HeaderNames.UserAgent)) {
                    s = AppContext.Current.Request.Headers[HeaderNames.UserAgent];
                }
                else
                {
                    s = "Error in getting browser details. Header Missing";
                    LogUtil.WriteLog(s, true, "SYSTEM");
                }
            }
            catch (Exception ex)
            {
                s = "Error in getting browser details.";
                LogUtil.WriteLog(s + "/" + ex.Message + ex.StackTrace, true, "SYSTEM");
            }

            return s;
        }
        
        // extraHeaders are vendor specific headers from Ehr:MetadataHeaders (e.g. Epic-Client-ID)
        public static RestResponse GetFhirMetadata(string metadataUrl, IDictionary<string, string> extraHeaders)
        {
            try
            {
                var restOptions = new RestClientOptions($"{metadataUrl}");

                var client = new RestClient(restOptions, configureSerialization: s =>
                    s.UseSystemTextJson(new JsonSerializerOptions(JsonSerializerDefaults.Web)
                    {
                        PropertyNamingPolicy = null
                    }));

                var request = new RestRequest($"");
                request.AddHeader("Accept", "application/json");
                request.AddHeader("Content-Type", "application/json");
                if (extraHeaders != null)
                {
                    foreach (var (name, value) in extraHeaders)
                    {
                        request.AddHeader(name, value);
                    }
                }

                return client.Get(request);
            }
            catch (Exception ex)
            {
                LogUtil.WriteLog($"Exception in getFhirMetadata. {ex.Message}{ex.StackTrace}", true, "");
            }

            return null;
        }

        // Builds the private key JWT client assertion for the EHR token endpoint.
        // kid is only added to the header when not null; algorithm is a JWA name such as RS384
        public static string GenerateFhirjwt(string privateKeyPem, string clientId, string aud,
            string kid = null, string algorithm = SecurityAlgorithms.RsaSha384, int lifetimeMinutes = 2)
        {
            // Parse the private key
            RSA privateKey = RSA.Create();
            privateKey.ImportFromPem(privateKeyPem);

            // Create JWT header
            var signingKey = new RsaSecurityKey(privateKey);
            if (!string.IsNullOrEmpty(kid))
            {
                signingKey.KeyId = kid;
            }
            var header = new JwtHeader(new SigningCredentials(signingKey, algorithm));

            // Generate unique jti
            string jti = Guid.NewGuid().ToString();

            // Calculate exp (lifetimeMinutes in the future)
            long exp = DateTimeOffset.UtcNow.AddMinutes(lifetimeMinutes).ToUnixTimeSeconds();

            // Create JWT payload
            var payload = new JwtPayload
            {
                {"iss", clientId},
                {"sub", clientId},
                {"aud", aud},
                {"jti", jti},
                {"exp", exp},
                // {"nbf", 1583524102},
                // {"iat", 1583524102}
            };

            // Create JWT token
            var jwt = new JwtSecurityToken(header, payload);

            // Encode JWT to a string
            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenString = tokenHandler.WriteToken(jwt);

            return tokenString;
        }
        
        public static UserDto CreateTivaUser(string uniquename, string activityBy, string firstName, string lastName,
            string roleId = "2")
        {
            var user = new UserDto
            {
                UserName = uniquename,
                Password = null,
                RoleList =
                [
                    "User"
                ],
                RefreshToken = null,
                RefreshTokenExpiryTime = null,
                TestAccount = false,
                FirstName = firstName,
                LastName = lastName
            };

            try
            {
                var sqlDal = new DAL("DEFAULT");

                StringBuilder sbSql;

                sbSql = new StringBuilder();
                sbSql.Append(
                    "EXEC admin.AddUser @User, @User_Name, @First_Name, @Last_Name, @Role_ID_List, @Is_Active");
                sqlDal.ClearSqlParameter();
                
                sqlDal.AddSqlParameter("@User", DAL.SQLParameterTypes.STR, activityBy);
                sqlDal.AddSqlParameter("@User_Name", DAL.SQLParameterTypes.STR, uniquename);
                sqlDal.AddSqlParameter("@First_Name", DAL.SQLParameterTypes.STR,
                    firstName == null ? DBNull.Value : firstName);
                sqlDal.AddSqlParameter("@Last_Name", DAL.SQLParameterTypes.STR,
                    lastName == null ? DBNull.Value : lastName);
                sqlDal.AddSqlParameter("@Role_ID_List", DAL.SQLParameterTypes.STR, roleId);
                sqlDal.AddSqlParameter("@Is_Active", DAL.SQLParameterTypes.INT, 1);

                var rdi = sqlDal.RetrieveData(sbSql.ToString());
                return rdi.bSuccess ? user : null;
            }
            catch (Exception ex)
            {
                LogUtil.WriteLog(
                    $"EHR Authentication failed for User {uniquename} as user does not exist in TIVA. Failed to create User:{ex.Message}:{ex.StackTrace}", true, uniquename, true, false);
                return null;
            }
        }
        
        public static string GetUrlBase(string key)
        {
            try
            {
                var sqlDal = new DAL("DEFAULT");

                var sbSql = new StringBuilder();
                sbSql.Append(
                    "EXEC admin.GetApplicationLists @Category, @Section, @Key");
                sqlDal.ClearSqlParameter();
                sqlDal.AddSqlParameter("@Category", DAL.SQLParameterTypes.STR, @"APIEditor");
                sqlDal.AddSqlParameter("@Section", DAL.SQLParameterTypes.STR, @"URLBases");
                sqlDal.AddSqlParameter("@Key", DAL.SQLParameterTypes.STR, key);

                var rdi = sqlDal.RetrieveData(sbSql.ToString());
                
                return rdi.oDT.Rows.Count > 0 ? rdi.oDT.Rows[0]["List_Value"].ToString() : null;
            }
            catch (Exception ex)
            {
                LogUtil.WriteLog(
                    $"GetURLBase Failed for key {key} {ex.Message}:{ex.StackTrace}", true, "API", true, false);
                return null;
            }
        }
    }
}