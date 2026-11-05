using Microsoft.AspNetCore.Http;

namespace TIVA_API.Helpers
{
    // Allows Access to AppContext Anywhere in App
    public static class AppContext  
    {  
        private static IHttpContextAccessor _httpContextAccessor;  
  
        public static void Configure(IHttpContextAccessor httpContextAccessor)  
        {  
            _httpContextAccessor = httpContextAccessor;  
        }  
  
        public static HttpContext Current => _httpContextAccessor.HttpContext;  
    }  
}