using LinqToDB.Mapping;

namespace Backend.Models;

[Table("WorkScheduleEntries")]
public class WorkScheduleEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public decimal Hours { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }

    public User User { get; set; } = null!;
}
