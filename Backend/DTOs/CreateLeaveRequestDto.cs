using System.ComponentModel.DataAnnotations;
using Backend.Models;

namespace Backend.DTOs;

public class CreateLeaveRequestDto : IValidatableObject
{
    [Required]
    public Guid AccountId { get; set; }

    [Required]
    public DateOnly StartDate { get; set; }

    [Required]
    public DateOnly EndDate { get; set; }

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

    }
}
