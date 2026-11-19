namespace Backend.Models;

public enum EmploymentType
{
    FullTime,
    PartTime
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
