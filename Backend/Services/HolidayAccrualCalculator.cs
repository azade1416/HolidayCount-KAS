namespace Backend.Services;

public static class HolidayAccrualCalculator
{
    public static decimal CalculateMonthlyHours(
        decimal accrualDaysPerMonth,
        decimal averageScheduledDayHours)
    {
        if (accrualDaysPerMonth < 0)
            throw new ArgumentOutOfRangeException(nameof(accrualDaysPerMonth));
        if (averageScheduledDayHours < 0)
            throw new ArgumentOutOfRangeException(nameof(averageScheduledDayHours));

        return decimal.Round(
            accrualDaysPerMonth * averageScheduledDayHours,
            2,
            MidpointRounding.AwayFromZero);
    }
}
