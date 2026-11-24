using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Backend.Data;
using Backend.Models;
using Backend.Services;
using LinqToDB;
using LinqToDB.Async;
using LinqToDB.Data;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Backend.Tests;

public class HolidayRulesTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    private readonly HttpClient _client;

    public HolidayRulesTests(ApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Admin_can_save_and_list_presets_and_future_rules()
    {
        var token = await _factory.TokenForNewUser("admin");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var presetName = $"Test preset {Guid.NewGuid():N}";
        var settings = new
        {
            weeks1To5HoursPerYear = 185m,
            week6HoursPerYear = 37m,
            mainHolidayNoticeMonths = 3m,
            otherHolidayNoticeMonths = 1m
        };

        var createdPreset = await _client.PostAsJsonAsync("/api/rule-presets", new { name = presetName, settings });
        Assert.Equal(HttpStatusCode.Created, createdPreset.StatusCode);
        var firstPresetId = (await createdPreset.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("id").GetGuid();

        var secondPreset = await _client.PostAsJsonAsync("/api/rule-presets", new { name = presetName, settings });
        Assert.Equal(HttpStatusCode.Created, secondPreset.StatusCode);
        var secondPresetJson = await secondPreset.Content.ReadFromJsonAsync<JsonElement>();
        Assert.NotEqual(firstPresetId, secondPresetJson.GetProperty("id").GetGuid());
        Assert.Equal(185m, secondPresetJson.GetProperty("settings")
            .GetProperty("weeks1To5HoursPerYear").GetDecimal());

        var presets = await _client.GetFromJsonAsync<JsonElement[]>("/api/rule-presets");
        Assert.Equal(2, presets!.Count(item => item.GetProperty("name").GetString() == presetName));

        var effectiveFrom = new DateOnly(2100, 1, 1);
        var createdRules = await _client.PostAsJsonAsync("/api/system-parameters", new { effectiveFrom, settings });
        Assert.Equal(HttpStatusCode.Created, createdRules.StatusCode);

        var history = await _client.GetFromJsonAsync<JsonElement[]>("/api/system-parameters");
        Assert.Contains(history!, item =>
            item.GetProperty("key").GetString() == "weeks1To5HoursPerYear"
            && item.GetProperty("effectiveFrom").GetString() == effectiveFrom.ToString("yyyy-MM-dd")
            && item.GetProperty("value").GetDecimal() == 185m);
    }

    [Fact]
    public async Task Schema_upgrade_preserves_preset_and_system_parameter_values()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await db.ExecuteAsync(@"DROP TABLE ""RulePresets"";");
        await db.ExecuteAsync(@"DROP TABLE ""SystemParameters"";");
        await db.ExecuteAsync(@"CREATE TABLE ""SystemParameters"" (
            ""Id"" uuid PRIMARY KEY, ""Key"" varchar(100) NOT NULL,
            ""NumericValue"" numeric(14,4) NULL, ""TextValue"" text NULL, ""BooleanValue"" boolean NULL,
            ""EffectiveFrom"" date NOT NULL, ""EffectiveTo"" date NULL, ""Description"" text NULL,
            CONSTRAINT ""SystemParameters_Key_EffectiveFrom_key"" UNIQUE (""Key"", ""EffectiveFrom""));");
        await db.ExecuteAsync(@"INSERT INTO ""SystemParameters""
            (""Id"", ""Key"", ""NumericValue"", ""EffectiveFrom"")
            VALUES ('10000000-0000-0000-0000-000000000001', 'weeks1To5DaysPerMonth', 2.0833, '2000-01-01');");
        await db.ExecuteAsync(@"INSERT INTO ""SystemParameters""
            (""Id"", ""Key"", ""BooleanValue"", ""EffectiveFrom"")
            VALUES ('10000000-0000-0000-0000-000000000002', 'transfersEnabled', true, '2000-01-01');");
        await db.ExecuteAsync(@"CREATE TABLE ""RulePresets"" (
            ""Id"" uuid PRIMARY KEY, ""Code"" varchar(100) NOT NULL UNIQUE, ""Name"" varchar(200) NOT NULL,
            ""SettingsJson"" text NOT NULL DEFAULT '{}', ""Version"" integer NOT NULL DEFAULT 1,
            ""PreviousVersionId"" uuid NULL, ""Weeks1To5HoursPerYear"" numeric(10,2) NOT NULL DEFAULT 185,
            ""Week6HoursPerYear"" numeric(10,2) NOT NULL DEFAULT 37,
            ""MainHolidayNoticeMonths"" numeric(5,2) NOT NULL DEFAULT 3,
            ""OtherHolidayNoticeMonths"" numeric(5,2) NOT NULL DEFAULT 1,
            ""AccrualRatePerMonth"" numeric(8,4) NOT NULL, ""Weeks1To5Enabled"" boolean NOT NULL,
            ""Week6Enabled"" boolean NOT NULL, ""EffectiveFrom"" date NOT NULL, ""EffectiveTo"" date NULL,
            ""IsActive"" boolean NOT NULL, ""CreatedAtUtc"" timestamp with time zone NOT NULL,
            ""CreatedByUserId"" uuid NULL);");
        await db.ExecuteAsync(@"INSERT INTO ""RulePresets""
            (""Id"", ""Code"", ""Name"", ""SettingsJson"", ""AccrualRatePerMonth"",
             ""Weeks1To5Enabled"", ""Week6Enabled"", ""EffectiveFrom"", ""IsActive"", ""CreatedAtUtc"")
            VALUES ('20000000-0000-0000-0000-000000000001', 'legacy', 'Legacy preset',
                '{""weeks1To5HoursPerYear"":185,""week6HoursPerYear"":37,""mainHolidayNoticeMonths"":3,""otherHolidayNoticeMonths"":1}',
                2.08, true, true, '2000-01-01', true, now());");

        await db.EnsureSchemaAsync();
        await db.EnsureDefaultRuleSettingsAsync();

        var migratedHours = await db.SystemParameters.FirstAsync(x => x.Key == "weeks1To5HoursPerYear");
        using var hoursJson = JsonDocument.Parse(migratedHours.Value);
        Assert.InRange(hoursJson.RootElement.GetDecimal(), 184.9m, 185.1m);
        var migratedTransferSetting = await db.SystemParameters.FirstAsync(x => x.Key == "transfersEnabled");
        Assert.Equal("true", migratedTransferSetting.Value);

        var migratedPreset = await db.RulePresets.FirstAsync(x => x.Name == "Legacy preset");
        using var presetJson = JsonDocument.Parse(migratedPreset.Settings);
        Assert.Equal(185m, presetJson.RootElement.GetProperty("weeks1To5HoursPerYear").GetDecimal());
    }

    [Fact]
    public async Task Holiday_balances_accrue_idempotently_using_schedule_hours()
    {
        var (user, token, accounts) = await CreateEmployeeAsync(accrualPeriodStartsTwoMonthsAgo: true);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var firstResponse = await _client.GetAsync($"/api/employees/{user.Id}/holiday-accounts");
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        var first = await firstResponse.Content.ReadFromJsonAsync<JsonElement[]>();
        var weeks1To5 = Assert.Single(first!, item => item.GetProperty("name").GetString() == "Weeks 1–5");
        var week6 = Assert.Single(first!, item => item.GetProperty("name").GetString() == "Week 6");
        var expectedMonths = 3;
        Assert.Equal(50.01m, weeks1To5.GetProperty("accrued").GetProperty("hours").GetDecimal());
        Assert.Equal(9.99m, week6.GetProperty("accrued").GetProperty("hours").GetDecimal());

        await _client.GetAsync($"/api/employees/{user.Id}/holiday-accounts");
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var monthlyCount = await db.MonthlyAccruals
            .Where(x => x.HolidayBalanceId == accounts[0].Id || x.HolidayBalanceId == accounts[1].Id)
            .CountAsync();
        Assert.Equal(expectedMonths * 2, monthlyCount);
    }

    [Fact]
    public async Task Pending_holiday_requests_share_one_week_of_debt_across_both_accounts()
    {
        var (_, token, accounts) = await CreateEmployeeAsync(accrualPeriodStartsTwoMonthsAgo: false);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var nextMonth = new DateOnly(today.Year, today.Month, 1).AddMonths(1);
        var firstMonday = nextMonth.AddDays(((int)DayOfWeek.Monday - (int)nextMonth.DayOfWeek + 7) % 7);
        var firstWeek = await _client.PostAsJsonAsync("/api/leave-requests", new
        {
            accountId = accounts[0].Id,
            startDate = firstMonday,
            endDate = firstMonday.AddDays(4),
            requestedDays = 1,
            requestedHours = 0
        });
        Assert.Equal(HttpStatusCode.Created, firstWeek.StatusCode);

        var secondRequest = await _client.PostAsJsonAsync("/api/leave-requests", new
        {
            accountId = accounts[1].Id,
            startDate = firstMonday.AddDays(7),
            endDate = firstMonday.AddDays(7),
            requestedDays = 1,
            requestedHours = 0
        });
        Assert.Equal(HttpStatusCode.Conflict, secondRequest.StatusCode);
    }

    [Fact]
    public async Task Future_balance_ignores_pending_leave_but_subtracts_approved_leave()
    {
        var (_, token, accounts) = await CreateEmployeeAsync(accrualPeriodStartsTwoMonthsAgo: true);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var date = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(14);
        while (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
            date = date.AddDays(1);

        var created = await _client.PostAsJsonAsync("/api/leave-requests", new
        {
            accountId = accounts[0].Id,
            startDate = date,
            endDate = date,
            requestedDays = 1,
            requestedHours = 0
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var requestId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var beforeApproval = await GetFutureRemainingAsync(date, "Weeks 1–5");
        var reviewerToken = await _factory.TokenForNewUser("accountant");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", reviewerToken);
        var approval = await _client.PostAsync($"/api/leave-requests/{requestId}/approve", null);
        Assert.Equal(HttpStatusCode.OK, approval.StatusCode);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var afterApproval = await GetFutureRemainingAsync(date, "Weeks 1–5");
        Assert.Equal(8m, beforeApproval - afterApproval);
    }

    private async Task<decimal> GetFutureRemainingAsync(DateOnly date, string accountName)
    {
        var response = await _client.GetAsync($"/api/holiday-accounts/future-balance?date={date:yyyy-MM-dd}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var accounts = await response.Content.ReadFromJsonAsync<JsonElement[]>();
        return Assert.Single(accounts!, item => item.GetProperty("name").GetString() == accountName)
            .GetProperty("remainingHours").GetDecimal();
    }

    private async Task<(User User, string Token, HolidayBalance[] Accounts)> CreateEmployeeAsync(
        bool accrualPeriodStartsTwoMonthsAgo)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var periodStart = accrualPeriodStartsTwoMonthsAgo
            ? new DateOnly(today.Year, today.Month, 1).AddMonths(-2)
            : new DateOnly(today.Year, today.Month, 1).AddMonths(1);
        var periodEnd = periodStart.AddYears(1).AddDays(-1);
        var user = new User
        {
            FullName = "Rule test employee",
            Email = $"rule-test-{Guid.NewGuid():N}@example.com",
            PasswordHash = "unused",
            Role = "employee",
            EmploymentStartDate = accrualPeriodStartsTwoMonthsAgo ? periodStart : today
        };
        await db.InsertAsync(user);

        foreach (var day in new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday })
        {
            await db.InsertAsync(new WorkScheduleEntry
            {
                UserId = user.Id,
                DayOfWeek = day,
                StartTime = new TimeOnly(8, 0),
                EndTime = new TimeOnly(16, 0),
                EffectiveFrom = periodStart
            });
        }

        var accounts = new[]
        {
            new HolidayBalance
            {
                UserId = user.Id, AccountType = HolidayAccountType.Weeks1To5, EarningYear = periodStart.Year,
                EarningPeriodStart = periodStart, EarningPeriodEnd = periodEnd,
                UsagePeriodStart = periodStart, UsagePeriodEnd = periodEnd
            },
            new HolidayBalance
            {
                UserId = user.Id, AccountType = HolidayAccountType.Week6, EarningYear = periodStart.Year,
                EarningPeriodStart = periodStart, EarningPeriodEnd = periodEnd,
                UsagePeriodStart = periodStart, UsagePeriodEnd = periodEnd
            }
        };
        foreach (var account in accounts)
            await db.InsertAsync(account);

        var token = scope.ServiceProvider.GetRequiredService<ITokenService>().GenerateToken(user);
        return (user, token, accounts);
    }
}
