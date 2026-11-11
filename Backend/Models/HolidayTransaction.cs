using LinqToDB.Mapping;

namespace Backend.Models;

[Table("HolidayTransactions")]
public class HolidayTransaction
{
    [PrimaryKey]
    [Column("Id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("HolidayBalanceId")]
    public Guid HolidayBalanceId { get; set; }
    [Column("TransactionType")]
    public HolidayTransactionType TransactionType { get; set; }
    [Column("TransactionDate")]
    public DateOnly TransactionDate { get; set; }
    [Column("Units")]
    public decimal Units { get; set; }
    [Column("LeaveRequestId")]
    public Guid? LeaveRequestId { get; set; }
    [Column("Notes")]
    public string? Notes { get; set; }

    [NotColumn]
    public HolidayBalance HolidayBalance { get; set; } = null!;
    [NotColumn]
    public LeaveRequest? LeaveRequest { get; set; }
}
