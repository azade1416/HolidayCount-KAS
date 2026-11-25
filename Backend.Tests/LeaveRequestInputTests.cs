using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Backend.Data;
using Backend.Models;
using Backend.Services;
using LinqToDB;
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

    [Fact]
    public async Task Request_days_are_counted_using_employee_schedule()
    {
        Guid userId;
        var periodStart = new DateOnly(2027, 1, 1);
        var periodEnd = new DateOnly(2027, 12, 31);
        HolidayBalance account;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = new User
            {
                FullName = "Scheduled employee",
                Email = $"scheduled-{Guid.NewGuid():N}@example.com",
                PasswordHash = "unused",
                Role = "employee"
            };
            await db.InsertAsync(user);
            userId = user.Id;
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                scope.ServiceProvider.GetRequiredService<ITokenService>().GenerateToken(user));

            account = new HolidayBalance
            {
                UserId = userId,
                AccountType = HolidayAccountType.Weeks1To5,
                EarningYear = 2027,
                EarningPeriodStart = periodStart,
                EarningPeriodEnd = periodEnd,
                UsagePeriodStart = periodStart,
                UsagePeriodEnd = periodEnd
            };
            await db.InsertAsync(account);
            foreach (var day in new[]
                     {
                         DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                         DayOfWeek.Thursday, DayOfWeek.Friday
                     })
            {
                await db.InsertAsync(new WorkScheduleEntry
                {
                    UserId = userId,
                    DayOfWeek = day,
                    StartTime = new TimeOnly(8, 0),
                    EndTime = new TimeOnly(16, 0),
                    EffectiveFrom = periodStart
                });
            }
        }

        var response = await _client.PostAsJsonAsync("/api/leave-requests", new
        {
            accountId = account.Id,
            startDate = "2027-07-05",
            endDate = "2027-07-07",
            requestedDays = 1,
            requestedHours = 1
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var request = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.Equal(24m, request.GetProperty("requestedHours").GetDecimal());
        Assert.Equal(3m, request.GetProperty("requestedDays").GetDecimal());
    }
}
