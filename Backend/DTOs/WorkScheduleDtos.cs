using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class DailyScheduleDto
{
    [Required]
    public string From { get; set; } = "08:00";
    [Required]
    public string To { get; set; } = "16:00";
}

public class RejectLeaveRequestDto
{
    public string? Reason { get; set; }
}

public class CreateCancellationDto
{
    [Required]
    public Guid OriginalRequestId { get; set; }
}

public class CreateTransferDto
{
    [Required]
    public Guid AccountId { get; set; }
    [Range(0.01, 37)]
    public decimal Hours { get; set; }
    [Required]
    public bool WrittenAgreement { get; set; }
}

public class CreateAnnouncementDto
{
    [Required]
    [MinLength(1)]
    public string Message { get; set; } = string.Empty;
}
