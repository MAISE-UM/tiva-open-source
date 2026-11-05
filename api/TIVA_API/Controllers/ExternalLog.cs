using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TIVA_API.Helpers;
using TIVA_API.Models;
using static TIVA_API.Helpers.LogUtil;

public class LogActivity
{
    public string ageValue { get; set; }
    public string ageUnit { get; set; }
    public string weightValue { get; set; }
    public string weightUnit { get; set; }
    public string heightValue { get; set; }
    public string heightUnit { get; set; }
    public string sex { get; set; }
    public DateTime referenceTime { get; set; }
    public string medTableLog { get; set; }
    public string token { get; set; }
}

public class MedData
{
    public string medName { get; set; }
    public List<object> rows { get; set; }
    public DateTime referenceTime { get; set; }
}


namespace TIVA_API.Controllers
{
    [Route("log/[controller]")]
    [ApiController]
    public class ExternalLog : ControllerBase
    {

        [HttpPost("/log/external")]
        [AllowAnonymous]

        public ActionResult<ReturnInfo> ExternalUserLog([FromBody] JsonElement jsonString)
        {
            var ri = new ReturnInfo();
            var logActivity = System.Text.Json.JsonSerializer.Deserialize<LogActivity>(jsonString.GetRawText());

            // TODO: Write the log into DB
            DAL.UpdateDataInfo ri2 = new DAL.UpdateDataInfo();
            StringBuilder sbSQL = new StringBuilder();
            string error = "";

            try
            {

                DAL sqDAL = new DAL("DEFAULT");
                
                sbSQL.Append("EXEC admin.Log_External_Activity " + 
                 // "@User_ID, " +
                 "@User_Token, " +
                 "@Last_Activity_Comments, " +
                 "@Age_Unit, " +
                 "@Age_Value, " +
                 "@Weight_Unit, " +
                 "@Weight_Value, " +
                 "@Height_Unit, " +
                 "@Height_Value, " +
                 "@Sex, " +
                 "@Reference_Time, " +
                 "@Med_Table_Log"
                 );

                // Add parameters to the SQL command
                // sqDAL.AddSqlParameter("@User_ID", DAL.SQLParameterTypes.STR, logActivity.token);
                sqDAL.AddSqlParameter("@User_Token", DAL.SQLParameterTypes.STR, logActivity.token);
                sqDAL.AddSqlParameter("@Last_Activity_Comments", DAL.SQLParameterTypes.STR, "");
                sqDAL.AddSqlParameter("@Age_Unit", DAL.SQLParameterTypes.STR, logActivity.ageUnit);
                sqDAL.AddSqlParameter("@Age_Value", DAL.SQLParameterTypes.INT, int.Parse(logActivity.ageValue));
                sqDAL.AddSqlParameter("@Weight_Unit", DAL.SQLParameterTypes.STR, logActivity.weightUnit);
                sqDAL.AddSqlParameter("@Weight_Value", DAL.SQLParameterTypes.FLOAT, float.Parse(logActivity.weightValue));
                sqDAL.AddSqlParameter("@Height_Unit", DAL.SQLParameterTypes.STR, logActivity.heightUnit);
                sqDAL.AddSqlParameter("@Height_Value", DAL.SQLParameterTypes.FLOAT, float.Parse(logActivity.heightValue));
                sqDAL.AddSqlParameter("@Sex", DAL.SQLParameterTypes.STR, logActivity.sex);
                sqDAL.AddSqlParameter("@Reference_Time", DAL.SQLParameterTypes.DATETIME, logActivity.referenceTime);
                sqDAL.AddSqlParameter("@Med_Table_Log", DAL.SQLParameterTypes.STR, logActivity.medTableLog); // Stringify the medTableLog
                // sqDAL.AddSqlParameter("@Med_Table_Log", DAL.SQLParameterTypes.STR, JsonConvert.SerializeObject(logActivity.medTableLog).ToString()); // Stringify the medTableLog


                ri2 = sqDAL.UpdateData(sbSQL.ToString());

                if (ri2.bSuccess)
                {


                }
                else
                {
                    WriteLog("External User Activity Log Error:" + ri2.sErrorMessage, true, $"");
                }
            }
            catch (Exception ex)
            {
                error = ex.Message;
                WriteLog("External User Activity Log Exception:" + ex.Message, true, "");
            }

    ri.bSuccess = true;
            object test_object = new { recaptcha_user_response = logActivity.token, medTableLog= logActivity.medTableLog, ri2 = ri2.sErrorMessage, error = error, age = int.Parse(logActivity.ageValue) };
            ri.oReturnObject = test_object;
            return Ok(ri);
        }
    }
}
