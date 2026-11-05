using System;
using System.Collections.Generic;
using System.Text;
using log4net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using TIVA_API.Models;

namespace TIVA_API.Helpers
{
    // TODO: Taken from Old API, Remove What is no Longer Needed, Verify it Works
    public static class LogUtil
    {
        private static readonly ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        private static readonly ILog ErrLog = LogManager.GetLogger("Errlog");
        private static readonly AppSettings AppSettings = new();

        //Using Log for Net
        public static void WriteLog(string content, bool bError, string client, bool bLogErrinDB = true, bool bSendEmail = true, string other_info = "",string userID="APIUser")
        {
            Startup.StaticConfiguration.GetSection("AppSettings").Bind(AppSettings);
            try
            {
                if (bError)
                {
                    ErrLog.Error(content);

                    //Write to the DB
                    if (bLogErrinDB)
                    {

                        Error_Log errLog = new Error_Log();
                        errLog.Error_Source = AppContext.Current.Request.Path;
                        errLog.Created_BY = $"{client}:{GeneralUtil.StringValue(userID)}";
                        errLog.Error_Description = content;
                        errLog.other_info = other_info;
                        LogUserError(errLog);
                    }

                    //Send Email
                    if (bSendEmail)
                    {
                        var server_context = AppSettings.SERVER_CONTEXT;
                        var app_name = AppSettings.APP_NAME;
                        SendEmail(AppSettings.ADMIN, "Error in " + app_name + "(" + server_context + ")", content, client);
                    }

                }
                else
                {
                    log.Info(content);
 
                    var activity_details = "";
                    var currContext = AppContext.Current;
                    if (currContext != null)
                    {
                        activity_details = $"{(string)AppContext.Current.Request.Path} {content}";
                    }
                    User_Activity ua = new User_Activity();
                    ua.Client = client;
                    ua.UserName = GeneralUtil.StringValue(userID);
                    ua.Source_IP = GeneralUtil.GetUser_IP();
                    ua.Server_IP = AppSettings.SERVER_IP;
                    ua.Browser_Details = GeneralUtil.GetUser_BrowserDetails();
                    ua.Activity_Type = "TIVA_API";
                    ua.Activity_Details = activity_details;
                    LogUserActivity(ua);


                    if (bSendEmail)
                    {
                        var server_context = AppSettings.SERVER_CONTEXT;
                        var app_name = AppSettings.APP_NAME;
                        SendEmail(AppSettings.ADMIN, "Message from " + app_name + "(" + server_context + ")", content, client);
                    }
                }

            }
            catch (Exception ex)
            {
                log.Error("Exception:" + ex.Message + ex.StackTrace);
            }
        }


        #region "Log Error"
        public struct Error_Log
        {
            public string Error_Source;
            public string Error_Description;
            public string Created_BY;
            public string other_info;

        }

        //Log User Activities
        public static void LogUserError(Error_Log errLog)
        {
            try
            {

                DAL sqDAL = new DAL("DEFAULT");
                DAL.RetrieveDataInfo ri = new DAL.RetrieveDataInfo();

                StringBuilder sbSQL = new StringBuilder();

                sbSQL.Append("EXEC api.SaveErrorLog @User, @ERROR_SOURCE, @ERROR_DESCRIPTION, @OTHER_INFO, @IP_ADDRESS ");

                sqDAL.ClearSqlParameter();
                sqDAL.AddSqlParameter("User", DAL.SQLParameterTypes.STR, errLog.Created_BY);
                sqDAL.AddSqlParameter("ERROR_SOURCE", DAL.SQLParameterTypes.STR, errLog.Error_Source);
                sqDAL.AddSqlParameter("ERROR_DESCRIPTION", DAL.SQLParameterTypes.STR, errLog.Error_Description);
                sqDAL.AddSqlParameter("OTHER_INFO", DAL.SQLParameterTypes.STR, errLog.other_info);
                sqDAL.AddSqlParameter("IP_ADDRESS", DAL.SQLParameterTypes.STR, GeneralUtil.GetUser_IP());


                ri = sqDAL.RetrieveData(sbSQL.ToString());

                if (ri.bSuccess)
                {


                }
                else
                {
                    WriteLog("Error:" + ri.sErrorMessage, true, errLog.Error_Source, false, true);
                }


            }
            catch (Exception ex)
            {
                WriteLog("Exception:" + ex.Message + ex.StackTrace, true, errLog.Error_Source, false, true);
            }
        }
        #endregion

        #region "Log User Activity"
        public struct User_Activity
        {
            public string Client;
            public string UserName;
            public string Source_IP;
            public string Server_IP;
            public string Browser_Details;
            public string Activity_Type;
            public string Activity_Details;
        }

        //Log User Activities
        public static void LogUserActivity(User_Activity usrActivity)
        {
            try
            {

                DAL sqDAL = new DAL("DEFAULT");
                DAL.RetrieveDataInfo ri = new DAL.RetrieveDataInfo();

                StringBuilder sbSQL = new StringBuilder();

                sbSQL.Append("EXEC api.SaveClientLog @User," + 
                    "                              @Activity_Client," +
                    "                              @Activity_Source_IP," +
                    "                              @Activity_Server_IP," +
                    "                              @Activity_Browser_Details," +
                    "                              @Activity_Type," +
                    "                              @Activity_Details" +
                    "");

                sqDAL.ClearSqlParameter();
                sqDAL.AddSqlParameter("User", DAL.SQLParameterTypes.STR, usrActivity.UserName == null ? DBNull.Value : usrActivity.UserName);
                sqDAL.AddSqlParameter("Activity_Client", DAL.SQLParameterTypes.STR, usrActivity.Client);
                sqDAL.AddSqlParameter("Activity_Source_IP", DAL.SQLParameterTypes.STR, usrActivity.Source_IP);
                sqDAL.AddSqlParameter("Activity_Server_IP", DAL.SQLParameterTypes.STR, usrActivity.Server_IP);
                sqDAL.AddSqlParameter("Activity_Browser_Details", DAL.SQLParameterTypes.STR, usrActivity.Browser_Details);
                sqDAL.AddSqlParameter("Activity_Type", DAL.SQLParameterTypes.STR, usrActivity.Activity_Type);
                sqDAL.AddSqlParameter("Activity_Details", DAL.SQLParameterTypes.STR, usrActivity.Activity_Details);


                ri = sqDAL.RetrieveData(sbSQL.ToString());

                if (ri.bSuccess)
                {


                }
                else
                {
                    WriteLog("Error:" + ri.sErrorMessage, true, usrActivity.Client);
                }


            }
            catch (Exception ex)
            {
                WriteLog("Exception:" + ex.Message + ex.StackTrace, true, usrActivity.Client);
            }
        }
        #endregion
        
        #region "Log User Login"
        public struct UserLogin
        {
            public string UserName;
            public string FirstName;
            public string LastName;
            public bool? LoginSuccess;
            public string Source;
            public string SurgicalLog;
            public string MPOGCaseId;
            public string PatientID;
            public string PatientMRN;
        }

        //Log User Activities
        public static void LogUserLogin(UserLogin usrLogin)
        {
            try
            {

                DAL sqDAL = new DAL("DEFAULT");
                DAL.RetrieveDataInfo ri = new DAL.RetrieveDataInfo();

                StringBuilder sbSQL = new StringBuilder();

                sbSQL.Append("EXEC api.Log_Login @User_Name," + 
                    "                            @Login_Success," +
                    "                            @Source," +
                    "                            @Patient_ID," +
                    "                            @Patient_MRN," +
                    "                            @MPOG_Case_ID," +
                    "                            @Surgical_Log_ID," +
                    "                            @Patient_First_Name," +
                    "                            @Patient_Last_Name" +
                    "");

                sqDAL.ClearSqlParameter();
                sqDAL.AddSqlParameter("User_Name", DAL.SQLParameterTypes.STR, usrLogin.UserName);
                sqDAL.AddSqlParameter("Login_Success", DAL.SQLParameterTypes.BOOL, usrLogin.LoginSuccess == null ? DBNull.Value : usrLogin.LoginSuccess);
                sqDAL.AddSqlParameter("Source", DAL.SQLParameterTypes.STR, usrLogin.Source);
                sqDAL.AddSqlParameter("Patient_ID", DAL.SQLParameterTypes.STR, usrLogin.PatientID == null ? DBNull.Value : usrLogin.PatientID);
                sqDAL.AddSqlParameter("Patient_MRN", DAL.SQLParameterTypes.STR, usrLogin.PatientMRN == null ? DBNull.Value : usrLogin.PatientMRN);
                sqDAL.AddSqlParameter("MPOG_Case_ID", DAL.SQLParameterTypes.STR, usrLogin.MPOGCaseId == null ? DBNull.Value : usrLogin.MPOGCaseId);
                sqDAL.AddSqlParameter("Surgical_Log_ID", DAL.SQLParameterTypes.STR, usrLogin.SurgicalLog == null ? DBNull.Value : usrLogin.SurgicalLog);
                sqDAL.AddSqlParameter("Patient_First_Name", DAL.SQLParameterTypes.STR, usrLogin.FirstName == null ? DBNull.Value : usrLogin.FirstName);
                sqDAL.AddSqlParameter("Patient_Last_Name", DAL.SQLParameterTypes.STR, usrLogin.LastName == null ? DBNull.Value : usrLogin.LastName);


                ri = sqDAL.RetrieveData(sbSQL.ToString());

                if (ri.bSuccess)
                {


                }
                else
                {
                    WriteLog("Log Login Error:" + ri.sErrorMessage, true, $"{usrLogin.UserName}|{usrLogin.Source}|{usrLogin.LoginSuccess}");
                }


            }
            catch (Exception ex)
            {
                WriteLog("Log Login Exception:" + ex.Message, true, $"{usrLogin.UserName}|{usrLogin.Source}|{usrLogin.LoginSuccess}");
            }
        }
        #endregion

        #region "SendEmail"
        // SMTP client from the Smtp settings section, null when email is disabled
        private static SmtpClient CreateSmtpClient(out SmtpSettings smtpSettings)
        {
            smtpSettings = Startup.StaticConfiguration.GetSection(SmtpSettings.SectionName).Get<SmtpSettings>()
                           ?? new SmtpSettings();
            if (!smtpSettings.Enabled || string.IsNullOrEmpty(smtpSettings.Host))
            {
                return null;
            }

            var smtp = new SmtpClient(smtpSettings.Host, smtpSettings.Port) { EnableSsl = smtpSettings.UseSsl };
            if (!string.IsNullOrEmpty(smtpSettings.Username))
            {
                smtp.Credentials = new System.Net.NetworkCredential(smtpSettings.Username, smtpSettings.Password);
            }
            return smtp;
        }

        public static void SendEmail(string to_address, string subject, string msg, string client, string userID="APIUser")
        {
            try
            {
                using var smtp = CreateSmtpClient(out var smtpSettings);
                if (smtp == null) return;

                var mail = new MailMessage(smtpSettings.From, to_address);
                mail.Subject = subject;
                mail.Body = msg + ":::UserID:::" + GeneralUtil.StringValue(userID); ;
                mail.BodyEncoding = System.Text.Encoding.UTF8;

                smtp.Send(mail);
            }
            catch (Exception ex)
            {
                //Console.Write("Excetion::" + ex.Message + "\n"); 
                WriteLog("Exception in sending email::" + ex.Message, true, client, true, false);
            }
        }

		public static ReturnInfo SendEmailHelp(string subject, string msg, string client)
		{
			var ri = new ReturnInfo();

			try
			{
				using var smtp = CreateSmtpClient(out var smtpSettings);
				if (smtp == null)
				{
					ri.bSuccess = false;
					ri.sErrorInfo = "Email is not configured";
					return ri;
				}

				List<String> emailList = new List<string>(AppSettings.ADMIN_EMAIL.Split(','));
				MailMessage mail = new MailMessage(smtpSettings.From, emailList[0]);
				mail.Subject = subject;
				mail.Body = msg;
				mail.BodyEncoding = System.Text.Encoding.UTF8;
				mail.IsBodyHtml = true;

				smtp.Send(mail);

				//Console.Write("Message was sent"); 

				ri.bSuccess = true;

			}
			catch (Exception ex)
			{
				//Console.Write("Excetion::" + ex.Message + "\n"); 
				WriteLog("Exception in sending email::" + ex.Message, true, client, true, false);
				ri.bSuccess = false;
			}

			return ri;

		}
		#endregion

    }

}