using LinqToDB.Mapping;

namespace Backend.Models;

[Table("SystemParameters")]
public class SystemParameter
{
    [PrimaryKey]
    [Column("Id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("Key")]
    public string Key { get; set; } = string.Empty;
    [Column("Value")]
    public string Value { get; set; } = "null";
    [Column("EffectiveFrom")]
    public DateOnly EffectiveFrom { get; set; }
}