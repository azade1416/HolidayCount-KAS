using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
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

    [Fact]
    public async Task Accountant_can_list_users()
    {
        // Arrange: a logged-in accountant
        var token = await _factory.TokenForNewUser("accountant");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync("/api/auth/users");

        // Assert: allowed role gets the list
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Employee_cannot_read_another_employees_leave_request()
    {
        // Arrange: employee A creates a leave request
        var tokenA = await _factory.TokenForNewUser("employee");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenA);
        var created = await _client.PostAsJsonAsync("/api/leaverequests", new
        {
            accountType = 0, // Weeks1To5
            startDate = "2027-02-01",
            endDate = "2027-02-02",
            requestedDays = 2
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString();

        // Act: employee B asks for A's request by id
        var tokenB = await _factory.TokenForNewUser("employee");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenB);
        var response = await _client.GetAsync($"/api/leaverequests/{id}");

        // Assert: same answer as a request that does not exist
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}