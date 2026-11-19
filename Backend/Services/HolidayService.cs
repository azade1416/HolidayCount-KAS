using Backend.Data;
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

    public async Task<LeaveRequest> CreateHolidayAsync(Guid userId, Guid accountId, DateOnly startDate, DateOnly endDate)
    {
        if (startDate > endDate)
            throw new ArgumentException("StartDate must be before or equal to EndDate.");

        var balance = await _db.HolidayBalances.FirstOrDefaultAsync(x => x.Id == accountId && x.UserId == userId);
        if (balance == null)
            throw new KeyNotFoundException("Holiday account not found.");

        var requestedHours = await CalculateHoursAsync(userId, startDate, endDate);
        if (requestedHours <= 0)
            throw new InvalidOperationException("The request contains no working hours.");

        var available = balance.EarnedHours - balance.UsedHours - balance.TransferredHours;
        if (requestedHours > available + 37)
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
        if (hours <= 0 || hours > 37)
            throw new ArgumentException("Transfer is limited to at most 37.00 hours.");

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
