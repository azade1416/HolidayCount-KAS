using LinqToDB.Mapping;

namespace Backend.Models;

[Table("Users")]
public class User
{
    [PrimaryKey]
    [Column("Id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("FullName")]
    public string FullName { get; set; } = string.Empty;
    [Column("Email")]
    public string Email { get; set; } = string.Empty;
    [Column("PasswordHash")]
    public string PasswordHash { get; set; } = string.Empty; 
    [Column("Role")]
    public string Role { get; set; } = "employee";
    [Column("EmploymentType")]
    public EmploymentType EmploymentType { get; set; } = EmploymentType.FullTime;
    [Column("EmploymentStartDate")]
    public DateOnly EmploymentStartDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    [Column("EmploymentEndDate")]
    public DateOnly? EmploymentEndDate { get; set; }
    [Column("IsActive")]
    public bool IsActive { get; set; } = true;

    [NotColumn]
    public ICollection<WorkScheduleEntry> WorkScheduleEntries { get; set; } = new List<WorkScheduleEntry>();
    [NotColumn]
    public ICollection<HolidayBalance> HolidayBalances { get; set; } = new List<HolidayBalance>();
    [NotColumn]
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    [NotColumn]
    public ICollection<LeaveRequest> ReviewedLeaveRequests { get; set; } = new List<LeaveRequest>();
}