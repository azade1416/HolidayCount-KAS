using System.ComponentModel.DataAnnotations;
using Backend.Models;

namespace Backend.DTOs;

public class CreateUserDto
{
    [Required(ErrorMessage = "Name is required")]
    public string FullName { get; set; } = string.Empty;
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required(ErrorMessage = "Password is required")]
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "employee";
    public EmploymentType EmploymentType { get; set; } = EmploymentType.FullTime;
    public Dictionary<DayOfWeek, DailyScheduleDto> WorkSchedule { get; set; } = new();
}