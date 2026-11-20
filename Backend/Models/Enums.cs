namespace Backend.Models;

public enum EmploymentType
{
    FullTime,
    PartTime
}

public static class EmploymentTypeExtensions
{
    public static string? ToFrontendString(this EmploymentType employmentType)
        => ((EmploymentType?)employmentType).ToFrontendString();

    public static string? ToFrontendString(this EmploymentType? employmentType)
        => employmentType switch
        {
            EmploymentType.FullTime => "Full-time employee",
            EmploymentType.PartTime => "Part-time employee",
            _ => null
        };
}

public enum HolidayAccountType
{
    Weeks1To5,
    Week6
}

public enum LeaveRequestStatus
{
    Pending,
    Approved,
    Rejected,
    Cancelled
}

public enum LeaveRequestType
{
    Holiday,
    Cancellation,
    Transfer
}

public enum HolidayTransactionType
{
    Accrual,
    Usage,
    Transfer,
    Payout,
    Adjustment
}
