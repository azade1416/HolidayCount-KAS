using Backend.Models;

namespace Backend.DTOs;

public class UpdateUserDto
{
    public string? FullName { get; set; }
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
    public string? Role { get; set; }
    public EmploymentType? EmploymentType { get; set; }
    public Dictionary<DayOfWeek, DailyScheduleDto>? WorkSchedule { get; set; }
}