using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using TIVA_API.Models;

namespace TIVA_API.Helpers;

public static class CipherService
{
    private static readonly AppSettings AppSettings = new();

    // AES encryption
    public static byte[] EncryptString(string toEncrypt)
    {
        Startup.StaticConfiguration.GetSection("AppSettings").Bind(AppSettings);

        var encryptionKey = Convert.FromBase64String(AppSettings.SECRET_KEY);
        if (string.IsNullOrEmpty(toEncrypt)) throw new ArgumentException("toEncrypt");
        if (encryptionKey == null || encryptionKey.Length == 0) throw new ArgumentException("encryptionKey");
        var toEncryptBytes = Encoding.UTF8.GetBytes(toEncrypt);
        using var provider = Aes.Create();
        provider.Key = encryptionKey;
        provider.Mode = CipherMode.CBC;
        provider.Padding = PaddingMode.PKCS7;
        using var encryptor = provider.CreateEncryptor(provider.Key, provider.IV);
        using var ms = new MemoryStream();
        ms.Write(provider.IV, 0, 16);
        using var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write);
        cs.Write(toEncryptBytes, 0, toEncryptBytes.Length);
        cs.FlushFinalBlock();
        return ms.ToArray();
    }

    // AES Decryption
    public static string DecryptString(byte[] encryptedString)
    {
        Startup.StaticConfiguration.GetSection("AppSettings").Bind(AppSettings);
        var encryptionKey = Convert.FromBase64String(AppSettings.SECRET_KEY);
        using var provider = Aes.Create();
        provider.Key = encryptionKey;
        provider.Mode = CipherMode.CBC;
        provider.Padding = PaddingMode.PKCS7;
        using var ms = new MemoryStream(encryptedString);
        // Read the first 16 bytes which is the IV.
        var iv = new byte[16];
        ms.ReadExactly(iv, 0, 16);
        provider.IV = iv;

        using var decryptor = provider.CreateDecryptor();
        using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
        using var sr = new StreamReader(cs);
        return sr.ReadToEnd();
    }
}