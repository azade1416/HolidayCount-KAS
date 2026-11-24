using LinqToDB.Mapping;

namespace Backend.Models;

[Table("RulePresets")]
public class RulePreset
{
    [PrimaryKey]
    [Column("Id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("Name")]
    public string Name { get; set; } = string.Empty;
    [Column("Settings")]
    public string Settings { get; set; } = "{}";
}
