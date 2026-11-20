using Backend.Models;
using LinqToDB;
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
            ""CreatedAtUtc"" timestamp with time zone NOT NULL,
            UNIQUE (""HolidayBalanceId"", ""AccrualMonth""));");
        await this.ExecuteAsync(@"ALTER TABLE ""MonthlyAccruals"" ADD COLUMN IF NOT EXISTS ""EarnedHours"" numeric(10,2) NOT NULL DEFAULT 0;");
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
            ""Id"" uuid PRIMARY KEY, ""Key"" varchar(100) NOT NULL, ""NumericValue"" numeric(14,4) NULL,
            ""TextValue"" text NULL, ""BooleanValue"" boolean NULL, ""EffectiveFrom"" date NOT NULL, ""EffectiveTo"" date NULL,
            ""Description"" text NULL, UNIQUE (""Key"", ""EffectiveFrom""));");

        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""PublicHolidays"" (
            ""Id"" uuid PRIMARY KEY, ""Date"" date NOT NULL UNIQUE, ""Name"" varchar(200) NOT NULL, ""IsCompanySpecific"" boolean NOT NULL);");

        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""Announcements"" (
            ""Id"" uuid PRIMARY KEY, ""Message"" text NOT NULL, ""CreatedAtUtc"" timestamp with time zone NOT NULL,
            ""CreatedByUserId"" uuid NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL);");

        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""RulePresets"" (
            ""Id"" uuid PRIMARY KEY, ""Code"" varchar(100) NOT NULL UNIQUE, ""Name"" varchar(200) NOT NULL,
            ""AccrualRatePerMonth"" numeric(8,4) NOT NULL, ""Weeks1To5Enabled"" boolean NOT NULL,
            ""Week6Enabled"" boolean NOT NULL, ""EffectiveFrom"" date NOT NULL, ""EffectiveTo"" date NULL,
            ""IsActive"" boolean NOT NULL, ""CreatedAtUtc"" timestamp with time zone NOT NULL,
            ""CreatedByUserId"" uuid NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL);");
        await this.ExecuteAsync(@"CREATE TABLE IF NOT EXISTS ""ScheduleChanges"" (
            ""Id"" uuid PRIMARY KEY, ""UserId"" uuid NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
            ""EffectiveFrom"" date NOT NULL, ""PreviousScheduleJson"" text NULL, ""NewScheduleJson"" text NOT NULL,
            ""CreatedAtUtc"" timestamp with time zone NOT NULL,
            ""CreatedByUserId"" uuid NULL REFERENCES ""Users""(""Id"") ON DELETE SET NULL);");
    }
}