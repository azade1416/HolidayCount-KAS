using LinqToDB.Mapping;

namespace Backend.Models;

[Table("LeaveRequests")]
public class LeaveRequest
{
    [PrimaryKey]
    [Column("Id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("UserId")]
    public Guid UserId { get; set; }
    [Column("AccountType")]
    public HolidayAccountType AccountType { get; set; }
    [Column("StartDate")]
    public DateOnly StartDate { get; set; }
    [Column("EndDate")]
    public DateOnly EndDate { get; set; }
    [Column("RequestedDays")]
    public decimal RequestedDays { get; set; }
    [Column("RequestedHours")]
    public decimal RequestedHours { get; set; }
    [Column("IsMainHoliday")]
    public bool IsMainHoliday { get; set; }
    [Column("Status")]
    public LeaveRequestStatus Status { get; set; } = LeaveRequestStatus.Pending;
    [Column("Reason")]
    public string? Reason { get; set; }
    [Column("RejectionReason")]
    public string? RejectionReason { get; set; }
    [Column("SubmittedAtUtc")]
    public DateTime SubmittedAtUtc { get; set; } = DateTime.UtcNow;
    [Column("ReviewedAtUtc")]
    public DateTime? ReviewedAtUtc { get; set; }
    [Column("ReviewedByUserId")]
    public Guid? ReviewedByUserId { get; set; }

    [NotColumn]
    public User User { get; set; } = null!;
    [NotColumn]
    public User? ReviewedByUser { get; set; }
    [NotColumn]
    public ICollection<HolidayTransaction> Transactions { get; set; } = new List<HolidayTransaction>();
}