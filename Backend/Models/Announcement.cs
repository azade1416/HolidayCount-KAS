using LinqToDB.Mapping;

namespace Backend.Models;

[Table("Announcements")]
public class Announcement
{
    [PrimaryKey]
    [Column("Id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("Message")]
    public string Message { get; set; } = string.Empty;
    [Column("CreatedAtUtc")]
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    [Column("CreatedByUserId")]
    public Guid? CreatedByUserId { get; set; }
}
