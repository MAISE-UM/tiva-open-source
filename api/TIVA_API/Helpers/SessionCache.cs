using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;

namespace TIVA_API.Helpers;

public class SessionCache(IDistributedCache cache)
{
    private const string FhirMetadataCacheKey = $"FHIR_METADATA";
    private const string FhirAccessTokenCacheKey = $"FHIR_TOKEN";

    public async Task setFhirMetadata(string metadata)
    {
        var options = new DistributedCacheEntryOptions
        {
            // AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30),
            SlidingExpiration = TimeSpan.FromMinutes(60)
        };
        await cache.SetStringAsync(FhirMetadataCacheKey, metadata, options);
    }
    
    public async Task<string> getFhirMetadata()
    {
        return await cache.GetStringAsync(FhirMetadataCacheKey);
    }

    public async Task SetStateMetadata(string state, string surgicalLogId)
    {
        var options = new DistributedCacheEntryOptions
        {
            SlidingExpiration = TimeSpan.FromMinutes(10)
        };
        await cache.SetStringAsync(state, surgicalLogId, options);
    }
    
    public async Task<string> GetStateMetadata(string state)
    {
        return await cache.GetStringAsync(state);
    }
    
    public async Task<Session> GetSessionByUserAsync(string user)
    {
        var cacheKey = $"Session_{user.ToLower()}";
        var cachedValue = await cache.GetStringAsync(cacheKey);

        if (cachedValue != null)
        {
            try
            {
                // Session is Decrypted
                var decryptedValue = CipherService.DecryptString(Convert.FromBase64String(cachedValue));
                return JsonSerializer.Deserialize<Session>(decryptedValue);
            }
            catch (Exception)
            {
                await cache.RemoveAsync(cacheKey);
            }
        }

        return null;
    }
    
    public async Task WriteSessionToCacheAsync(Session session)
    {
        try
        {
            // Session is Encrypted and Base64 Encoded
            var cacheKey = $"Session_{session.User.ToLower()}";
            var sessionJson = JsonSerializer.Serialize(session);
            var encryptedSession = Convert.ToBase64String(CipherService.EncryptString(sessionJson));

            var options = new DistributedCacheEntryOptions
            {
                SlidingExpiration = TimeSpan.FromMinutes(60),
            };

            if(!string.IsNullOrEmpty(encryptedSession)) {
                await cache.SetStringAsync(cacheKey, encryptedSession, options);
            }
        }
        catch (Exception ex)
        {
            // Handle caching error (log, throw, etc.)
            Console.WriteLine($"Error writing product to cache: {ex.Message}");
        }
    }
    
    public async Task SetApiCacheState(string api, DateTime date)
    {
        // Get Current Date 
        var options = new DistributedCacheEntryOptions
        {
            SlidingExpiration = TimeSpan.FromMinutes(120)
        };
        // format date as string yyyy-mm-dd hh:mm
        var dateStr = date.ToString("yyyy-MM-dd HH:mm");
        await cache.SetStringAsync($"APILoadTime-{api}", dateStr, options);
    }
    
    public async Task<DateTime> GetApiCacheState(string api)
    {
        // parse date string yyyy-mm-dd to DateTime
        var dateStr = await cache.GetStringAsync($"APILoadTime-{api}");
        // Parse date string to DateTime when string in form yyyy-mm-dd hh:mm
        if(dateStr == null) return DateTime.MinValue;
        try {
            return DateTime.Parse(dateStr);
        } catch (Exception) {
            return DateTime.MinValue;
        }
    }
    
    public async Task SetFhirToken(string token)
    {
        var options = new DistributedCacheEntryOptions
        {
            // AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30),
            SlidingExpiration = TimeSpan.FromMinutes(60)
        };
        await cache.SetStringAsync(FhirAccessTokenCacheKey, token, options);
    }
    
    public async Task<string> GetFhirToken()
    {
        return await cache.GetStringAsync(FhirAccessTokenCacheKey);
    }
    
    public async Task<string> GetCacheItem(string key)
    {
        return await cache.GetStringAsync(key);
    }
    
    public async Task SetCacheItem(string key, string value)
    {
        var options = new DistributedCacheEntryOptions
        {
            // AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30),
            SlidingExpiration = TimeSpan.FromMinutes(60)
        };
        await cache.SetStringAsync(key, value, options);
    }
}