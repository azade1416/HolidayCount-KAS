namespace Backend.Models;

public class PublicHoliday
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsCompanySpecific { get; set; }
}
