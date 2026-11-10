namespace Backend.Models;

public class SystemParameter
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public decimal? NumericValue { get; set; }
    public string? TextValue { get; set; }
    public bool? BooleanValue { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string? Description { get; set; }
}