using Backend.Security;
using Xunit;

namespace Backend.Tests;

public class JwtConfigurationTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("                                ")]
    public void GetSigningKey_RejectsMissingOrBlankKey(string? key)
    {
        var exception = Assert.Throws<InvalidOperationException>(
            () => JwtConfiguration.GetSigningKey(key));

        Assert.Contains("Jwt:Key", exception.Message);
    }

    [Theory]
    [InlineData("short-test-key")]
    [InlineData("0123456789012345678901234567890")]
    public void GetSigningKey_RejectsKeyBelow32Utf8Bytes(string key)
    {
        Assert.Throws<InvalidOperationException>(
            () => JwtConfiguration.GetSigningKey(key));
    }

    [Theory]
    [InlineData("01234567890123456789012345678901")]
    [InlineData("0123456789012345678901234567890123456789")]
    [InlineData("éééééééééééééééé")]
    public void GetSigningKey_PreservesKeyWithAtLeast32Utf8Bytes(string key)
    {
        Assert.Equal(key, JwtConfiguration.GetSigningKey(key));
    }
}
