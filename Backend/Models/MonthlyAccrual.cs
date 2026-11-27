using LinqToDB.Mapping;

namespace Backend.Models;

[Table("MonthlyAccruals")]
public class MonthlyAccrual
{
    [PrimaryKey]
    [Column("Id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("HolidayBalanceId")]
    public Guid HolidayBalanceId { get; set; }
    [Column("AccrualMonth")]
    public DateOnly AccrualMonth { get; set; }
    [Column("EarnedHours")]
    public decimal EarnedHours { get; set; }
    [Column("AccrualRatePerMonth")]
    public decimal AccrualRatePerMonth { get; set; }
    [Column("AverageDayHours")]
    public decimal AverageDayHours { get; set; }
    [Column("CreatedAtUtc")]
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    [NotColumn]
    public HolidayBalance HolidayBalance { get; set; } = null!;
}