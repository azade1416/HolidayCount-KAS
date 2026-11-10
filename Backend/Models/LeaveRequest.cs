namespace Backend.Models;

public class LeaveRequest
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public HolidayAccountType AccountType { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal RequestedDays { get; set; }
    public decimal RequestedHours { get; set; }
    public bool IsMainHoliday { get; set; }
    public LeaveRequestStatus Status { get; set; } = LeaveRequestStatus.Pending;
    public string? Reason { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime SubmittedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAtUtc { get; set; }
    public Guid? ReviewedByUserId { get; set; }

    public User User { get; set; } = null!;
    public User? ReviewedByUser { get; set; }
    public ICollection<HolidayTransaction> Transactions { get; set; } = new List<HolidayTransaction>();
}