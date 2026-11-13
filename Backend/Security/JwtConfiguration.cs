using System.Text;

namespace Backend.Security;

public static class JwtConfiguration
{
    public static string GetSigningKey(string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("Jwt:Key must be configured.");
        }

        if (Encoding.UTF8.GetByteCount(key) < 32)
        {
            throw new InvalidOperationException("Jwt:Key must contain at least 32 UTF-8 bytes for HS256.");
        }

        return key;
    }
}
