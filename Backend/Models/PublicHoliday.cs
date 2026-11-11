using LinqToDB.Mapping;

namespace Backend.Models;

[Table("PublicHolidays")]
public class PublicHoliday
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateOnly Date { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsCompanySpecific { get; set; }
}
