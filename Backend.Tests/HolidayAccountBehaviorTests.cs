using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using LinqToDB;
using LinqToDB.Async;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Backend.Tests;

public class HolidayAccountBehaviorTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    private readonly HttpClient _client;

    public HolidayAccountBehaviorTests(ApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task New_employee_usage_period_ends_on_december_31()
    {
        var adminToken = await GetAdminTokenAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var email = $"period-{Guid.NewGuid():N}@example.com";
        var schedule = Weekdays("08:00", "16:00");

        var response = await _client.PostAsJsonAsync("/api/auth/users", new
        {
            fullName = "Period test employee",
            email,
            password = "test-password",
            role = "employee",
            workSchedule = schedule
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var userId = (await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>())
            .GetProperty("id").GetGuid();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var accounts = await db.HolidayBalances.Where(x => x.UserId == userId).ToListAsync();

        Assert.Equal(2, accounts.Count);
        Assert.All(accounts, account =>
        {
            Assert.Equal(new DateOnly(today.Year + 1, 8, 31), account.EarningPeriodEnd);
            Assert.Equal(new DateOnly(today.Year + 1, 12, 31), account.UsagePeriodEnd);
        });
    }

    [Fact]
    public async Task Schedule_change_preserves_accrued_hours_and_reprices_future_leave()
    {
        var adminToken = await GetAdminTokenAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var periodStart = new DateOnly(today.Year, 9, 1);
        var periodEnd = new DateOnly(today.Year + 1, 8, 31);
        var usageEnd = new DateOnly(today.Year + 1, 12, 31);
        User employee;
        HolidayBalance account;
        string employeeToken;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            employee = new User
            {
                FullName = "Schedule change employee",
                Email = $"schedule-{Guid.NewGuid():N}@example.com",
                PasswordHash = "unused",
                Role = "employee"
            };
            await db.InsertAsync(employee);
            employeeToken = scope.ServiceProvider.GetRequiredService<ITokenService>()
                .GenerateToken(employee);
            account = new HolidayBalance
            {
                UserId = employee.Id,
                AccountType = HolidayAccountType.Weeks1To5,
                EarningYear = today.Year,
                EarningPeriodStart = periodStart,
                EarningPeriodEnd = periodEnd,
                UsagePeriodStart = periodStart,
                UsagePeriodEnd = usageEnd,
                EarnedHours = 40
            };
            await db.InsertAsync(account);
            foreach (var item in Weekdays("08:00", "16:00"))
            {
                await db.InsertAsync(new WorkScheduleEntry
                {
                    UserId = employee.Id,
                    DayOfWeek = item.Key,
                    StartTime = TimeOnly.Parse(item.Value.From),
                    EndTime = TimeOnly.Parse(item.Value.To),
                    EffectiveFrom = today.AddDays(-1)
                });
            }
        }

        var update = await _client.PutAsJsonAsync($"/api/auth/users/{employee.Id}", new
        {
            workSchedule = Weekdays("08:00", "14:00")
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", employeeToken);
        var monday = today.AddDays(((int)DayOfWeek.Monday - (int)today.DayOfWeek + 7) % 7);
        if (monday <= today)
            monday = monday.AddDays(7);
        var requestResponse = await _client.PostAsJsonAsync("/api/leave-requests", new
        {
            accountId = account.Id,
            startDate = monday,
            endDate = monday.AddDays(4),
            requestedDays = 1,
            requestedHours = 1
        });

        Assert.Equal(HttpStatusCode.Created, requestResponse.StatusCode);
        var request = await requestResponse.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.Equal(30m, request.GetProperty("requestedHours").GetDecimal());
        Assert.Equal(5m, request.GetProperty("requestedDays").GetDecimal());
        using var updatedScope = _factory.Services.CreateScope();
        var updatedAccount = await updatedScope.ServiceProvider
            .GetRequiredService<AppDbContext>().HolidayBalances.FirstAsync(x => x.Id == account.Id);
        Assert.True(updatedAccount.EarnedHours >= 40m);

        var outsideUsagePeriod = await _client.PostAsJsonAsync("/api/leave-requests", new
        {
            accountId = account.Id,
            startDate = usageEnd.AddDays(1),
            endDate = usageEnd.AddDays(1),
            requestedDays = 1,
            requestedHours = 1
        });
        Assert.Equal(HttpStatusCode.Conflict, outsideUsagePeriod.StatusCode);
    }

    [Fact]
    public async Task Pending_leave_cannot_make_combined_balance_negative_by_august_31()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var periodStart = new DateOnly(today.Year, 9, 1);
        var earningEnd = new DateOnly(today.Year + 1, 8, 31);
        var usageEnd = new DateOnly(today.Year + 1, 12, 31);
        User employee;
        HolidayBalance[] accounts;
        string employeeToken;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            employee = new User
            {
                FullName = "Debt limit employee",
                Email = $"debt-{Guid.NewGuid():N}@example.com",
                PasswordHash = "unused",
                Role = "employee",
                EmploymentStartDate = earningEnd.AddDays(1)
            };
            await db.InsertAsync(employee);
            employeeToken = scope.ServiceProvider.GetRequiredService<ITokenService>()
                .GenerateToken(employee);
            accounts = new[]
            {
                new HolidayBalance
                {
                    UserId = employee.Id,
                    AccountType = HolidayAccountType.Weeks1To5,
                    EarningYear = today.Year,
                    EarningPeriodStart = periodStart,
                    EarningPeriodEnd = earningEnd,
                    UsagePeriodStart = periodStart,
                    UsagePeriodEnd = usageEnd,
                    EarnedHours = 8
                },
                new HolidayBalance
                {
                    UserId = employee.Id,
                    AccountType = HolidayAccountType.Week6,
                    EarningYear = today.Year,
                    EarningPeriodStart = periodStart,
                    EarningPeriodEnd = earningEnd,
                    UsagePeriodStart = periodStart,
                    UsagePeriodEnd = usageEnd
                }
            };
            foreach (var account in accounts)
                await db.InsertAsync(account);
            foreach (var day in new[]
                     {
                         DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday,
                         DayOfWeek.Thursday, DayOfWeek.Friday
                     })
            {
                await db.InsertAsync(new WorkScheduleEntry
                {
                    UserId = employee.Id,
                    DayOfWeek = day,
                    StartTime = new TimeOnly(8, 0),
                    EndTime = new TimeOnly(16, 0),
                    EffectiveFrom = today
                });
            }
        }

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", employeeToken);
        var monday = today.AddDays(((int)DayOfWeek.Monday - (int)today.DayOfWeek + 7) % 7);
        if (monday <= today)
            monday = monday.AddDays(7);
        var firstRequest = await _client.PostAsJsonAsync("/api/leave-requests", new
        {
            accountId = accounts[0].Id,
            startDate = monday,
            endDate = monday,
            requestedDays = 1,
            requestedHours = 1
        });
        Assert.Equal(HttpStatusCode.Created, firstRequest.StatusCode);

        var secondRequest = await _client.PostAsJsonAsync("/api/leave-requests", new
        {
            accountId = accounts[1].Id,
            startDate = monday.AddDays(1),
            endDate = monday.AddDays(1),
            requestedDays = 1,
            requestedHours = 1
        });
        Assert.Equal(HttpStatusCode.Conflict, secondRequest.StatusCode);
    }

    private static Dictionary<DayOfWeek, DailyScheduleDto> Weekdays(string from, string to)
        => new()
        {
            [DayOfWeek.Monday] = new() { From = from, To = to },
            [DayOfWeek.Tuesday] = new() { From = from, To = to },
            [DayOfWeek.Wednesday] = new() { From = from, To = to },
            [DayOfWeek.Thursday] = new() { From = from, To = to },
            [DayOfWeek.Friday] = new() { From = from, To = to }
        };

    private async Task<string> GetAdminTokenAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var admin = await db.Users.FirstOrDefaultAsync(x => x.Role == "admin");
        if (admin == null)
        {
            admin = new User
            {
                FullName = "Admin",
                Email = $"admin-{Guid.NewGuid():N}@example.com",
                PasswordHash = "unused",
                Role = "admin"
            };
            await db.InsertAsync(admin);
        }

        return scope.ServiceProvider.GetRequiredService<ITokenService>().GenerateToken(admin);
    }
}
