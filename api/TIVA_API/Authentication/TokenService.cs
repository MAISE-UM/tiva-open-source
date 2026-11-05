using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace TIVA_API.Authentication
{
    public class TokenService(IConfiguration config) : ITokenService
    {
        // Valid for 8 Hours
        private const double ExpiryDurationMinutes = 120;
        private const double RefreshExpiryDurationMinutes = 480;

        private const string DefaultKid = "tiva-api-auth";

        // Key ID in the token header, must match the API key published at /.well-known/jwks.json
        public static string GetKid(IConfiguration configuration) =>
            string.IsNullOrEmpty(configuration["JwtAuthentication:Kid"]) ? DefaultKid : configuration["JwtAuthentication:Kid"];

        private string Kid => GetKid(config);

        // Function to Build JWT Token for a Client
        public string BuildToken(string key, string issuer, string audience, ClientDto client, string jku)
        {
            // Setup JWT Claims to be Stored in Token
            var claims = new List<Claim> {    
                new(ClaimTypes.Name, client.Client_ID),
                new(ClaimTypes.NameIdentifier,
                    client.Client_Name),
                new(ClaimTypes.AuthenticationMethod, "CLIENT")
            };
            // Loop Through Client Roles and Add All Applicable Roles
            claims.AddRange(client.RoleList.Select(role => new Claim(ClaimTypes.Role, role)));

            // Generate Token
            var rsa = RSA.Create();
            rsa.ImportFromPem(key);
            var credentials = new SigningCredentials(new RsaSecurityKey(rsa), SecurityAlgorithms.RsaSha384);
            var header = new JwtHeader(credentials)
            {
                // determines what key to use to verify the signature
                ["kid"] = Kid,
                // jku url directs to the public key
                ["jku"] = jku,
                // algorithm used to sign the token is used to verify the signature
                ["alg"] = "RS384"
            };
            var payload = new JwtPayload(issuer, audience, claims, DateTime.Now, DateTime.Now.AddMinutes(ExpiryDurationMinutes));
            var tokenDescriptor = new JwtSecurityToken( header: header, payload: payload);       
            // expires: DateTime.Now.AddDays(1), signingCredentials: credentials);        
            return new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);  
        }
        
        // Function to Build JWT Token for a User
        public string BuildToken(string key, string issuer, string audience, UserDto user, string jku)
        {
            // Setup JWT Claims to be Stored in Token
            var claims = new List<Claim> {    
                new(ClaimTypes.Name, user.UserName),
                new(ClaimTypes.NameIdentifier,
                    Guid.NewGuid().ToString()),
                new(ClaimTypes.GivenName, $"{user.LastName}, {user.FirstName}"),
                new(ClaimTypes.AuthenticationMethod, "USER")
            };
            // Loop Through User Roles and Add All Applicable Roles
            claims.AddRange(user.RoleList.Select(role => new Claim(ClaimTypes.Role, role)));

            // Generate Token
            var rsa = RSA.Create();
            rsa.ImportFromPem(key);
            var credentials = new SigningCredentials(new RsaSecurityKey(rsa), SecurityAlgorithms.RsaSha384);
            var header = new JwtHeader(credentials)
            {
                // determines what key to use to verify the signature
                ["kid"] = Kid,
                // jku url directs to the public key
                ["jku"] = jku,
                // algorithm used to sign the token is used to verify the signature
                ["alg"] = "RS384"
            };
            var payload = new JwtPayload(issuer, audience, claims, DateTime.Now, DateTime.Now.AddMinutes(ExpiryDurationMinutes));
            var tokenDescriptor = new JwtSecurityToken( header: header, payload: payload);       
            // expires: DateTime.Now.AddDays(1), signingCredentials: credentials);        
            return new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);  
        }
        
        // Function to Validate JWT Token
        public bool ValidateToken(string key, string issuer, string audience, string token)
        {
            var rsa = RSA.Create();
            rsa.ImportFromPem(key);
            var tokenHandler = new JwtSecurityTokenHandler(); 
            try 
            {
                tokenHandler.ValidateToken(token, 
                    new TokenValidationParameters   
                    {
                        ValidateIssuerSigningKey = true,
                        ValidateIssuer = true, 
                        ValidateAudience = true,    
                        ValidIssuer = issuer,
                        ValidAudience = audience, 
                        IssuerSigningKey = new RsaSecurityKey(rsa)
                    }, out _);            
            }
            catch
            {
                return false;
            }
            return true;    
        }
        
        
        // Generates a random refresh token to both send to client and store in db for user/client
        public string GenerateRefreshToken(string key, string issuer, string audience, UserDto user, string jku)
        {
            // Setup JWT Claims to be Stored in Token
            var claims = new List<Claim> {    
                new(ClaimTypes.Name, user.UserName),
                new(ClaimTypes.NameIdentifier,
                    Guid.NewGuid().ToString()),
                new(ClaimTypes.GivenName, $"{user.LastName}, {user.FirstName}"),
                new(ClaimTypes.AuthenticationMethod, "USER")
            };
            
            // Generate Token
            var rsa = RSA.Create();
            rsa.ImportFromPem(key);
            var credentials = new SigningCredentials(new RsaSecurityKey(rsa), SecurityAlgorithms.RsaSha384);
            var header = new JwtHeader(credentials)
            {
                // determines what key to use to verify the signature
                ["kid"] = Kid,
                // jku url directs to the public key
                ["jku"] = jku,
                // algorithm used to sign the token is used to verify the signature
                ["alg"] = "RS384"
            };
            var payload = new JwtPayload(issuer, audience, claims, DateTime.Now, DateTime.Now.AddMinutes(RefreshExpiryDurationMinutes));
            var tokenDescriptor = new JwtSecurityToken( header: header, payload: payload);       
            // expires: DateTime.Now.AddDays(1), signingCredentials: credentials);        
            return new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);  
        }
        
        // Generates a random refresh token to both send to client and store in db for user/client
        public string GenerateRefreshToken(string key, string issuer, string audience, ClientDto client, string jku)
        {
            // Setup JWT Claims to be Stored in Token
            var claims = new List<Claim> {    
                new(ClaimTypes.Name, client.Client_ID),
                new(ClaimTypes.NameIdentifier,
                    Guid.NewGuid().ToString()),
                new(ClaimTypes.AuthenticationMethod, "USER")
            };
            
            // Generate Token
            var rsa = RSA.Create();
            rsa.ImportFromPem(key);
            var credentials = new SigningCredentials(new RsaSecurityKey(rsa), SecurityAlgorithms.RsaSha384);
            var header = new JwtHeader(credentials)
            {
                // determines what key to use to verify the signature
                ["kid"] = Kid,
                // jku url directs to the public key
                ["jku"] = jku,
                // algorithm used to sign the token is used to verify the signature
                ["alg"] = "RS384"
            };
            var payload = new JwtPayload(issuer, audience, claims, DateTime.Now, DateTime.Now.AddMinutes(RefreshExpiryDurationMinutes));
            var tokenDescriptor = new JwtSecurityToken( header: header, payload: payload);       
            // expires: DateTime.Now.AddDays(1), signingCredentials: credentials);        
            return new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);  
        }
        
        // Allows reading of JWT tokens that failed validation
        public ClaimsPrincipal GetPrincipalFromExpiredToken(string token, string privateKey)
        {
            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateAudience = false, //you might want to validate the audience and issuer depending on your use case
                ValidateIssuer = false,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(privateKey)),
                ValidateLifetime = false //here we are saying that we don't care about the token's expiration date
            };
            var tokenHandler = new JwtSecurityTokenHandler();
            var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out var securityToken);
            if (securityToken is not JwtSecurityToken jwtSecurityToken || !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                throw new SecurityTokenException("Invalid token");
            return principal;
        }
    }
}