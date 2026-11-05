$aes = New-Object System.Security.Cryptography.AesCryptoServiceProvider
$aes.GenerateKey()
$key = $aes.Key
$base64Key = [System.Convert]::ToBase64String($key)
$base64Key