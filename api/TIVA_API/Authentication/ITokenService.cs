using System.Security.Claims;

namespace TIVA_API.Authentication
{
    // Interface Allows Dependency Injection in Authentication Controller
    public interface ITokenService
    {
        // Function to Build JWT Token for Clients
        string BuildToken(string key, string issuer, string audience, ClientDto client, string jku);
        // Function to Build JWT Token for Users
        string BuildToken(string key, string issuer, string audience, UserDto client, string jku);
        // Function to Validate JWT Token
        bool ValidateToken(string key, string issuer, string audience, string token);
        // Generates a refresh token for Clients
        string GenerateRefreshToken(string key, string issuer, string audience, ClientDto user, string jku);
        // Generates a refresh token for Users
        string GenerateRefreshToken(string key, string issuer, string audience, UserDto user, string jku);
        // This will read an unverified JWT token and return the claims principal
        ClaimsPrincipal GetPrincipalFromExpiredToken(string token, string privateKey);
    }
}