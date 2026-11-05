using System.Linq;
using System.Security.Claims;

namespace TIVA_API.Helpers;

public class AccessCheckerService(EndpointCache endpointCache)
{
    // Check if User Has Role with Access to what they are calling
    public bool HasAccess(ClaimsPrincipal principal, string endpointStr)
    {
        // First pull endpoint data out of the cache
        var (success, value) = endpointCache.TryGetEndpointControllerCache(endpointStr).Result;
        if (!success) return false;
        var (endpointSuccess, endpoint) = endpointCache.TryGetEndpoint(value).Result;
        if (!endpointSuccess) return false;
        // Grab username, will be anonymous is anonymous user called an [AllowAnonymous] endpoint
        var username = principal.Identity is {IsAuthenticated: false} ? "anonymous" : principal.Claims.FirstOrDefault(x => x.Type == ClaimTypes.Name)?.Value;
        
        // See if the roles on the endpoint match the roles principal claims
        if (username == "anonymous" && endpoint.AllowAnonymous) return true;
        return principal.Claims.Any(claim => claim.Type.Contains("claims/role")  && endpoint.RolesWithAccess.Contains(claim.Value));

    }
}