using System.Net;
using System.Net.Http.Headers;
using Xunit;

namespace Backend.Tests;

public class AuthorizationTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    private readonly HttpClient _client;

    public AuthorizationTests(ApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Request_without_token_returns_401()
    {
        // Act: call a protected endpoint with no Authorization header
        var response = await _client.GetAsync("/api/auth/users");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Employee_cannot_list_users()
    {
        // Arrange: a logged-in employee
        var token = await _factory.TokenForNewUser("employee");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync("/api/auth/users");

        // Assert: valid token, wrong role
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}