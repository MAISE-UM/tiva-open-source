using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using TIVA_API.Helpers;

namespace TIVA_API.Authentication
{
    // Handles User Validity Related Functions
    public class Repository : IRepository    
    {
        // Set to True when ENV is Development ENV.
        // Allows Test Account Authentication
        public bool DevMode { get; set; }
        
        /**
         * Client Authentication Logic
         */
        // Verifies if User is Valid CST User
        public ClientDto GetClient(Models.Authentication auth)
        {
            // Verifies if User Exists in DB and Whether Account is Test Account
            var user = CheckClientExistsAndRoles(auth.Client_ID);

            return user;
        }
        
        private static ClientDto CheckClientExistsAndRoles(string clientId)
        {
            var sqlDal = new DAL("DEFAULT");
            DAL.RetrieveDataInfo rdi;

            var sbSql = new StringBuilder();
            sbSql.Append("EXEC admin.GetClientDetails @Client_ID");
            
            sqlDal.ClearSqlParameter();
            sqlDal.AddSqlParameter("@Client_ID", DAL.SQLParameterTypes.STR, clientId);
            
            rdi = sqlDal.RetrieveData(sbSql.ToString());
            if (!rdi.bSuccess)
            {
                LogUtil.WriteLog(rdi.sErrorMessage, true, clientId, true, false);
                return null;
            }

            var client = new ClientDto() {Client_ID = clientId};
            
            var roleList = (from DataRow role in rdi.oDT.Rows select role["Role_Name"].ToString()).ToList();

            // Data comes through with as many rows as the client has roles.
            // We need to loop through each row and add the role to the role list.
            // We also need to decrypt the refresh token and expiry time on the first iteration.

            // if (rdi.oDT.Rows.Count <= 0) return null;

            client.ID = int.Parse(rdi.oDT.Rows[0]["ID"].ToString() ?? "-1");
            client.Client_Name = rdi.oDT.Rows[0]["Client_Name"].ToString();
            client.Client_ID = rdi.oDT.Rows[0]["Client_ID"].ToString();
            client.Secret_ID = rdi.oDT.Rows[0]["Secret_ID"].ToString();
            client.RoleList = roleList;

            return client;
        }

        /**
         * User Authentication Logic
         */
        
        public UserDto GetUser(Models.Authentication auth)
        {
            // Verifies if User Exists in DB and Whether Account is Test Account
            var user = CheckUserExistsAndRoles(auth.UserId, auth.Password);
            
            // Only Allow Dev Account to be Valid if DevMode=True
            if (DevMode)
            {
                if (user is { TestAccount: true })
                {
                    return user;
                }
            }
            
            return user is { TestAccount: false } ? user : null;
        }
        
        // Verifies if User Exists in DB and Whether Account is Test Account
        private UserDto CheckUserExistsAndRoles(string userId, string password) {
            var sqlDal = new DAL("DEFAULT");

            // Returns an Error if User does not Exist and Their Roles and Test Account Status if they do
            var sbSql = new StringBuilder();
            sbSql.Append("EXEC admin.GetUserDetails @username");
            
            sqlDal.ClearSqlParameter();
            sqlDal.AddSqlParameter("@username", DAL.SQLParameterTypes.STR, userId);
            
            var rdi = sqlDal.RetrieveData(sbSql.ToString());
            if (!rdi.bSuccess)
            {
                LogUtil.WriteLog($"User {userId} does not exist in TIVA", true, userId, true, false);
                return null;
            }

            var user = new UserDto
            {
                UserName = userId,
                Password = password
            };

            var roleList = new List<string>();
            var testAccount = false;
            
            string firstName = null;
            string lastName = null;

            // Data comes through with as many rows as the client has roles.
            // We need to loop through each row and add the role to the role list.
            // We also need to decrypt the refresh token and expiry time on the first iteration.
            foreach (DataRow role in rdi.oDT.Rows)
            {
                roleList.Add(role["Role_Name"].ToString());
                if (!testAccount) testAccount = (bool) role["Test_account"];
                if (string.IsNullOrEmpty(firstName)) firstName = role["First_Name"].ToString();
                if (string.IsNullOrEmpty(lastName)) lastName = role["Last_Name"].ToString();
            }

            user.FirstName = firstName;
            user.LastName = lastName;
            user.TestAccount = testAccount;
            user.RoleList = roleList;
            return user;
        }
    }
}