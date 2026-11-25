using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Backend.Data;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Backend.Tests;

// Never trust the client: the server calculates holiday hours, not the browser.
public class LeaveRequestInputTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    private readonly HttpClient _client;

    public LeaveRequestInputTests(ApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private int LeaveRequestCount()
    {
        using var scope = _factory.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>().LeaveRequests.Count();
    }

    [Fact]
    public async Task Request_without_account_and_with_client_hours_returns_400_and_saves_nothing()
    {
        // Arrange: a logged-in employee
        var token = await _factory.TokenForNewUser("employee");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var before = LeaveRequestCount();

        // Act: three weeks of holiday, but the client says it costs only 1 hour
        var response = await _client.PostAsJsonAsync("/api/leave-requests", new
        {
            accountId = Guid.Empty,
            startDate = "2027-07-05",
            endDate = "2027-07-23",
            requestedDays = 15,
            requestedHours = 1
        });

        // Assert: rejected, and nothing written to the database
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, LeaveRequestCount());
    }
}
