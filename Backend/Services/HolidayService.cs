using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using LinqToDB;
using LinqToDB.Async;

namespace Backend.Services;

public class HolidayService : IHolidayService
{
    private readonly AppDbContext _db;

    public HolidayService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<decimal> CalculateHoursAsync(Guid userId, DateOnly startDate, DateOnly endDate)
    {
        if (startDate > endDate)
            throw new ArgumentException("StartDate must be before or equal to EndDate.");

        var holidays = await _db.PublicHolidays
            .Where(x => x.Date >= startDate && x.Date <= endDate)
            .Select(x => x.Date)
            .ToListAsync();

        var schedules = await _db.WorkScheduleEntries
            .Where(x => x.UserId == userId
                && x.EffectiveFrom <= endDate
                && (x.EffectiveTo == null || x.EffectiveTo >= startDate))
            .ToListAsync();

        decimal hours = 0;
        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            if (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
                continue;
            if (holidays.Contains(date))
                continue;

            var schedule = schedules
                .Where(x => x.DayOfWeek == date.DayOfWeek
                    && x.EffectiveFrom <= date
                    && (x.EffectiveTo == null || x.EffectiveTo >= date))
                .OrderByDescending(x => x.EffectiveFrom)
                .FirstOrDefault();

            if (schedule != null)
                hours += (decimal)(schedule.EndTime - schedule.StartTime).TotalHours;
        }

        return decimal.Round(hours, 2);
    }

    public async Task EnsureAccrualsAsync(Guid userId, DateOnly throughDate)
    {
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId)
            ?? throw new KeyNotFoundException("Employee not found.");
        var balances = await _db.HolidayBalances.Where(x => x.UserId == userId).ToListAsync();
        foreach (var balance in balances)
        {
            var accrualStart = user.EmploymentStartDate > balance.EarningPeriodStart
                ? user.EmploymentStartDate
                : balance.EarningPeriodStart;
            var lastDate = throughDate < balance.EarningPeriodEnd ? throughDate : balance.EarningPeriodEnd;
            var month = new DateOnly(accrualStart.Year, accrualStart.Month, 1);
            while (month <= lastDate)
            {
                var existing = await _db.MonthlyAccruals.FirstOrDefaultAsync(x =>
                    x.HolidayBalanceId == balance.Id && x.AccrualMonth == month);
                if (existing != null)
                {
                    month = month.AddMonths(1);
                    continue;
                }

                var rate = await GetMonthlyAccrualDaysAsync(balance.AccountType, month);
                var averageDayHours = await GetAverageScheduledDayHoursAsync(userId, month);
                if (averageDayHours <= 0)
                    throw new InvalidOperationException($"No working schedule exists for {month:yyyy-MM}.");

                var earnedHours = decimal.Round(rate * averageDayHours, 2, MidpointRounding.AwayFromZero);
                await using var transaction = await _db.BeginTransactionAsync();
                await _db.InsertAsync(new MonthlyAccrual
                {
                    Id = Guid.NewGuid(),
                    HolidayBalanceId = balance.Id,
                    AccrualMonth = month,
                    EarnedHours = earnedHours,
                    AccrualRatePerMonth = rate,
                    AverageDayHours = averageDayHours,
                    CreatedAtUtc = DateTime.UtcNow
                });
                balance.EarnedHours += earnedHours;
                await _db.UpdateAsync(balance);
                await _db.InsertAsync(new HolidayTransaction
                {
                    Id = Guid.NewGuid(),
                    HolidayBalanceId = balance.Id,
                    TransactionType = HolidayTransactionType.Accrual,
                    TransactionDate = month,
                    Units = earnedHours,
                    Notes = $"Monthly accrual: {rate:0.00} days at {averageDayHours:0.00} hours per workday."
                });
                await transaction.CommitAsync();
                month = month.AddMonths(1);
            }
        }
    }

    public async Task<decimal> ProjectAccruedHoursAsync(Guid userId, HolidayBalance balance, DateOnly throughDate)
    {
        var earnedHours = balance.EarnedHours;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId)
            ?? throw new KeyNotFoundException("Employee not found.");
        if (throughDate < user.EmploymentStartDate)
            return earnedHours;

        var month = new DateOnly(today.Year, today.Month, 1).AddMonths(1);
        var accrualStart = user.EmploymentStartDate > balance.EarningPeriodStart
            ? user.EmploymentStartDate
            : balance.EarningPeriodStart;
        var firstEligibleMonth = new DateOnly(accrualStart.Year, accrualStart.Month, 1);
        if (month < firstEligibleMonth)
            month = firstEligibleMonth;
        var lastDate = throughDate < balance.EarningPeriodEnd ? throughDate : balance.EarningPeriodEnd;

        while (month <= lastDate)
        {
            var existing = await _db.MonthlyAccruals.FirstOrDefaultAsync(x =>
                x.HolidayBalanceId == balance.Id && x.AccrualMonth == month);
            if (existing != null)
            {
                earnedHours += existing.EarnedHours;
            }
            else
            {
                var rate = await GetMonthlyAccrualDaysAsync(balance.AccountType, month);
                var averageDayHours = await GetAverageScheduledDayHoursAsync(userId, month);
                if (averageDayHours <= 0)
                    throw new InvalidOperationException($"No working schedule exists for {month:yyyy-MM}.");
                earnedHours += decimal.Round(rate * averageDayHours, 2, MidpointRounding.AwayFromZero);
            }
            month = month.AddMonths(1);
        }

        return earnedHours;
    }

    public async Task<LeaveRequest> CreateHolidayAsync(Guid userId, Guid accountId, DateOnly startDate, DateOnly endDate)
    {
        if (startDate > endDate)
            throw new ArgumentException("StartDate must be before or equal to EndDate.");

        await EnsureAccrualsAsync(userId, DateOnly.FromDateTime(DateTime.UtcNow));
        var balance = await _db.HolidayBalances.FirstOrDefaultAsync(x => x.Id == accountId && x.UserId == userId);
        if (balance == null)
            throw new KeyNotFoundException("Holiday account not found.");
        if (balance.UsagePeriodStart > startDate || balance.UsagePeriodEnd < endDate)
            throw new InvalidOperationException("The selected account is not valid for the requested dates.");

        var requestedHours = await CalculateHoursAsync(userId, startDate, endDate);
        if (requestedHours <= 0)
            throw new InvalidOperationException("The request contains no working hours.");

        var applicableBalances = await _db.HolidayBalances
            .Where(x => x.UserId == userId
                && x.UsagePeriodStart <= startDate
                && x.UsagePeriodEnd >= endDate)
            .ToListAsync();
        var pendingRequests = await _db.LeaveRequests
            .Where(x => x.UserId == userId
                && x.Status == LeaveRequestStatus.Pending
                && x.RequestType == LeaveRequestType.Holiday)
            .ToListAsync();
        var pendingHours = pendingRequests
            .Where(request => applicableBalances.Any(account =>
                account.AccountType == request.AccountType
                && account.UsagePeriodStart <= request.StartDate
                && account.UsagePeriodEnd >= request.EndDate))
            .Sum(request => request.RequestedHours);
        var availableAcrossAccounts = applicableBalances.Sum(account =>
            account.EarnedHours - account.UsedHours - account.TransferredHours) - pendingHours;
        var weeklyHours = await GetWeeklyScheduleHoursAsync(userId, startDate);
        if (weeklyHours <= 0)
            throw new InvalidOperationException("No working schedule exists for the requested dates.");

        if (requestedHours > availableAcrossAccounts + weeklyHours)
            throw new InvalidOperationException("Maximum holiday debt is one week.");

        var request = new LeaveRequest
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AccountType = balance.AccountType,
            RequestType = LeaveRequestType.Holiday,
            StartDate = startDate,
            EndDate = endDate,
            RequestedHours = requestedHours,
            RequestedDays = decimal.Round(requestedHours / 7.4m, 2),
            SubmittedAtUtc = DateTime.UtcNow,
            Status = LeaveRequestStatus.Pending
        };

        await _db.InsertAsync(request);
        return request;
    }

    private async Task<decimal> GetMonthlyAccrualDaysAsync(HolidayAccountType accountType, DateOnly effectiveDate)
    {
        var key = accountType == HolidayAccountType.Weeks1To5
            ? HolidayRuleSettingKeys.Weeks1To5HoursPerYear
            : HolidayRuleSettingKeys.Week6HoursPerYear;
        var setting = await _db.SystemParameters
            .Where(x => x.Key == key && x.EffectiveFrom <= effectiveDate)
            .OrderByDescending(x => x.EffectiveFrom)
            .FirstOrDefaultAsync();
        var annualHours = setting?.NumericValue
            ?? (accountType == HolidayAccountType.Weeks1To5 ? 185m : 37m);

        return annualHours / 7.4m / 12m;
    }

    private async Task<bool> GetBooleanRuleAsync(string key, DateOnly effectiveDate, bool fallback)
    {
        var setting = await _db.SystemParameters
            .Where(x => x.Key == key && x.EffectiveFrom <= effectiveDate)
            .OrderByDescending(x => x.EffectiveFrom)
            .FirstOrDefaultAsync();
        return setting?.BooleanValue ?? fallback;
    }

    private async Task<decimal> GetAverageScheduledDayHoursAsync(Guid userId, DateOnly month)
    {
        var monthStart = month;
        var monthEnd = month.AddMonths(1).AddDays(-1);
        var schedules = await _db.WorkScheduleEntries
            .Where(x => x.UserId == userId
                && x.EffectiveFrom <= monthEnd
                && (x.EffectiveTo == null || x.EffectiveTo >= monthStart))
            .ToListAsync();

        decimal totalHours = 0;
        var scheduledWorkdays = 0;
        for (var date = monthStart; date <= monthEnd; date = date.AddDays(1))
        {
            if (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
                continue;

            var schedule = schedules
                .Where(x => x.DayOfWeek == date.DayOfWeek
                    && x.EffectiveFrom <= date
                    && (x.EffectiveTo == null || x.EffectiveTo >= date))
                .OrderByDescending(x => x.EffectiveFrom)
                .FirstOrDefault();
            if (schedule == null)
                continue;

            totalHours += (decimal)(schedule.EndTime - schedule.StartTime).TotalHours;
            scheduledWorkdays++;
        }

        return scheduledWorkdays == 0
            ? 0
            : decimal.Round(totalHours / scheduledWorkdays, 2, MidpointRounding.AwayFromZero);
    }

    private async Task<decimal> GetWeeklyScheduleHoursAsync(Guid userId, DateOnly date)
    {
        var schedules = await _db.WorkScheduleEntries
            .Where(x => x.UserId == userId
                && x.EffectiveFrom <= date
                && (x.EffectiveTo == null || x.EffectiveTo >= date))
            .ToListAsync();

        return schedules
            .GroupBy(x => x.DayOfWeek)
            .Select(group => group.OrderByDescending(x => x.EffectiveFrom).First())
            .Sum(x => (decimal)(x.EndTime - x.StartTime).TotalHours);
    }

    public async Task<LeaveRequest> CreateCancellationAsync(Guid userId, Guid originalRequestId)
    {
        var original = await _db.LeaveRequests.FirstOrDefaultAsync(x =>
            x.Id == originalRequestId && x.UserId == userId
            && x.Status == LeaveRequestStatus.Approved
            && x.RequestType == LeaveRequestType.Holiday);
        if (original == null)
            throw new KeyNotFoundException("Approved holiday not found.");

        var existing = await _db.LeaveRequests.AnyAsync(x =>
            x.UserId == userId
            && x.OriginalRequestId == originalRequestId
            && x.RequestType == LeaveRequestType.Cancellation
            && x.Status == LeaveRequestStatus.Pending);
        if (existing)
            throw new InvalidOperationException("A cancellation request is already pending.");

        var request = new LeaveRequest
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AccountType = original.AccountType,
            RequestType = LeaveRequestType.Cancellation,
            OriginalRequestId = original.Id,
            StartDate = original.StartDate,
            EndDate = original.EndDate,
            RequestedHours = original.RequestedHours,
            RequestedDays = original.RequestedDays,
            SubmittedAtUtc = DateTime.UtcNow,
            Status = LeaveRequestStatus.Pending
        };

        await _db.InsertAsync(request);
        return request;
    }

    public async Task<LeaveRequest> CreateTransferAsync(Guid userId, Guid accountId, decimal hours)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (!await GetBooleanRuleAsync(HolidayRuleSettingKeys.TransfersEnabled, today, true))
            throw new InvalidOperationException("Holiday transfers are currently disabled.");

        var averageDayHours = await GetAverageScheduledDayHoursAsync(userId, today);
        if (averageDayHours <= 0)
            throw new InvalidOperationException("No working schedule exists for this employee.");
        var maximumTransferHours = decimal.Round(averageDayHours * 5, 2, MidpointRounding.AwayFromZero);
        if (hours <= 0 || hours > maximumTransferHours)
            throw new ArgumentException($"Transfer is limited to at most {maximumTransferHours:0.00} hours.");

        var balance = await _db.HolidayBalances.FirstOrDefaultAsync(x => x.Id == accountId && x.UserId == userId);
        if (balance == null)
            throw new KeyNotFoundException("Holiday account not found.");
        if (balance.AccountType != HolidayAccountType.Weeks1To5)
            throw new InvalidOperationException("Only the Weeks 1–5 balance can be transferred.");

        var available = balance.EarnedHours - balance.UsedHours - balance.TransferredHours;
        if (hours > available)
            throw new InvalidOperationException("Transfer exceeds available holiday.");

        var request = new LeaveRequest
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AccountType = balance.AccountType,
            RequestType = LeaveRequestType.Transfer,
            StartDate = balance.UsagePeriodEnd,
            EndDate = balance.UsagePeriodEnd,
            RequestedHours = hours,
            RequestedDays = decimal.Round(hours / 7.4m, 2),
            SubmittedAtUtc = DateTime.UtcNow,
            Status = LeaveRequestStatus.Pending
        };
        await _db.InsertAsync(request);
        return request;
    }

    public async Task<LeaveRequest?> ApproveAsync(Guid requestId, Guid reviewerId)
    {
        var request = await _db.LeaveRequests.FirstOrDefaultAsync(x => x.Id == requestId);
        if (request == null || request.Status != LeaveRequestStatus.Pending)
            return null;

        await using var transaction = await _db.BeginTransactionAsync();

        if (request.RequestType == LeaveRequestType.Cancellation)
        {
            var original = await _db.LeaveRequests.FirstOrDefaultAsync(x => x.Id == request.OriginalRequestId);
            if (original == null)
                throw new InvalidOperationException("Original holiday request not found.");

            original.Status = LeaveRequestStatus.Cancelled;
            original.ReviewedAtUtc = DateTime.UtcNow;
            original.ReviewedByUserId = reviewerId;
            await _db.UpdateAsync(original);

            var originalBalance = await _db.HolidayBalances.FirstOrDefaultAsync(x =>
                x.UserId == original.UserId && x.AccountType == original.AccountType
                && x.UsagePeriodStart <= original.StartDate && x.UsagePeriodEnd >= original.EndDate);
            if (originalBalance != null)
            {
                originalBalance.UsedHours = Math.Max(0, originalBalance.UsedHours - original.RequestedHours);
                await _db.UpdateAsync(originalBalance);
                await _db.InsertAsync(new HolidayTransaction
                {
                    HolidayBalanceId = originalBalance.Id,
                    TransactionType = HolidayTransactionType.Adjustment,
                    TransactionDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    Units = original.RequestedHours,
                    LeaveRequestId = original.Id,
                    Notes = "Approved cancellation restored holiday hours."
                });
            }
        }
        else
        {
            var balance = await _db.HolidayBalances.FirstOrDefaultAsync(x =>
                x.UserId == request.UserId && x.AccountType == request.AccountType
                && x.UsagePeriodStart <= request.StartDate && x.UsagePeriodEnd >= request.EndDate);
            if (balance == null)
                throw new InvalidOperationException("No matching holiday balance.");

            if (request.RequestType == LeaveRequestType.Holiday)
                balance.UsedHours += request.RequestedHours;
            else
                balance.TransferredHours += request.RequestedHours;
            await _db.UpdateAsync(balance);

            await _db.InsertAsync(new HolidayTransaction
            {
                HolidayBalanceId = balance.Id,
                TransactionType = request.RequestType == LeaveRequestType.Transfer
                    ? HolidayTransactionType.Transfer
                    : HolidayTransactionType.Usage,
                TransactionDate = DateOnly.FromDateTime(DateTime.UtcNow),
                Units = request.RequestedHours,
                LeaveRequestId = request.Id
            });
        }

        request.Status = LeaveRequestStatus.Approved;
        request.ReviewedAtUtc = DateTime.UtcNow;
        request.ReviewedByUserId = reviewerId;
        await _db.UpdateAsync(request);
        await transaction.CommitAsync();
        return request;
    }

    public async Task<LeaveRequest?> RejectAsync(Guid requestId, Guid reviewerId, string? reason)
    {
        var request = await _db.LeaveRequests.FirstOrDefaultAsync(x => x.Id == requestId);
        if (request == null || request.Status != LeaveRequestStatus.Pending)
            return null;

        request.Status = LeaveRequestStatus.Rejected;
        request.RejectionReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        request.ReviewedAtUtc = DateTime.UtcNow;
        request.ReviewedByUserId = reviewerId;
        await _db.UpdateAsync(request);
        return request;
    }
}
