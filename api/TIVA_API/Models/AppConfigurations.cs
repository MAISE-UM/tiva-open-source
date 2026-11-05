using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using TIVA_API.Helpers;

namespace TIVA_API.Models
{
    public class AppConfigurations
    {
        public int ConfigurationId { get; set; }

        public string ConfigurationName { get; set; }

        public List<AppConfigurationDetails> ConfigurationsDetails { get; private set; }

        //Get Application Configurations
        public ReturnInfo GetApplicationConfigurations()
        {
            var ri = new ReturnInfo();
            try
            {
                var sqlDal = new DAL("DEFAULT");


                var sbSql = new StringBuilder();
                sbSql.Append("EXEC admin.GetApplicationConfigurations @configurationName ");


                sqlDal.ClearSqlParameter();
                sqlDal.AddSqlParameter("@configurationName", DAL.SQLParameterTypes.STR, ConfigurationName);


                var rdi = sqlDal.RetrieveData(sbSql.ToString());

                if (rdi.bSuccess)
                {
                    ri.bSuccess = true;
                    ri.sErrorInfo = "";

                    var dt = rdi.oDT;

                    var lstAcd = (from DataRow dr in dt.Rows select new AppConfigurationDetails {ConfigurationKeyName = GeneralUtil.StringValue(dr["Configuration_Key_Name"]), ConfigurationKeyValue = CipherService.DecryptString(Convert.FromBase64String(GeneralUtil.StringValue(dr["Configuration_Key_Value"])))}).ToList();

                    ConfigurationsDetails = lstAcd;
                    ri.oReturnObject = lstAcd;
                }
                else
                {
                    ri.bSuccess = false;
                    ri.sErrorInfo = rdi.sErrorMessage;
                    return ri;
                }
            }
            catch (Exception ex)
            {
                ri.bSuccess = false;
                ri.sErrorInfo = $"Error in getting application configuration.{ex.Message}{ex.StackTrace}";
            }

            return ri;
        }

        public class AppConfigurationDetails
        {
            public string ConfigurationKeyName { get; init; }

            public string ConfigurationKeyValue { get; init; }
            
        }
    }
}