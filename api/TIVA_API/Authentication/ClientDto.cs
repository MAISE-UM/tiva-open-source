using System.Collections.Generic;

namespace TIVA_API.Authentication
{
    // Defines a Client Object
    public class ClientDto
    {
        public int ID { get; set; }
        public string Client_Name{ get; set; }
        
        public List<string> RoleList { get; set; }
        public string Client_ID { get; set; }
        public string Secret_ID { get; set; }
    }
}