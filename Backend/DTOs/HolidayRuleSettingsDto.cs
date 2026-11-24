namespace Backend.DTOs;

public class HolidayRuleSettingsDto
{
    public decimal Weeks1To5DaysPerMonth { get; set; } = 2.08m;
    public decimal Week6DaysPerMonth { get; set; } = 0.42m;
    public decimal MainHolidayNoticeMonths { get; set; } = 3m;
    public decimal OtherHolidayNoticeMonths { get; set; } = 1m;
    public bool TransfersEnabled { get; set; } = true;
}

public class CreateRulePresetDto
{
    public string Name { get; set; } = string.Empty;
    public HolidayRuleSettingsDto Settings { get; set; } = new();
}

public class SaveHolidayRulesDto
{
    public DateOnly EffectiveFrom { get; set; }
    public HolidayRuleSettingsDto Settings { get; set; } = new();
}

public class RulePresetResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public HolidayRuleSettingsDto Settings { get; set; } = new();
}

public class SystemParameterResponseDto
{
    public string Key { get; set; } = string.Empty;
    public object Value { get; set; } = 0m;
    public DateOnly EffectiveFrom { get; set; }
}

public static class HolidayRuleSettingKeys
{
    public const string Weeks1To5DaysPerMonth = "weeks1To5DaysPerMonth";
    public const string Week6DaysPerMonth = "week6DaysPerMonth";
    public const string MainHolidayNoticeMonths = "mainHolidayNoticeMonths";
    public const string OtherHolidayNoticeMonths = "otherHolidayNoticeMonths";
    public const string TransfersEnabled = "transfersEnabled";
    public static readonly DateOnly DefaultsEffectiveFrom = new(2000, 1, 1);
}
