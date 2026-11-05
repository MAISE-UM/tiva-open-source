using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TIVA_API.Helpers;

// api schema
[Table("Session", Schema = "api")]
public class Session
{
    [Key]
    public string User { get; set; }
    public string FhirId { get; set; }
    public string FhirAccessToken { get; set; }
    public string FhirRefreshToken { get; set; }
    public string FhirTokenGenTime { get; set; }
    public string ApiAccessToken { get; set; }
    public string ApiRefreshToken { get; set; }
    public string SurgicalLogId { get; set; }
    public string LoginTime { get; set; }
}