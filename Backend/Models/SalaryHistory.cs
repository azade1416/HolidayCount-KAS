using LinqToDB.Mapping;

namespace Backend.Models;

[Table("SalaryHistory")]
public class SalaryHistory
{
    [PrimaryKey]
    [Column("Id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("UserId")]
    public Guid UserId { get; set; }
    [Column("EffectiveFrom")]
    public DateOnly EffectiveFrom { get; set; }
    [Column("EffectiveTo")]
    public DateOnly? EffectiveTo { get; set; }
    [Column("MonthlySalary")]
    public decimal? MonthlySalary { get; set; }
    [Column("HourlyRate")]
    public decimal? HourlyRate { get; set; }
    [Column("HolidayQualifyingSalary")]
    public decimal HolidayQualifyingSalary { get; set; }

    [NotColumn]
    public User User { get; set; } = null!;
}
