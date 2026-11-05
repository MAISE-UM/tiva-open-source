using System;
using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Novell.Directory.Ldap;
using TIVA_API.Authentication;
using TIVA_API.Helpers;

namespace TIVA_API.Models
{
	public class Authentication(string client_id, string secret_id, string password, string userId, string ehr_Token)
	{

		// LDAP Configuration from the Ldap settings section
		private static LdapSettings Ldap =>
			Startup.StaticConfiguration.GetSection(LdapSettings.SectionName).Get<LdapSettings>() ?? new LdapSettings();

		// Auth Model Variables
		public string Client_ID { get; set; } = client_id;
		public string Secret_ID { get; set; } = secret_id;
		public string UserId { get; set; } = userId;
		public string Password { get; set; } = password;
		// id_token returned by the EHR token endpoint
		public string Ehr_Token { get; set; } = ehr_Token;
		public string First_Name { get; set; }
		public string Last_Name { get; set; }

		// Attempts to Authenticate User 
		public ReturnInfo AuthenticateClient(ClientDto client)
		{
			var ri = new ReturnInfo();
			try
			{
				if (Client_ID == "")
				{
					ri.bSuccess = false;
					ri.sErrorInfo = "Client_ID is required.";
				}

				if (Secret_ID == "")
				{
					ri.bSuccess = false;
					ri.sErrorInfo = "Secret_ID is required.";
				}

				if (Secret_ID == CipherService.DecryptString(Convert.FromBase64String(client.Secret_ID)))
				{
					// Empty String Result Means Success
					ri.bSuccess = true;
				}
				else
				{
					// Non-Empty String Result Means Error
					ri.bSuccess = false;
					ri.sErrorInfo = "Client Secret Authentication Failed";
				}
			}
			catch (Exception ex)
			{
				//LogUtil.WriteLog("Exception in Authenticate[Client/Secret]:" + Client_ID + ":" + ex.Message + ex.StackTrace, true, true, false, GeneralUtil.Encrypt(password));

				ri.bSuccess = false;
				ri.sErrorInfo = "Exception in Authenticate[Client/Secret]:" + Client_ID + ":" + ex.Message + ex.StackTrace;
			}
			return ri;
		}

		// Helper Function - Checks User Credentials Against LDAP
		private async Task<string> AsyncCheckAuthenticate()
		{
			try
			{
				var ldap = Ldap;
				if (!ldap.Enabled)
				{
					return "LDAP login is not enabled";
				}

				// Tries to Bind with LDAP if Successful Credentials are Correct
				var conn = new LdapConnection();
				conn.SecureSocketLayer = ldap.UseSsl;
				await conn.ConnectAsync(ldap.Host, ldap.Port);
				await conn.BindAsync(string.Format(ldap.BindDnTemplate, UserId, ldap.BaseDn), Password);
				return "";
			}
			catch (LdapException e)
			{
				return $"Exception in Authenticate[LDAP]: {e.LdapErrorMessage}";
			}
			catch (Exception e)
			{
				return $"Exception in Authenticate[LDAP]: {e.Message}";
			}
		}

		//  Helper Function - Checks if User Exists in LDAP Using Search
		private async Task<LdapEntry> AsyncCheckUserExists()
		{
			try
			{
				var ldap = Ldap;
				if (!ldap.Enabled)
				{
					return null;
				}

				// Does Anonymous Bind then Search for Uniquename
				var conn = new LdapConnection();
				conn.SecureSocketLayer = ldap.UseSsl;
				await conn.ConnectAsync(ldap.Host, ldap.Port);
				await conn.BindAsync(ldap.BaseDn, "");
				var lsc = await conn.SearchAsync(ldap.BaseDn, LdapConnection.ScopeSub,
					string.Format(ldap.UserFilter, UserId), null, false);
				var entry = await lsc.NextAsync();
				return entry;
			}
			catch
			{
				return null;
			}
		}

		// Attempts to Authenticate User 
		public ReturnInfo AuthenticateUser()
		{
			var ri = new ReturnInfo();
			try
			{
				if (UserId == "")
				{
					ri.bSuccess = false;
					ri.sErrorInfo = "Bad Username! Username is required.";
				}

				if (Password == "")
				{
					ri.bSuccess = false;
					ri.sErrorInfo = "Bad Password! Password is required.";
				}

				// Does Async LDAP Check and Waits for Result
				var authenticationTask = AsyncCheckAuthenticate();
				authenticationTask.Wait();

				if (authenticationTask.Result.Equals(""))
				{
					// Empty String Result Means Success
					ri.bSuccess = true;
				}
				else
				{
					// Non-Empty String Result Means Error
					ri.bSuccess = false;
					ri.sErrorInfo = $"{authenticationTask.Result}";
				}
			}
			catch (Exception ex)
			{
				// Severe Error
				//LogUtil.WriteLog("Exception in Authenticate[LDAP]:" + userID + ":" + ex.Message + ex.StackTrace, true, true, false, GeneralUtil.Encrypt(password));

				ri.bSuccess = false;
				ri.sErrorInfo = $"Exception in Authenticate[LDAP]:{UserId}:{ex.Message}{ex.StackTrace}";
			}
			return ri;
		}

		// Checks if a User Exists and if so Returns Their Information
		public ReturnInfo UserExists()
		{
			var ri = new ReturnInfo();
			try
			{
				if (UserId == "")
				{
					ri.bSuccess = false;
					ri.sErrorInfo = "Bad Username! Username is required.";
				}

				// Does Async LDAP Check and Waits for Result
				var authenticationTask = AsyncCheckUserExists();
				authenticationTask.Wait();

				if (authenticationTask.Result != null)
				{
					// Non-Null Result Means Success
					ri.bSuccess = true;
					ri.oReturnObject = authenticationTask.Result;
				}
				else
				{
					// Null Result Means Failure
					ri.bSuccess = false;
					ri.sErrorInfo = "User was not found in LDAP.";
				}
			}
			catch (Exception ex)
			{
				// Severe Error
				//LogUtil.WriteLog("Exception in Authenticate[LDAP]:" + userID + ":" + ex.Message + ex.StackTrace, true, true, false, GeneralUtil.Encrypt(password));

				ri.bSuccess = false;
				ri.sErrorInfo = $"Exception in Authenticate[LDAP]:{UserId}:{ex.Message}{ex.StackTrace}";
			}
			return ri;
		}

		private static async Task<JsonWebKeySet> FetchJwksAsync(string jwksUrl)
		{
			using var httpClient = new HttpClient();
			var response = await httpClient.GetAsync(jwksUrl);
			if (!response.IsSuccessStatusCode)
			{
				throw new Exception("Failed to fetch JWKS from the provided URL.");
			}

			var jwksJson = await response.Content.ReadAsStringAsync();
			return new JsonWebKeySet(jwksJson);
		}

		// Validates the EHR id_token signature, issuer and audience. Claims are only returned when valid
		public async Task<ReturnInfo> AuthenticateEhrIdTokenAsync(string jwksUrl, string issuer, string audience)
		{
			var ri = new ReturnInfo();
			var jwtToken = Ehr_Token;

			// Fetch JWKS from the JWKS URL
			JsonWebKeySet jwks = await FetchJwksAsync(jwksUrl);

			// Verify the JWT token
			var tokenHandler = new JwtSecurityTokenHandler();
			try
			{
				// Create token validation parameters
				var validationParameters = new TokenValidationParameters
				{
					ValidIssuer = issuer,
					ValidAudience = audience,
					IssuerSigningKeys = jwks.Keys,
					ValidateIssuerSigningKey = true,
					ValidateIssuer = true,
					ValidateAudience = true
				};

				var claimsPrincipal =
					tokenHandler.ValidateToken(jwtToken, validationParameters, out _);

				ri.bSuccess = true;
				ri.oReturnObject = claimsPrincipal.Claims;
				return ri;
			}
			catch (Exception ex) when (ex is SecurityTokenException or ArgumentException)
			{
				// Unverified claims are never returned
				ri.bSuccess = false;
				ri.oReturnObject = null;
				ri.sErrorInfo = "JWT token validation failed: " + ex.Message;
				return ri;
			}
		}
	}

	public class RefreshToken
	{
		public string refreshToken { get; set; }

		public RefreshToken(string refreshToken)
		{
			this.refreshToken = refreshToken;
		}
	}
}