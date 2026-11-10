namespace Backend.Models;

public class WorkScheduleEntry
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public decimal Hours { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }

    public User User { get; set; } = null!;
}
