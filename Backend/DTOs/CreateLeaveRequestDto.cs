using System.ComponentModel.DataAnnotations;
using Backend.Models;

namespace Backend.DTOs;

public class CreateLeaveRequestDto : IValidatableObject
{
    [Required]
    [EnumDataType(typeof(HolidayAccountType))]
    public HolidayAccountType AccountType { get; set; }

    [Required]
    public DateOnly StartDate { get; set; }

    [Required]
    public DateOnly EndDate { get; set; }

    [Range(0.001, double.MaxValue)]
    public decimal RequestedDays { get; set; }

    [Range(0, double.MaxValue)]
    public decimal RequestedHours { get; set; }

    public bool IsMainHoliday { get; set; }

    [MaxLength(2000)]
    public string? Reason { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (StartDate == default)
        {
            yield return new ValidationResult(
                "StartDate is required.",
                new[] { nameof(StartDate) });
        }

        if (EndDate == default)
        {
            yield return new ValidationResult(
                "EndDate is required.",
                new[] { nameof(EndDate) });
        }

        if (StartDate > EndDate)
        {
            yield return new ValidationResult(
                "StartDate must be before or equal to EndDate.",
                new[] { nameof(StartDate), nameof(EndDate) });
        }

        if (AccountType == HolidayAccountType.Week6 && RequestedHours <= 0)
        {
            yield return new ValidationResult(
                "Week 6 requests must include requested hours.",
                new[] { nameof(RequestedHours) });
        }
    }
}
