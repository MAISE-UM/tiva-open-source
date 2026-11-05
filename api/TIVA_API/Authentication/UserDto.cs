using System;
using System.Collections.Generic;

namespace TIVA_API.Authentication
{
    // Defines a User Object
    public class UserDto
    {
        public string UserName { get; set; }
        public string FirstName { get; set; }
        public string LastName {get; set; }
        public string Password { get; set; }
        public List<string> RoleList { get; set; }
        public string RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiryTime { get; set; }

        public bool TestAccount { get; set; }
    }
}