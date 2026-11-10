using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations;

public partial class ChangeUserIdsToGuid : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE "WorkScheduleEntries" DROP CONSTRAINT IF EXISTS "FK_WorkScheduleEntries_Users_UserId";
            ALTER TABLE "SalaryHistory" DROP CONSTRAINT IF EXISTS "FK_SalaryHistory_Users_UserId";
            ALTER TABLE "LeaveRequests" DROP CONSTRAINT IF EXISTS "FK_LeaveRequests_Users_UserId";
            ALTER TABLE "LeaveRequests" DROP CONSTRAINT IF EXISTS "FK_LeaveRequests_Users_ReviewedByUserId";
            ALTER TABLE "HolidayBalances" DROP CONSTRAINT IF EXISTS "FK_HolidayBalances_Users_UserId";
            ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "PK_Users";

            ALTER TABLE "Users" ADD COLUMN "NewId" uuid;
            UPDATE "Users" SET "NewId" = gen_random_uuid();
            ALTER TABLE "WorkScheduleEntries" ADD COLUMN "NewUserId" uuid;
            UPDATE "WorkScheduleEntries" c SET "NewUserId" = u."NewId" FROM "Users" u WHERE c."UserId" = u."Id";
            ALTER TABLE "SalaryHistory" ADD COLUMN "NewUserId" uuid;
            UPDATE "SalaryHistory" c SET "NewUserId" = u."NewId" FROM "Users" u WHERE c."UserId" = u."Id";
            ALTER TABLE "HolidayBalances" ADD COLUMN "NewUserId" uuid;
            UPDATE "HolidayBalances" c SET "NewUserId" = u."NewId" FROM "Users" u WHERE c."UserId" = u."Id";
            ALTER TABLE "LeaveRequests" ADD COLUMN "NewUserId" uuid;
            UPDATE "LeaveRequests" c SET "NewUserId" = u."NewId" FROM "Users" u WHERE c."UserId" = u."Id";
            ALTER TABLE "LeaveRequests" ADD COLUMN "NewReviewedByUserId" uuid;
            UPDATE "LeaveRequests" c SET "NewReviewedByUserId" = u."NewId" FROM "Users" u WHERE c."ReviewedByUserId" = u."Id";

            DROP INDEX IF EXISTS "IX_WorkScheduleEntries_UserId_DayOfWeek_EffectiveFrom";
            DROP INDEX IF EXISTS "IX_SalaryHistory_UserId";
            DROP INDEX IF EXISTS "IX_HolidayBalances_UserId_AccountType_EarningYear";
            DROP INDEX IF EXISTS "IX_LeaveRequests_UserId";
            DROP INDEX IF EXISTS "IX_LeaveRequests_ReviewedByUserId";

            ALTER TABLE "Users" DROP COLUMN "Id";
            ALTER TABLE "Users" RENAME COLUMN "NewId" TO "Id";
            ALTER TABLE "Users" ALTER COLUMN "Id" SET NOT NULL;
            ALTER TABLE "Users" ADD CONSTRAINT "PK_Users" PRIMARY KEY ("Id");

            ALTER TABLE "WorkScheduleEntries" DROP COLUMN "UserId";
            ALTER TABLE "WorkScheduleEntries" RENAME COLUMN "NewUserId" TO "UserId";
            ALTER TABLE "WorkScheduleEntries" ALTER COLUMN "UserId" SET NOT NULL;
            ALTER TABLE "SalaryHistory" DROP COLUMN "UserId";
            ALTER TABLE "SalaryHistory" RENAME COLUMN "NewUserId" TO "UserId";
            ALTER TABLE "SalaryHistory" ALTER COLUMN "UserId" SET NOT NULL;
            ALTER TABLE "HolidayBalances" DROP COLUMN "UserId";
            ALTER TABLE "HolidayBalances" RENAME COLUMN "NewUserId" TO "UserId";
            ALTER TABLE "HolidayBalances" ALTER COLUMN "UserId" SET NOT NULL;
            ALTER TABLE "LeaveRequests" DROP COLUMN "UserId";
            ALTER TABLE "LeaveRequests" RENAME COLUMN "NewUserId" TO "UserId";
            ALTER TABLE "LeaveRequests" ALTER COLUMN "UserId" SET NOT NULL;
            ALTER TABLE "LeaveRequests" DROP COLUMN "ReviewedByUserId";
            ALTER TABLE "LeaveRequests" RENAME COLUMN "NewReviewedByUserId" TO "ReviewedByUserId";

            CREATE UNIQUE INDEX "IX_WorkScheduleEntries_UserId_DayOfWeek_EffectiveFrom"
                ON "WorkScheduleEntries" ("UserId", "DayOfWeek", "EffectiveFrom");
            CREATE INDEX "IX_SalaryHistory_UserId" ON "SalaryHistory" ("UserId");
            CREATE UNIQUE INDEX "IX_HolidayBalances_UserId_AccountType_EarningYear"
                ON "HolidayBalances" ("UserId", "AccountType", "EarningYear");
            CREATE INDEX "IX_LeaveRequests_UserId" ON "LeaveRequests" ("UserId");
            CREATE INDEX "IX_LeaveRequests_ReviewedByUserId" ON "LeaveRequests" ("ReviewedByUserId");

            ALTER TABLE "WorkScheduleEntries" ADD CONSTRAINT "FK_WorkScheduleEntries_Users_UserId"
                FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE;
            ALTER TABLE "SalaryHistory" ADD CONSTRAINT "FK_SalaryHistory_Users_UserId"
                FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE;
            ALTER TABLE "LeaveRequests" ADD CONSTRAINT "FK_LeaveRequests_Users_UserId"
                FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE;
            ALTER TABLE "LeaveRequests" ADD CONSTRAINT "FK_LeaveRequests_Users_ReviewedByUserId"
                FOREIGN KEY ("ReviewedByUserId") REFERENCES "Users" ("Id") ON DELETE SET NULL;
            ALTER TABLE "HolidayBalances" ADD CONSTRAINT "FK_HolidayBalances_Users_UserId"
                FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE;
            """);

        migrationBuilder.Sql("""
            INSERT INTO "Users"
                ("Id", "Fullname", "Username", "PasswordHash", "Role",
                 "EmploymentType", "EmploymentStartDate", "EmploymentEndDate", "IsActive")
            SELECT gen_random_uuid(), 'Administrator', 'admin',
                   '$2a$11$JkBFAUgXsNma2OWzqtTQkOXVsiHTCRpYyRQ3/YX8armgq4nmqWKbC',
                   'admin', 0, CURRENT_DATE, NULL, TRUE
            WHERE NOT EXISTS (SELECT 1 FROM "Users" WHERE "Username" = 'admin');
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        throw new NotSupportedException("Changing user identifiers back to integers is not supported.");
    }
}
