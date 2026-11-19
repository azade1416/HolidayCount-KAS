using System.Net;
using Xunit;

namespace Backend.Tests;

public class AuthorizationTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public AuthorizationTests(ApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task Request_without_token_returns_401()
    {
        // Act: call a protected endpoint with no Authorization header
        var response = await _client.GetAsync("/api/auth/users");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}