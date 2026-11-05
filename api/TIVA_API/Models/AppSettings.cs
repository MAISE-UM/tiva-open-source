namespace TIVA_API.Models
{
    public class AppSettings
        // ReSharper disable all InconsistentNaming
    {
        public string SERVER_IP { get; set; }
        public string SERVER_CONTEXT { get; set; }
        public string SQL_TIMEOUT { get; set; }
        public string APP_NAME { get; set; }
        public string ADMIN { get; set; }
        public string ADMIN_EMAIL { get; set; }
        public string SECRET_KEY { get; set; }
        public string DEBUG { get; set; }
        public string SITE_URL { get; set; }
        public string COOKIE_DOMAIN { get; set; }
        public string RECAPTCHA_SECRET_KEY { get; set; }
    }
}