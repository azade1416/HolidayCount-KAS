using LinqToDB.Mapping;

namespace Backend.Models;

[Table("WorkScheduleEntries")]
public class WorkScheduleEntry
{
    [PrimaryKey]
    [Column("Id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("UserId")]
    public Guid UserId { get; set; }
    [Column("DayOfWeek")]
    public DayOfWeek DayOfWeek { get; set; }
    [Column("Hours")]
    public decimal Hours { get; set; }
    [Column("EffectiveFrom")]
    public DateOnly EffectiveFrom { get; set; }
    [Column("EffectiveTo")]
    public DateOnly? EffectiveTo { get; set; }

    [NotColumn]
    public User User { get; set; } = null!;
}
