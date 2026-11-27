using Backend.Services;
using Xunit;

namespace Backend.Tests;

public class HolidayAccrualCalculatorTests
{
    [Theory]
    [InlineData(2.0833333333, 8, 16.67)]
    [InlineData(0.4166666667, 8, 3.33)]
    [InlineData(2.0833333333, 6, 12.50)]
    public void Monthly_accrual_uses_entitlement_and_employee_day_length(
        decimal accrualDaysPerMonth,
        decimal averageScheduledDayHours,
        decimal expectedHours)
    {
        var result = HolidayAccrualCalculator.CalculateMonthlyHours(
            accrualDaysPerMonth,
            averageScheduledDayHours);

        Assert.Equal(expectedHours, result);
    }

    [Theory]
    [InlineData(-1, 8)]
    [InlineData(2, -1)]
    public void Monthly_accrual_rejects_invalid_values(
        decimal accrualDaysPerMonth,
        decimal averageScheduledDayHours)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            HolidayAccrualCalculator.CalculateMonthlyHours(
                accrualDaysPerMonth,
                averageScheduledDayHours));
    }
}
