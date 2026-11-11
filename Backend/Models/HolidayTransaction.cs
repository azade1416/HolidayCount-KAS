using LinqToDB.Mapping;

namespace Backend.Models;

[Table("HolidayTransactions")]
public class HolidayTransaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HolidayBalanceId { get; set; }
    public HolidayTransactionType TransactionType { get; set; }
    public DateOnly TransactionDate { get; set; }
    public decimal Units { get; set; }
    public Guid? LeaveRequestId { get; set; }
    public string? Notes { get; set; }

    public HolidayBalance HolidayBalance { get; set; } = null!;
    public LeaveRequest? LeaveRequest { get; set; }
}
