using Backend.Models;

namespace Backend.Services;

public interface IHolidayService
{
    Task<decimal> CalculateHoursAsync(Guid userId, DateOnly startDate, DateOnly endDate);
    Task<LeaveRequest> CreateHolidayAsync(Guid userId, Guid accountId, DateOnly startDate, DateOnly endDate);
    Task<LeaveRequest> CreateCancellationAsync(Guid userId, Guid originalRequestId);
    Task<LeaveRequest> CreateTransferAsync(Guid userId, Guid accountId, decimal hours);
    Task<LeaveRequest?> ApproveAsync(Guid requestId, Guid reviewerId);
    Task<LeaveRequest?> RejectAsync(Guid requestId, Guid reviewerId, string? reason);
}
