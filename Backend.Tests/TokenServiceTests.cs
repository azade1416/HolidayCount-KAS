using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.Models;
using Backend.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Backend.Tests;

// Unit tests: only the token logic, no API and no database.
public class TokenServiceTests
{
    private const string Key = "unit-test-signing-key-at-least-32-bytes";
    private const string Issuer = "Backend";
    private const string Audience = "Frontend";

    // GenerateToken does not use the database, so no AppDbContext is needed here.
    private static TokenService CreateService() => new(
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = Key,
            ["Jwt:Issuer"] = Issuer,
            ["Jwt:Audience"] = Audience
        }).Build(),
        null!);

    // Checks the token the same way the API does: signature, issuer and audience.
    private static ClaimsPrincipal Validate(string token, string key) =>
        new JwtSecurityTokenHandler().ValidateToken(token, new TokenValidationParameters
        {
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            ValidIssuer = Issuer,
            ValidAudience = Audience
        }, out _);

    private static readonly User Accountant = new() { Id = Guid.NewGuid(), Role = "accountant" };

    [Fact]
    public void Token_contains_the_user_id_and_role()
    {
        var token = CreateService().GenerateToken(Accountant);

        var principal = Validate(token, Key);

        Assert.Equal(Accountant.Id.ToString(), principal.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        Assert.True(principal.IsInRole("accountant"));
    }

    [Fact]
    public void Token_expires_after_three_hours()
    {
        var token = CreateService().GenerateToken(Accountant);

        var validTo = new JwtSecurityTokenHandler().ReadJwtToken(token).ValidTo;

        // One minute of margin for the time the test takes to run.
        Assert.InRange(validTo, DateTime.UtcNow.AddHours(3).AddMinutes(-1), DateTime.UtcNow.AddHours(3).AddMinutes(1));
    }

    [Fact]
    public void Token_signed_with_our_key_is_rejected_with_another_key()
    {
        var token = CreateService().GenerateToken(Accountant);

        // An attacker without our key cannot make or check a valid signature.
        Assert.ThrowsAny<SecurityTokenException>(
            () => Validate(token, "another-key-that-is-also-32-bytes-long"));
    }
}
