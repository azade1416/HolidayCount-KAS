using LinqToDB.Mapping;

namespace Backend.Models;

[Table("MonthlyAccruals")]
public class MonthlyAccrual
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HolidayBalanceId { get; set; }
    public DateOnly AccrualMonth { get; set; }
    public decimal EarnedDays { get; set; }
    public decimal EarnedHours { get; set; }
    public decimal QualifyingSalary { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public HolidayBalance HolidayBalance { get; set; } = null!;
}