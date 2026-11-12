namespace Backend.Models;

public enum EmploymentType
{
    Salaried,
    Hourly
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

public enum HolidayTransactionType
{
    Accrual,
    Usage,
    Transfer,
    Payout,
    Adjustment
}
