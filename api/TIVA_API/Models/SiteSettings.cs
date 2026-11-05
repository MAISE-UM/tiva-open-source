namespace TIVA_API.Models
{
    // Outgoing email (error notifications and help requests). Bound from the "Smtp" section
    public class SmtpSettings
    {
        public const string SectionName = "Smtp";

        public bool Enabled { get; set; } = false;
        public string Host { get; set; } = "";
        public int Port { get; set; } = 25;
        public bool UseSsl { get; set; } = false;
        public string From { get; set; } = "";
        // Leave empty to send without authentication
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
    }

    // LDAP username/password login. Bound from the "Ldap" section
    public class LdapSettings
    {
        public const string SectionName = "Ldap";

        public bool Enabled { get; set; } = false;
        public string Host { get; set; } = "";
        public int Port { get; set; } = 636;
        public bool UseSsl { get; set; } = true;
        // Search base, e.g. dc=example,dc=org
        public string BaseDn { get; set; } = "";
        // Search filter used to find a user, {0} is the username
        public string UserFilter { get; set; } = "(uid={0})";
        // DN used to bind with the user's password, {0} is the username and {1} is BaseDn
        public string BindDnTemplate { get; set; } = "cn={0},ou=people,{1}";
    }
}
