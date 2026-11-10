namespace Backend.Models;

public class SalaryHistory
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public decimal? MonthlySalary { get; set; }
    public decimal? HourlyRate { get; set; }
    public decimal HolidayQualifyingSalary { get; set; }

    public User User { get; set; } = null!;
}
