namespace Backend.Models;

public class HolidayBalance
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public HolidayAccountType AccountType { get; set; }
    public int EarningYear { get; set; }
    public DateOnly EarningPeriodStart { get; set; }
    public DateOnly EarningPeriodEnd { get; set; }
    public DateOnly UsagePeriodStart { get; set; }
    public DateOnly UsagePeriodEnd { get; set; }
    public decimal EarnedUnits { get; set; }
    public decimal UsedUnits { get; set; }
    public decimal TransferredUnits { get; set; }
    public decimal PaidOutUnits { get; set; }
    public decimal QualifyingSalary { get; set; }
    public decimal HolidaySupplementAmount { get; set; }

    public User User { get; set; } = null!;
    public ICollection<MonthlyAccrual> MonthlyAccruals { get; set; } = new List<MonthlyAccrual>();
    public ICollection<HolidayTransaction> Transactions { get; set; } = new List<HolidayTransaction>();
}