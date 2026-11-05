using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using TIVA_API.Helpers;
using TIVA_API.Models;
using System.Net.Http;
using System.Threading.Tasks;
using static TIVA_API.Helpers.LogUtil;


namespace TIVA_API.Controllers
{
    [Route("recaptcha/[controller]")]
    [ApiController]
    public class Recaptcha : ControllerBase
    {
        private static readonly HttpClient client = new HttpClient();
        private readonly IConfiguration _config;

        public Recaptcha(IConfiguration config)
        {
            _config = config;
        }

        [HttpPost("/recaptcha/verify")]
        [AllowAnonymous]
        public async Task<IActionResult> RecaptchaVerification([FromBody] JsonElement jsonString)
        {
            var ri = new ReturnInfo();
            var secret = _config["AppSettings:RECAPTCHA_SECRET_KEY"];
            if (string.IsNullOrEmpty(secret))
            {
                WriteLog("AppSettings:RECAPTCHA_SECRET_KEY is not configured", true, "");
                ri.bSuccess = false;
                ri.sErrorInfo = "Google Recaptcha is not configured";
                return Ok(ri);
            }
            // extract the recaptcha response from user
            var json = (JObject)JsonConvert.DeserializeObject(jsonString.GetRawText());
            string recaptcha_user_response = json["key"].ToString();
            var postData = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("secret", secret),
                new KeyValuePair<string, string>("response", recaptcha_user_response),
            });


            HttpResponseMessage response = await client.PostAsync("https://www.google.com/recaptcha/api/siteverify", postData);
            string jsonStringResponse = await response.Content.ReadAsStringAsync();

            // response from google
            var jsonResponse = (JObject)JsonConvert.DeserializeObject(jsonStringResponse);
            bool success = (bool)jsonResponse["success"];
            string challengeTs = jsonResponse["challenge_ts"]?.ToString();
            string hostname = jsonResponse["hostname"]?.ToString();

            var location = json["location"]?.ToObject<Dictionary<string, object>>();
            var ip = json["ip"]?.ToString() ?? string.Empty;

            if (success)
            {

                var ri3 = new ReturnInfo();

                DAL.UpdateDataInfo ri2 = new DAL.UpdateDataInfo();
                StringBuilder sbSQL = new StringBuilder();
                string error = "";

                try
                {

                    DAL sqDAL = new DAL("DEFAULT");

                    string IP_location = $"{location["country"]}, {location["region"]}, {location["city"]}";

                    sbSQL.Append("EXEC admin.Log_External_User " +
                     // "@User_ID, " +
                     "@User_Token, " +
                     "@IP_Adress, " +
                     "@IP_Location"
                     );

                    // Add parameters to the SQL command
                    // sqDAL.AddSqlParameter("@User_ID", DAL.SQLParameterTypes.STR, logActivity.token);
                    sqDAL.AddSqlParameter("@User_Token", DAL.SQLParameterTypes.STR, recaptcha_user_response);
                    sqDAL.AddSqlParameter("@IP_Adress", DAL.SQLParameterTypes.STR, IP_location);
                    sqDAL.AddSqlParameter("@IP_Location", DAL.SQLParameterTypes.STR, ip.ToString());


                    ri2 = sqDAL.UpdateData(sbSQL.ToString());

                    if (ri2.bSuccess)
                    {


                    }
                    else
                    {
                        WriteLog("External User Log Error:" + ri2.sErrorMessage, true, $"");
                    }
                }
                catch (Exception ex)
                {
                    error = ex.Message;
                    ri2.sErrorMessage = error;
                    WriteLog("External User Log Exception:" + ex.Message, true, "");
                }


                ri.bSuccess = true;
                object test_object = new { input = json["key"].ToString(), success = success, challengeTs = challengeTs, hostname = hostname, ipAddress = ip, ipLocation = location, error = ri2.sErrorMessage };
                ri.oReturnObject = test_object;
                return Ok(ri);
            }
            ri.bSuccess = false;
            ri.sErrorInfo = "Google Recaptcha Verification Failed";
            return Ok(ri);

        }
    }
}
