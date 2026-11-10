namespace Backend.Models;

public class User
{
    public Guid Id { get; set; }
    public string Fullname { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty; 
    public string Role { get; set; } = "employee";
    public EmploymentType EmploymentType { get; set; } = EmploymentType.Salaried;
    public DateOnly EmploymentStartDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly? EmploymentEndDate { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<WorkScheduleEntry> WorkScheduleEntries { get; set; } = new List<WorkScheduleEntry>();
    public ICollection<SalaryHistory> SalaryHistory { get; set; } = new List<SalaryHistory>();
    public ICollection<HolidayBalance> HolidayBalances { get; set; } = new List<HolidayBalance>();
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    public ICollection<LeaveRequest> ReviewedLeaveRequests { get; set; } = new List<LeaveRequest>();
}