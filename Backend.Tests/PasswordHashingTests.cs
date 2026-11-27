using Xunit;

namespace Backend.Tests;

// Unit tests: how we store passwords (BCrypt), the same calls AuthController uses.
public class PasswordHashingTests
{
    private const string Password = "Correct-Horse-42";

    [Fact]
    public void Hash_does_not_contain_the_password()
    {
        var hash = BCrypt.Net.BCrypt.HashPassword(Password);

        Assert.DoesNotContain(Password, hash);
    }

    [Fact]
    public void Only_the_right_password_matches_the_hash()
    {
        var hash = BCrypt.Net.BCrypt.HashPassword(Password);

        Assert.True(BCrypt.Net.BCrypt.Verify(Password, hash));
        Assert.False(BCrypt.Net.BCrypt.Verify("wrong-password", hash));
    }

    [Fact]
    public void Same_password_gives_different_hashes_because_of_the_salt()
    {
        // A random salt per password: two users with the same password get different hashes.
        var first = BCrypt.Net.BCrypt.HashPassword(Password);
        var second = BCrypt.Net.BCrypt.HashPassword(Password);

        Assert.NotEqual(first, second);
    }
}
