namespace TIVA_API.Models
// ReSharper disable all InconsistentNaming

{
    // Standard Return Object of API
    public class ReturnInfo
    {
        public bool bSuccess { get; set; }
        public string sErrorInfo { get; set; }
        public object oReturnObject { get; set; }

        public ReturnInfo() { }
    }
}