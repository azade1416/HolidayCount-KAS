namespace Backend.DTOs;

public class HolidayRuleSettingsDto
{
    public decimal Weeks1To5HoursPerYear { get; set; } = 185m;
    public decimal Week6HoursPerYear { get; set; } = 37m;
    public decimal MainHolidayNoticeMonths { get; set; } = 3m;
    public decimal OtherHolidayNoticeMonths { get; set; } = 1m;
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
    public string Name { get; set; } = "Business Esbjerg defaults";
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
    public object? Value { get; set; }
    public DateOnly EffectiveFrom { get; set; }
}

public static class HolidayRuleSettingKeys
{
    public const string Weeks1To5HoursPerYear = "weeks1To5HoursPerYear";
    public const string Week6HoursPerYear = "week6HoursPerYear";
    public const string MainHolidayNoticeMonths = "mainHolidayNoticeMonths";
    public const string OtherHolidayNoticeMonths = "otherHolidayNoticeMonths";
    public const string TransfersEnabled = "transfersEnabled";
    public static readonly DateOnly DefaultsEffectiveFrom = new(2000, 1, 1);
}
