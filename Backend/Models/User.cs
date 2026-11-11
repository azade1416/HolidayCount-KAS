using LinqToDB.Mapping;

namespace Backend.Models;

[Table("Users")]
public class User
{
    [PrimaryKey]
    [Column("Id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("Fullname")]
    public string Fullname { get; set; } = string.Empty;
    [Column("Username")]
    public string Username { get; set; } = string.Empty;
    [Column("PasswordHash")]
    public string PasswordHash { get; set; } = string.Empty; 
    [Column("Role")]
    public string Role { get; set; } = "employee";
    [Column("EmploymentType")]
    public EmploymentType EmploymentType { get; set; } = EmploymentType.Salaried;
    [Column("EmploymentStartDate")]
    public DateOnly EmploymentStartDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    [Column("EmploymentEndDate")]
    public DateOnly? EmploymentEndDate { get; set; }
    [Column("IsActive")]
    public bool IsActive { get; set; } = true;

    public ICollection<WorkScheduleEntry> WorkScheduleEntries { get; set; } = new List<WorkScheduleEntry>();
    public ICollection<SalaryHistory> SalaryHistory { get; set; } = new List<SalaryHistory>();
    public ICollection<HolidayBalance> HolidayBalances { get; set; } = new List<HolidayBalance>();
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    public ICollection<LeaveRequest> ReviewedLeaveRequests { get; set; } = new List<LeaveRequest>();
}