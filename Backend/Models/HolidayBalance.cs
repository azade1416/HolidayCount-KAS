using LinqToDB.Mapping;

namespace Backend.Models;

[Table("HolidayBalances")]
public class HolidayBalance
{
    [PrimaryKey]
    [Column("Id")]
    public Guid Id { get; set; } = Guid.NewGuid();
    [Column("UserId")]
    public Guid UserId { get; set; }
    [Column("AccountType")]
    public HolidayAccountType AccountType { get; set; }
    [Column("EarningYear")]
    public int EarningYear { get; set; }
    [Column("EarningPeriodStart")]
    public DateOnly EarningPeriodStart { get; set; }
    [Column("EarningPeriodEnd")]
    public DateOnly EarningPeriodEnd { get; set; }
    [Column("UsagePeriodStart")]
    public DateOnly UsagePeriodStart { get; set; }
    [Column("UsagePeriodEnd")]
    public DateOnly UsagePeriodEnd { get; set; }
    [Column("EarnedUnits")]
    public decimal EarnedUnits { get; set; }
    [Column("UsedUnits")]
    public decimal UsedUnits { get; set; }
    [Column("TransferredUnits")]
    public decimal TransferredUnits { get; set; }
    [Column("PaidOutUnits")]
    public decimal PaidOutUnits { get; set; }
    [Column("QualifyingSalary")]
    public decimal QualifyingSalary { get; set; }
    [Column("HolidaySupplementAmount")]
    public decimal HolidaySupplementAmount { get; set; }

    [NotColumn]
    public User User { get; set; } = null!;
    [NotColumn]
    public ICollection<MonthlyAccrual> MonthlyAccruals { get; set; } = new List<MonthlyAccrual>();
    [NotColumn]
    public ICollection<HolidayTransaction> Transactions { get; set; } = new List<HolidayTransaction>();
}