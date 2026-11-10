namespace Backend.Models;

public class MonthlyAccrual
{
    public int Id { get; set; }
    public int HolidayBalanceId { get; set; }
    public DateOnly AccrualMonth { get; set; }
    public decimal EarnedDays { get; set; }
    public decimal EarnedHours { get; set; }
    public decimal QualifyingSalary { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public HolidayBalance HolidayBalance { get; set; } = null!;
}