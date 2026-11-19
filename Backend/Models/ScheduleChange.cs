using LinqToDB.Mapping;

namespace Backend.Models;

[Table("ScheduleChanges")]
public class ScheduleChange
{
    [PrimaryKey]
    [Column("Id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("UserId")]
    public Guid UserId { get; set; }
    [Column("EffectiveFrom")]
    public DateOnly EffectiveFrom { get; set; }
    [Column("PreviousScheduleJson")]
    public string? PreviousScheduleJson { get; set; }
    [Column("NewScheduleJson")]
    public string NewScheduleJson { get; set; } = "{}";
    [Column("CreatedAtUtc")]
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    [Column("CreatedByUserId")]
    public Guid? CreatedByUserId { get; set; }
}
