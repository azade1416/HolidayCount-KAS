using Backend.Models;
using Backend.DTOs;
using System.Text.Json;
using LinqToDB;
using LinqToDB.Async;
using LinqToDB.Data;

namespace Backend.Data;

public class AppDbContext : DataConnection
{
    public AppDbContext(string connectionString) : base(
        new DataOptions().UsePostgreSQL(connectionString))
    {
    }

    public ITable<User> Users => this.GetTable<User>();
    public ITable<WorkScheduleEntry> WorkScheduleEntries => this.GetTable<WorkScheduleEntry>();
    public ITable<HolidayBalance> HolidayBalances => this.GetTable<HolidayBalance>();
    public ITable<MonthlyAccrual> MonthlyAccruals => this.GetTable<MonthlyAccrual>();
    public ITable<LeaveRequest> LeaveRequests => this.GetTable<LeaveRequest>();
    public ITable<HolidayTransaction> HolidayTransactions => this.GetTable<HolidayTransaction>();
    public ITable<SystemParameter> SystemParameters => this.GetTable<SystemParameter>();
    public ITable<PublicHoliday> PublicHolidays => this.GetTable<PublicHoliday>();
    public ITable<RulePreset> RulePresets => this.GetTable<RulePreset>();
    public ITable<Announcement> Announcements => this.GetTable<Announcement>();
    public ITable<ScheduleChange> ScheduleChanges => this.GetTable<ScheduleChange>();

    public async Task EnsureSchemaAsync()
    {
        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""Users"" (
            ""Id"" uuid PRIMARY KEY, ""FullName"" varchar(200) NOT NULL,
            ""PasswordHash"" text NOT NULL, ""Role"" varchar(30) NOT NULL CHECK (""Role"" IN ('employee','accountant','admin')),
            ""EmploymentType"" integer NOT NULL, ""EmploymentStartDate"" date NOT NULL, ""EmploymentEndDate"" date NULL, ""IsActive"" boolean NOT NULL);");
        await this.ExecuteAsync(@"ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""Email"" varchar(320);");
        await this.ExecuteAsync(@"ALTER TABLE ""Users"" ALTER COLUMN ""Email"" SET NOT NULL;");
        await this.ExecuteAsync(@"ALTER TABLE ""Users"" DROP COLUMN IF EXISTS ""Username"";");
        await this.ExecuteAsync(@"
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'Users' AND column_name = 'Fullname'
                ) THEN
                    ALTER TABLE ""Users"" RENAME COLUMN ""Fullname"" TO ""FullName"";
                END IF;
            END $$;");
        await this.ExecuteAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS ""UX_Users_Email"" ON ""Users""(""Email"");");
        await this.ExecuteAsync(@"
            DO $$
            DECLARE constraint_record record;
            BEGIN
                FOR constraint_record IN
                    SELECT conname
                    FROM pg_constraint
                    WHERE conrelid = '""Users""'::regclass
                      AND contype = 'c'
                LOOP
                    EXECUTE format('ALTER TABLE ""Users"" DROP CONSTRAINT %I', constraint_record.conname);
                END LOOP;
            END $$;");
        await this.ExecuteAsync(@"ALTER TABLE ""Users"" ADD CONSTRAINT ""Users_Role_Check""
            CHECK (""Role"" IN ('employee','accountant','admin'));");
        await this.ExecuteAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS ""UX_Users_SingleAccountant""
            ON ""Users""(""Role"") WHERE ""Role"" = 'accountant';");
        await this.ExecuteAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS ""UX_Users_SingleAdmin""
            ON ""Users""(""Role"") WHERE ""Role"" = 'admin';");

        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""WorkScheduleEntries"" (
            ""Id"" uuid PRIMARY KEY, ""UserId"" uuid NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""DayOfWeek"" integer NOT NULL, ""Hours"" numeric(6,2) NOT NULL, ""EffectiveFrom"" date NOT NULL, ""EffectiveTo"" date NULL,
            UNIQUE (""UserId"", ""DayOfWeek"", ""EffectiveFrom""));");
        await this.ExecuteAsync(@"ALTER TABLE ""WorkScheduleEntries"" ADD COLUMN IF NOT EXISTS ""StartTime"" time NOT NULL DEFAULT '08:00';");
        await this.ExecuteAsync(@"ALTER TABLE ""WorkScheduleEntries"" ADD COLUMN IF NOT EXISTS ""EndTime"" time NOT NULL DEFAULT '16:00';");
        await this.ExecuteAsync(@"ALTER TABLE ""WorkScheduleEntries"" DROP COLUMN IF EXISTS ""Hours"";");

        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""HolidayBalances"" (
            ""Id"" uuid PRIMARY KEY, ""UserId"" uuid NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""AccountType"" integer NOT NULL, ""EarningYear"" integer NOT NULL, ""EarningPeriodStart"" date NOT NULL,
            ""EarningPeriodEnd"" date NOT NULL, ""UsagePeriodStart"" date NOT NULL, ""UsagePeriodEnd"" date NOT NULL,
            ""EarnedHours"" numeric(10,2) NOT NULL DEFAULT 0, ""UsedHours"" numeric(10,2) NOT NULL DEFAULT 0,
            ""TransferredHours"" numeric(10,2) NOT NULL DEFAULT 0,
            UNIQUE (""UserId"", ""AccountType"", ""EarningYear""));");
        await this.ExecuteAsync(@"ALTER TABLE ""HolidayBalances"" ADD COLUMN IF NOT EXISTS ""EarnedHours"" numeric(10,2) NOT NULL DEFAULT 0;");
        await this.ExecuteAsync(@"ALTER TABLE ""HolidayBalances"" ADD COLUMN IF NOT EXISTS ""UsedHours"" numeric(10,2) NOT NULL DEFAULT 0;");
        await this.ExecuteAsync(@"ALTER TABLE ""HolidayBalances"" ADD COLUMN IF NOT EXISTS ""TransferredHours"" numeric(10,2) NOT NULL DEFAULT 0;");
        await this.ExecuteAsync(@"
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HolidayBalances' AND column_name = 'EarnedUnits') THEN
                    ALTER TABLE ""HolidayBalances"" ALTER COLUMN ""EarnedUnits"" DROP NOT NULL;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HolidayBalances' AND column_name = 'UsedUnits') THEN
                    ALTER TABLE ""HolidayBalances"" ALTER COLUMN ""UsedUnits"" DROP NOT NULL;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HolidayBalances' AND column_name = 'TransferredUnits') THEN
                    ALTER TABLE ""HolidayBalances"" ALTER COLUMN ""TransferredUnits"" DROP NOT NULL;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HolidayBalances' AND column_name = 'PaidOutUnits') THEN
                    ALTER TABLE ""HolidayBalances"" ALTER COLUMN ""PaidOutUnits"" DROP NOT NULL;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HolidayBalances' AND column_name = 'QualifyingSalary') THEN
                    ALTER TABLE ""HolidayBalances"" ALTER COLUMN ""QualifyingSalary"" DROP NOT NULL;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HolidayBalances' AND column_name = 'HolidaySupplementAmount') THEN
                    ALTER TABLE ""HolidayBalances"" ALTER COLUMN ""HolidaySupplementAmount"" DROP NOT NULL;
                END IF;
            END $$;");
        await this.ExecuteAsync(@"ALTER TABLE ""HolidayBalances"" DROP COLUMN IF EXISTS ""EarnedUnits"";");
        await this.ExecuteAsync(@"ALTER TABLE ""HolidayBalances"" DROP COLUMN IF EXISTS ""UsedUnits"";");
        await this.ExecuteAsync(@"ALTER TABLE ""HolidayBalances"" DROP COLUMN IF EXISTS ""TransferredUnits"";");
        await this.ExecuteAsync(@"ALTER TABLE ""HolidayBalances"" DROP COLUMN IF EXISTS ""PaidOutUnits"";");
        await this.ExecuteAsync(@"ALTER TABLE ""HolidayBalances"" DROP COLUMN IF EXISTS ""QualifyingSalary"";");
        await this.ExecuteAsync(@"ALTER TABLE ""HolidayBalances"" DROP COLUMN IF EXISTS ""HolidaySupplementAmount"";");

        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""MonthlyAccruals"" (
            ""Id"" uuid PRIMARY KEY, ""HolidayBalanceId"" uuid NOT NULL REFERENCES ""HolidayBalances""(""Id"") ON DELETE CASCADE,
            ""AccrualMonth"" date NOT NULL, ""EarnedHours"" numeric(10,2) NOT NULL,
            ""AccrualRatePerMonth"" numeric(8,4) NOT NULL DEFAULT 0,
            ""AverageDayHours"" numeric(8,2) NOT NULL DEFAULT 0,
            ""CreatedAtUtc"" timestamp with time zone NOT NULL,
            UNIQUE (""HolidayBalanceId"", ""AccrualMonth""));");
        await this.ExecuteAsync(@"ALTER TABLE ""MonthlyAccruals"" ADD COLUMN IF NOT EXISTS ""EarnedHours"" numeric(10,2) NOT NULL DEFAULT 0;");
        await this.ExecuteAsync(@"ALTER TABLE ""MonthlyAccruals"" ADD COLUMN IF NOT EXISTS ""AccrualRatePerMonth"" numeric(8,4) NOT NULL DEFAULT 0;");
        await this.ExecuteAsync(@"ALTER TABLE ""MonthlyAccruals"" ADD COLUMN IF NOT EXISTS ""AverageDayHours"" numeric(8,2) NOT NULL DEFAULT 0;");
        await this.ExecuteAsync(@"
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'MonthlyAccruals' AND column_name = 'EarnedDays') THEN
                    ALTER TABLE ""MonthlyAccruals"" ALTER COLUMN ""EarnedDays"" DROP NOT NULL;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'MonthlyAccruals' AND column_name = 'QualifyingSalary') THEN
                    ALTER TABLE ""MonthlyAccruals"" ALTER COLUMN ""QualifyingSalary"" DROP NOT NULL;
                END IF;
            END $$;");
        await this.ExecuteAsync(@"ALTER TABLE ""MonthlyAccruals"" DROP COLUMN IF EXISTS ""EarnedDays"";");
        await this.ExecuteAsync(@"ALTER TABLE ""MonthlyAccruals"" DROP COLUMN IF EXISTS ""QualifyingSalary"";");
        await this.ExecuteAsync(@"DROP TABLE IF EXISTS ""SalaryHistory"";");

        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""LeaveRequests"" (
            ""Id"" uuid PRIMARY KEY, ""UserId"" uuid NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""AccountType"" integer NOT NULL, ""StartDate"" date NOT NULL, ""EndDate"" date NOT NULL,
            ""RequestedDays"" numeric(10,2) NOT NULL, ""RequestedHours"" numeric(10,2) NOT NULL, ""IsMainHoliday"" boolean NOT NULL,
            ""Status"" integer NOT NULL, ""Reason"" text NULL, ""RejectionReason"" text NULL, ""SubmittedAtUtc"" timestamp with time zone NOT NULL,
            ""ReviewedAtUtc"" timestamp with time zone NULL, ""ReviewedByUserId"" uuid NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL);");
        await this.ExecuteAsync(@"ALTER TABLE ""LeaveRequests"" ADD COLUMN IF NOT EXISTS ""RequestType"" integer NOT NULL DEFAULT 0;");
        await this.ExecuteAsync(@"ALTER TABLE ""LeaveRequests"" ADD COLUMN IF NOT EXISTS ""OriginalRequestId"" uuid NULL REFERENCES ""LeaveRequests""(""Id"") ON DELETE SET NULL;");

        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""HolidayTransactions"" (
            ""Id"" uuid PRIMARY KEY, ""HolidayBalanceId"" uuid NOT NULL REFERENCES ""HolidayBalances""(""Id"") ON DELETE CASCADE,
            ""TransactionType"" integer NOT NULL, ""TransactionDate"" date NOT NULL, ""Units"" numeric(10,2) NOT NULL,
            ""LeaveRequestId"" uuid NULL REFERENCES ""LeaveRequests""(""Id"") ON DELETE SET NULL, ""Notes"" text NULL);");

        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""SystemParameters"" (
            ""Id"" uuid PRIMARY KEY, ""Key"" varchar(100) NOT NULL, ""Value"" text NOT NULL,
            ""EffectiveFrom"" date NOT NULL);");
        await this.ExecuteAsync(@"ALTER TABLE ""SystemParameters"" ADD COLUMN IF NOT EXISTS ""Value"" text;");
        await this.ExecuteAsync(@"
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'SystemParameters' AND column_name = 'NumericValue'
                ) THEN
                    EXECUTE 'DELETE FROM ""SystemParameters"" old_row USING ""SystemParameters"" new_row
                        WHERE old_row.""Key"" = ''weeks1To5DaysPerMonth''
                          AND new_row.""Key"" = ''weeks1To5HoursPerYear''
                          AND old_row.""EffectiveFrom"" = new_row.""EffectiveFrom""';
                    EXECUTE 'DELETE FROM ""SystemParameters"" old_row USING ""SystemParameters"" new_row
                        WHERE old_row.""Key"" = ''week6DaysPerMonth''
                          AND new_row.""Key"" = ''week6HoursPerYear''
                          AND old_row.""EffectiveFrom"" = new_row.""EffectiveFrom""';
                    EXECUTE 'UPDATE ""SystemParameters""
                        SET ""NumericValue"" = ""NumericValue"" * 7.4 * 12,
                            ""Key"" = ''weeks1To5HoursPerYear''
                        WHERE ""Key"" = ''weeks1To5DaysPerMonth''';
                    EXECUTE 'UPDATE ""SystemParameters""
                        SET ""NumericValue"" = ""NumericValue"" * 7.4 * 12,
                            ""Key"" = ''week6HoursPerYear''
                        WHERE ""Key"" = ''week6DaysPerMonth''';
                    EXECUTE 'UPDATE ""SystemParameters""
                        SET ""Value"" = COALESCE(
                            to_jsonb(""NumericValue"")::text,
                            to_jsonb(""TextValue"")::text,
                            to_jsonb(""BooleanValue"")::text,
                            ''null'')
                        WHERE ""Value"" IS NULL';
                END IF;
                UPDATE ""SystemParameters"" SET ""Value"" = 'null' WHERE ""Value"" IS NULL;
            END $$;");
        await this.ExecuteAsync(@"ALTER TABLE ""SystemParameters"" ALTER COLUMN ""Value"" SET NOT NULL;");
        await this.ExecuteAsync(@"ALTER TABLE ""SystemParameters"" DROP CONSTRAINT IF EXISTS ""SystemParameters_Key_EffectiveFrom_key"";");
        await this.ExecuteAsync(@"ALTER TABLE ""SystemParameters"" DROP COLUMN IF EXISTS ""NumericValue"";");
        await this.ExecuteAsync(@"ALTER TABLE ""SystemParameters"" DROP COLUMN IF EXISTS ""TextValue"";");
        await this.ExecuteAsync(@"ALTER TABLE ""SystemParameters"" DROP COLUMN IF EXISTS ""BooleanValue"";");
        await this.ExecuteAsync(@"ALTER TABLE ""SystemParameters"" DROP COLUMN IF EXISTS ""EffectiveTo"";");
        await this.ExecuteAsync(@"ALTER TABLE ""SystemParameters"" DROP COLUMN IF EXISTS ""Description"";");
        await this.ExecuteAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS ""UX_SystemParameters_Key_EffectiveFrom""
            ON ""SystemParameters"" (""Key"", ""EffectiveFrom"");");

        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""PublicHolidays"" (
            ""Id"" uuid PRIMARY KEY, ""Date"" date NOT NULL UNIQUE, ""Name"" varchar(200) NOT NULL, ""IsCompanySpecific"" boolean NOT NULL);");

        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""Announcements"" (
            ""Id"" uuid PRIMARY KEY, ""Message"" text NOT NULL, ""CreatedAtUtc"" timestamp with time zone NOT NULL,
            ""CreatedByUserId"" uuid NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL);");

        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""RulePresets"" (
            ""Id"" uuid PRIMARY KEY, ""Name"" varchar(200) NOT NULL, ""Settings"" text NOT NULL DEFAULT '{}');");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" ADD COLUMN IF NOT EXISTS ""Settings"" text NOT NULL DEFAULT '{}';");
        await this.ExecuteAsync(@"
            UPDATE ""RulePresets""
            SET ""Settings"" = COALESCE(
                NULLIF(to_jsonb(""RulePresets"")->>'SettingsJson', '{}'),
                json_build_object(
                    'weeks1To5HoursPerYear',
                        COALESCE(
                            (to_jsonb(""RulePresets"")->>'Weeks1To5HoursPerYear')::numeric,
                            (to_jsonb(""RulePresets"")->>'AccrualRatePerMonth')::numeric * 7.4 * 12,
                            185),
                    'week6HoursPerYear',
                        COALESCE((to_jsonb(""RulePresets"")->>'Week6HoursPerYear')::numeric, 37),
                    'mainHolidayNoticeMonths',
                        COALESCE((to_jsonb(""RulePresets"")->>'MainHolidayNoticeMonths')::numeric, 3),
                    'otherHolidayNoticeMonths',
                        COALESCE((to_jsonb(""RulePresets"")->>'OtherHolidayNoticeMonths')::numeric, 1)
                )::text
            )
            WHERE ""Settings"" = '{}';");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""Code"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""SettingsJson"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""Version"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""PreviousVersionId"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""Weeks1To5HoursPerYear"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""Week6HoursPerYear"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""MainHolidayNoticeMonths"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""OtherHolidayNoticeMonths"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""AccrualRatePerMonth"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""Weeks1To5Enabled"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""Week6Enabled"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""EffectiveFrom"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""EffectiveTo"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""IsActive"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""CreatedAtUtc"";");
        await this.ExecuteAsync(@"ALTER TABLE ""RulePresets"" DROP COLUMN IF EXISTS ""CreatedByUserId"";");
        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""ScheduleChanges"" (
            ""Id"" uuid PRIMARY KEY, ""UserId"" uuid NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""EffectiveFrom"" date NOT NULL, ""PreviousScheduleJson"" text NULL, ""NewScheduleJson"" text NOT NULL,
            ""CreatedAtUtc"" timestamp with time zone NOT NULL,
            ""CreatedByUserId"" uuid NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL);");
    }

    public async Task SeedUsersAsync(
        string adminEmail,
        string adminPassword,
        string accountantEmail,
        string accountantPassword,
        string employeeEmail,
        string employeePassword)
    {
        var seedValues = new[]
        {
            adminEmail, adminPassword, accountantEmail,
            accountantPassword, employeeEmail, employeePassword
        };
        if (seedValues.All(string.IsNullOrWhiteSpace))
            return;
        if (seedValues.Any(string.IsNullOrWhiteSpace))
            throw new InvalidOperationException("All seed email and password settings must be configured.");

        if (await this.Users.AnyAsync(x => true))
            return;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var users = new[]
        {
            CreateSeedUser("Admin", adminEmail, adminPassword, "admin", null),
            CreateSeedUser("Accountant", accountantEmail, accountantPassword, "accountant", null),
            CreateSeedUser("Employee", employeeEmail, employeePassword, "employee", EmploymentType.FullTime)
        };

        foreach (var user in users)
            await this.InsertAsync(user);

        var employee = users[2];
        foreach (var day in new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday })
        {
            await this.InsertAsync(new WorkScheduleEntry
            {
                Id = Guid.NewGuid(),
                UserId = employee.Id,
                DayOfWeek = day,
                StartTime = new TimeOnly(8, 0),
                EndTime = new TimeOnly(16, 0),
                EffectiveFrom = today
            });
        }

        foreach (var accountType in new[] { HolidayAccountType.Weeks1To5, HolidayAccountType.Week6 })
        {
            await this.InsertAsync(new HolidayBalance
            {
                Id = Guid.NewGuid(),
                UserId = employee.Id,
                AccountType = accountType,
                EarningYear = today.Year,
                EarningPeriodStart = new DateOnly(today.Year, 9, 1),
                EarningPeriodEnd = new DateOnly(today.Year + 1, 8, 31),
                UsagePeriodStart = new DateOnly(today.Year, 9, 1),
                UsagePeriodEnd = new DateOnly(today.Year + 1, 8, 31)
            });
        }
    }

    public async Task EnsureDefaultRuleSettingsAsync()
    {
        var defaults = new (string Key, string Value)[]
        {
            (HolidayRuleSettingKeys.Weeks1To5HoursPerYear, JsonSerializer.Serialize(185m)),
            (HolidayRuleSettingKeys.Week6HoursPerYear, JsonSerializer.Serialize(37m)),
            (HolidayRuleSettingKeys.MainHolidayNoticeMonths, JsonSerializer.Serialize(3m)),
            (HolidayRuleSettingKeys.OtherHolidayNoticeMonths, JsonSerializer.Serialize(1m))
        };

        foreach (var setting in defaults)
        {
            if (await this.SystemParameters.AnyAsync(x => x.Key == setting.Key))
                continue;

            await this.InsertAsync(new SystemParameter
            {
                Id = Guid.NewGuid(),
                Key = setting.Key,
                Value = setting.Value,
                EffectiveFrom = HolidayRuleSettingKeys.DefaultsEffectiveFrom
            });
        }

        if (!await this.RulePresets.AnyAsync())
        {
            var settings = new HolidayRuleSettingsDto();
            await this.InsertAsync(new RulePreset
            {
                Id = Guid.NewGuid(),
                Name = "Business Esbjerg defaults",
                Settings = JsonSerializer.Serialize(settings, new JsonSerializerOptions(JsonSerializerDefaults.Web))
            });
        }
    }

    private static User CreateSeedUser(
        string fullName,
        string email,
        string password,
        string role,
        EmploymentType? employmentType)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new InvalidOperationException($"Seed email for role '{role}' is not configured.");
        if (string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException($"Seed password for role '{role}' is not configured.");

        return new User
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            Email = email.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = role,
            EmploymentType = employmentType ?? EmploymentType.FullTime,
            EmploymentStartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            IsActive = true
        };
    }
}