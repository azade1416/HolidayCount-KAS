namespace Backend.Models;

public class HolidayTransaction
{
    public int Id { get; set; }
    public int HolidayBalanceId { get; set; }
    public HolidayTransactionType TransactionType { get; set; }
    public DateOnly TransactionDate { get; set; }
    public decimal Units { get; set; }
    public int? LeaveRequestId { get; set; }
    public string? Notes { get; set; }

    public HolidayBalance HolidayBalance { get; set; } = null!;
    public LeaveRequest? LeaveRequest { get; set; }
}
