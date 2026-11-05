using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using TIVA_API.Helpers;
using TIVA_API.Models;

namespace TIVA_API.Controllers
{
	/// <summary>
	/// Admin API
	/// </summary>
	[ApiController]
	[Route("Admin/[controller]")]
	public class AdminController(AccessCheckerService accessChecker, EndpointCache endpointCache, SessionCache sCache, IConfiguration _config) : ControllerBase
	{
		// Updates Endpoint Cache with new Definitions from DB
		[HttpPost("/Admin/ReloadEndpoints")]
		public async Task<ActionResult<ReturnInfo>> ReloadEndpoints(Admin admin)
		{
			const string endpoint = "Admin/ReloadEndpoints";
			if (!accessChecker.HasAccess(User, endpoint))
			{
				return Unauthorized();
			}
			var ri = new ReturnInfo();
			try
			{
				// Clear the in-memory endpoint cache, ReloadEndpoints repopulates it from the DB
				await endpointCache.InvalidateCache();

				ri = admin.ReloadEndpoints(endpointCache, sCache, _config["AppSettings:SERVER_IP"]);
			}
			catch (Exception ex)
			{
				ri.bSuccess = false;
				ri.sErrorInfo = ex.Message + ex.StackTrace;
			}

			return ri;
		}

		// Checks if User Exists in LDAP
		[HttpGet("/Admin/GetCurrentEndpoints")]
		public ActionResult<ReturnInfo> TestSerialize()
		{
			const string endpoint = "Admin/GetCurrentEndpoints";
			if (!accessChecker.HasAccess(User, endpoint))
			{
				return Unauthorized();
			}
			var ri = new ReturnInfo();

			try
			{
				ri.bSuccess = true;
				ri.oReturnObject = endpointCache.SerializeCache().Result;
			}
			catch (Exception ex)
			{
				ri.bSuccess = false;
				ri.sErrorInfo = ex.Message + ex.StackTrace;
			}

			return ri;
		}

		[HttpPost("/Admin/EncryptString")]
		public ActionResult<ReturnInfo> EncryptString(string message)
		{
			const string endpoint = "Admin/EncryptString";
			if (!accessChecker.HasAccess(User, endpoint))
			{
				return Unauthorized();
			}
			var ri = new ReturnInfo();
			try
			{
				ri.bSuccess = true;
				ri.oReturnObject = CipherService.EncryptString(message);
			}
			catch (Exception ex)
			{
				ri.bSuccess = false;
				ri.oReturnObject = null;
				ri.sErrorInfo = $"Exception in EncryptString.";
				LogUtil.WriteLog($"Exception in EncryptString. {ex.Message}{ex.StackTrace}", true, "API");
			}

			return ri;
		}

		[HttpPost("/Admin/DecryptString")]
		public ActionResult<ReturnInfo> DecryptString(string encryptedMessage)
		{
			const string endpoint = "Admin/DecryptString";
			if (!accessChecker.HasAccess(User, endpoint))
			{
				return Unauthorized();
			}
			var ri = new ReturnInfo();
			try
			{
				ri.bSuccess = true;
				// encrypted message must be converted from base64 string to byte array in order to be read by the decryptString method
				ri.oReturnObject = CipherService.DecryptString(Convert.FromBase64String(encryptedMessage));
			}
			catch (Exception ex)
			{
				ri.bSuccess = false;
				ri.oReturnObject = null;
				ri.sErrorInfo = $"Exception in DecryptString";
				LogUtil.WriteLog($"Exception in DecryptString. {ex.Message}{ex.StackTrace}", true, "API");
			}

			return ri;
		}

		[HttpGet("/Admin/RestoreSession")]
		[AllowAnonymous]
		public IActionResult RestoreSession(string username)
		{
			// If not .NET CORE development environment return 404 
			if (_config["Environment"] != "Development")
				return NotFound("Not in development environment.");
			var userSession = sCache.GetSessionByUserAsync(username).Result;
			var cookieOptionsHttpOnly = new CookieOptions
			{
				Domain = "localhost",
				Path = "/",
				HttpOnly = true,
				Secure = true,
				SameSite = SameSiteMode.None,
				// Expires = DateTimeOffset.UtcNow.AddMinutes(60) // Set expiration to 7 days from now
			};
			var cookieOptions = new CookieOptions
			{
				Domain = "localhost",
				Path = "/",
				HttpOnly = false,
				Secure = true,
				SameSite = SameSiteMode.None,
				// Expires = DateTimeOffset.UtcNow.AddMinutes(60) // Set expiration to 7 days from now
			};
			if (userSession?.ApiAccessToken == null || userSession.ApiRefreshToken == null || userSession.User == null)
			{
				return NotFound("User not in cache");
			}
			HttpContext.Response.Cookies.Append("X-Access-Token", userSession.ApiAccessToken, cookieOptionsHttpOnly);
			HttpContext.Response.Cookies.Append("X-Refresh-Token", userSession.ApiRefreshToken, cookieOptionsHttpOnly);
			HttpContext.Response.Cookies.Append("X-Username", userSession.User.ToLower(), cookieOptions);
			if (userSession.SurgicalLogId != null)
			{
				HttpContext.Response.Cookies.Append("X-SurgicalID", userSession.SurgicalLogId, cookieOptions);
			}

			// Dev only: back to the local client EHR landing page
			var siteUrl = _config["AppSettings:SITE_URL"]?.Split(",")[0].TrimEnd('/') ?? "http://localhost:3000";
			var launchedRoute = _config[$"{EhrSettings.SectionName}:ClientRoutes:Launched"] ?? new EhrClientRouteSettings().Launched;
			return Redirect($"{siteUrl}/{launchedRoute}");
		}

		[HttpGet("/Admin/GetSession")]
		public IActionResult GetSession(string username)
		{
			// If not .NET CORE development environment return 404 
			if (_config["Environment"] != "Development")
				return NotFound("Not in development environment.");
			var userSession = sCache.GetSessionByUserAsync(username).Result;

			return Ok(userSession);
		}

		[HttpPost("/Admin/SetSession")]
		public IActionResult SetSession(Session session)
		{
			var write = sCache.WriteSessionToCacheAsync(session);
			write.Wait();

			return Ok(session);
		}

		[HttpGet("/Admin/Health")]
		[AllowAnonymous]
		public IActionResult Health()
		{
			return Ok("Healthy");
		}
	}
}