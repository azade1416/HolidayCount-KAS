using LinqToDB.Mapping;

namespace Backend.Models;

[Table("PublicHolidays")]
public class PublicHoliday
{
    [PrimaryKey]
    [Column("Id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("Date")]
    public DateOnly Date { get; set; }
    [Column("Name")]
    public string Name { get; set; } = string.Empty;
    [Column("IsCompanySpecific")]
    public bool IsCompanySpecific { get; set; }
}
