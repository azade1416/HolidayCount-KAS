using LinqToDB.Mapping;

namespace Backend.Models;

[Table("RulePresets")]
public class RulePreset
{
    [PrimaryKey]
    [Column("Id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("Code")]
    public string Code { get; set; } = string.Empty;
    [Column("Name")]
    public string Name { get; set; } = string.Empty;
    [Column("AccrualRatePerMonth")]
    public decimal AccrualRatePerMonth { get; set; }
    [Column("Weeks1To5Enabled")]
    public bool Weeks1To5Enabled { get; set; } = true;
    [Column("Week6Enabled")]
    public bool Week6Enabled { get; set; } = true;
    [Column("EffectiveFrom")]
    public DateOnly EffectiveFrom { get; set; }
    [Column("EffectiveTo")]
    public DateOnly? EffectiveTo { get; set; }
    [Column("IsActive")]
    public bool IsActive { get; set; } = true;
    [Column("CreatedAtUtc")]
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    [Column("CreatedByUserId")]
    public Guid? CreatedByUserId { get; set; }
}
