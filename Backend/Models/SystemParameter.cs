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
    [Column("NumericValue")]
    public decimal? NumericValue { get; set; }
    [Column("TextValue")]
    public string? TextValue { get; set; }
    [Column("BooleanValue")]
    public bool? BooleanValue { get; set; }
    [Column("EffectiveFrom")]
    public DateOnly EffectiveFrom { get; set; }
    [Column("EffectiveTo")]
    public DateOnly? EffectiveTo { get; set; }
    [Column("Description")]
    public string? Description { get; set; }
}