using Backend.Data;
using Backend.Models;
using LinqToDB;
using LinqToDB.Async;
using LinqToDB.Data;
using LinqToDB.Mapping;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Xunit;

namespace Backend.Tests;

public class SchemaSafetyTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public SchemaSafetyTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Ensure_schema_preserves_legacy_data_and_tables()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.ExecuteAsync(@"ALTER TABLE ""Users"" ADD COLUMN ""Username"" text NOT NULL DEFAULT 'legacy';");
        await db.ExecuteAsync(@"ALTER TABLE ""WorkScheduleEntries"" ADD COLUMN ""Hours"" numeric(6,2) NOT NULL;");
        await db.ExecuteAsync(@"CREATE TABLE ""SalaryHistory"" (""Id"" uuid PRIMARY KEY, ""Amount"" numeric NOT NULL);");
        await db.ExecuteAsync(@"INSERT INTO ""SalaryHistory"" (""Id"", ""Amount"")
            VALUES ('30000000-0000-0000-0000-000000000001', 1234);");

        await db.EnsureSchemaAsync();

        Assert.Equal(1, await db.GetTable<LegacySalaryHistory>().CountAsync());
        var user = new User
        {
            FullName = "Schema test",
            Email = $"schema-{Guid.NewGuid():N}@example.com",
            PasswordHash = "unused",
            Role = "employee"
        };
        await db.InsertAsync(user);
        await db.InsertAsync(new WorkScheduleEntry
        {
            UserId = user.Id,
            DayOfWeek = DayOfWeek.Monday,
            StartTime = new TimeOnly(8, 0),
            EndTime = new TimeOnly(16, 0),
            EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow)
        });
    }

    [Fact]
    public async Task Usage_transactions_are_unique_per_leave_request_but_adjustments_are_allowed()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            FullName = "Transaction test",
            Email = $"transaction-{Guid.NewGuid():N}@example.com",
            PasswordHash = "unused",
            Role = "employee"
        };
        await db.InsertAsync(user);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var balance = new HolidayBalance
        {
            UserId = user.Id,
            AccountType = HolidayAccountType.Weeks1To5,
            EarningYear = today.Year,
            EarningPeriodStart = today,
            EarningPeriodEnd = today.AddYears(1),
            UsagePeriodStart = today,
            UsagePeriodEnd = today.AddYears(1)
        };
        await db.InsertAsync(balance);
        var request = new LeaveRequest
        {
            UserId = user.Id,
            AccountType = HolidayAccountType.Weeks1To5,
            StartDate = today,
            EndDate = today,
            RequestedDays = 1,
            RequestedHours = 8
        };
        await db.InsertAsync(request);
        await db.InsertAsync(new HolidayTransaction
        {
            HolidayBalanceId = balance.Id,
            TransactionType = HolidayTransactionType.Usage,
            TransactionDate = today,
            Units = 8,
            LeaveRequestId = request.Id
        });

        await Assert.ThrowsAsync<PostgresException>(() => db.InsertAsync(new HolidayTransaction
        {
            HolidayBalanceId = balance.Id,
            TransactionType = HolidayTransactionType.Usage,
            TransactionDate = today,
            Units = 8,
            LeaveRequestId = request.Id
        }));

        await db.InsertAsync(new HolidayTransaction
        {
            HolidayBalanceId = balance.Id,
            TransactionType = HolidayTransactionType.Adjustment,
            TransactionDate = today,
            Units = 8,
            LeaveRequestId = request.Id
        });
    }

    [Table("SalaryHistory")]
    private sealed class LegacySalaryHistory
    {
        [PrimaryKey]
        [Column("Id")]
        public Guid Id { get; set; }
    }
}
