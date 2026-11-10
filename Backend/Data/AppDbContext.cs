using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<WorkScheduleEntry> WorkScheduleEntries => Set<WorkScheduleEntry>();
    public DbSet<SalaryHistory> SalaryHistory => Set<SalaryHistory>();
    public DbSet<HolidayBalance> HolidayBalances => Set<HolidayBalance>();
    public DbSet<MonthlyAccrual> MonthlyAccruals => Set<MonthlyAccrual>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<HolidayTransaction> HolidayTransactions => Set<HolidayTransaction>();
    public DbSet<SystemParameter> SystemParameters => Set<SystemParameter>();
    public DbSet<PublicHoliday> PublicHolidays => Set<PublicHoliday>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(user => user.Fullname).HasMaxLength(200).IsRequired();
            entity.Property(user => user.Username).HasMaxLength(100).IsRequired();
            entity.HasIndex(user => user.Username).IsUnique();
            entity.Property(user => user.PasswordHash).IsRequired();
            entity.Property(user => user.Role).HasMaxLength(30).IsRequired();
            entity.ToTable(table => table.HasCheckConstraint(
                "CK_Users_Role",
                "\"Role\" IN ('employee', 'accountant', 'admin')"));
        });

        modelBuilder.Entity<WorkScheduleEntry>(entity =>
        {
            entity.Property(schedule => schedule.Hours).HasPrecision(6, 2);
            entity.HasIndex(schedule => new
            {
                schedule.UserId,
                schedule.DayOfWeek,
                schedule.EffectiveFrom
            }).IsUnique();
            entity.HasOne(schedule => schedule.User)
                .WithMany(user => user.WorkScheduleEntries)
                .HasForeignKey(schedule => schedule.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SalaryHistory>(entity =>
        {
            entity.Property(salary => salary.MonthlySalary).HasPrecision(14, 2);
            entity.Property(salary => salary.HourlyRate).HasPrecision(14, 2);
            entity.Property(salary => salary.HolidayQualifyingSalary).HasPrecision(14, 2);
            entity.HasOne(salary => salary.User)
                .WithMany(user => user.SalaryHistory)
                .HasForeignKey(salary => salary.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<HolidayBalance>(entity =>
        {
            entity.Property(balance => balance.EarnedUnits).HasPrecision(10, 3);
            entity.Property(balance => balance.UsedUnits).HasPrecision(10, 3);
            entity.Property(balance => balance.TransferredUnits).HasPrecision(10, 3);
            entity.Property(balance => balance.PaidOutUnits).HasPrecision(10, 3);
            entity.Property(balance => balance.QualifyingSalary).HasPrecision(14, 2);
            entity.Property(balance => balance.HolidaySupplementAmount).HasPrecision(14, 2);
            entity.HasIndex(balance => new { balance.UserId, balance.AccountType, balance.EarningYear })
                .IsUnique();
            entity.HasOne(balance => balance.User)
                .WithMany(user => user.HolidayBalances)
                .HasForeignKey(balance => balance.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MonthlyAccrual>(entity =>
        {
            entity.Property(accrual => accrual.EarnedDays).HasPrecision(10, 3);
            entity.Property(accrual => accrual.EarnedHours).HasPrecision(10, 3);
            entity.Property(accrual => accrual.QualifyingSalary).HasPrecision(14, 2);
            entity.HasIndex(accrual => new { accrual.HolidayBalanceId, accrual.AccrualMonth })
                .IsUnique();
            entity.HasOne(accrual => accrual.HolidayBalance)
                .WithMany(balance => balance.MonthlyAccruals)
                .HasForeignKey(accrual => accrual.HolidayBalanceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LeaveRequest>(entity =>
        {
            entity.Property(request => request.RequestedDays).HasPrecision(10, 3);
            entity.Property(request => request.RequestedHours).HasPrecision(10, 3);
            entity.HasOne(request => request.User)
                .WithMany(user => user.LeaveRequests)
                .HasForeignKey(request => request.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(request => request.ReviewedByUser)
                .WithMany(user => user.ReviewedLeaveRequests)
                .HasForeignKey(request => request.ReviewedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<HolidayTransaction>(entity =>
        {
            entity.Property(transaction => transaction.Units).HasPrecision(10, 3);
            entity.HasOne(transaction => transaction.HolidayBalance)
                .WithMany(balance => balance.Transactions)
                .HasForeignKey(transaction => transaction.HolidayBalanceId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(transaction => transaction.LeaveRequest)
                .WithMany(request => request.Transactions)
                .HasForeignKey(transaction => transaction.LeaveRequestId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SystemParameter>(entity =>
        {
            entity.Property(parameter => parameter.Key).HasMaxLength(100).IsRequired();
            entity.Property(parameter => parameter.NumericValue).HasPrecision(14, 4);
            entity.HasIndex(parameter => new { parameter.Key, parameter.EffectiveFrom })
                .IsUnique();
        });

        modelBuilder.Entity<PublicHoliday>(entity =>
        {
            entity.Property(holiday => holiday.Name).HasMaxLength(200).IsRequired();
            entity.HasIndex(holiday => holiday.Date).IsUnique();
        });
    }
}