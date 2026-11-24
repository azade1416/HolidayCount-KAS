using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using LinqToDB;
using LinqToDB.Async;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/system-parameters")]
[Authorize(Roles = "admin")]
public class SystemParametersController : ControllerBase
{
    private readonly AppDbContext _db;

    public SystemParametersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> History()
    {
        var rows = await _db.SystemParameters
            .OrderBy(x => x.EffectiveFrom)
            .ThenBy(x => x.Key)
            .ToListAsync();
        return Ok(rows.Select(ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveHolidayRulesDto dto)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (dto.EffectiveFrom <= today)
            return BadRequest(new { message = "Rule changes must take effect in the future." });
        if (!IsValid(dto.Settings))
            return BadRequest(new { message = "Rule values are outside the allowed range." });
        if (await _db.SystemParameters.AnyAsync(x => x.EffectiveFrom == dto.EffectiveFrom))
            return Conflict(new { message = "Rules already exist for that effective date." });

        var values = ToValues(dto.Settings);
        await using var transaction = await _db.BeginTransactionAsync();
        var rows = values.Select(value => new SystemParameter
        {
            Id = Guid.NewGuid(),
            Key = value.Key,
            NumericValue = value.NumericValue,
            BooleanValue = value.BooleanValue,
            EffectiveFrom = dto.EffectiveFrom,
            Description = value.Description
        }).ToArray();

        foreach (var row in rows)
            await _db.InsertAsync(row);
        await transaction.CommitAsync();
        return StatusCode(201, rows.Select(ToResponse));
    }

    private static SystemParameterResponseDto ToResponse(SystemParameter row)
    {
        object value = row.NumericValue.HasValue
            ? row.NumericValue.Value
            : row.BooleanValue ?? throw new InvalidOperationException(
                $"System parameter '{row.Key}' has no numeric or boolean value.");
        return new SystemParameterResponseDto
        {
            Key = row.Key,
            Value = value,
            EffectiveFrom = row.EffectiveFrom
        };
    }

    private static (string Key, decimal? NumericValue, bool? BooleanValue, string Description)[] ToValues(
        HolidayRuleSettingsDto settings)
        =>
        [
            (HolidayRuleSettingKeys.Weeks1To5DaysPerMonth, settings.Weeks1To5DaysPerMonth, null, "Weeks 1–5 holiday accrual in days per month."),
            (HolidayRuleSettingKeys.Week6DaysPerMonth, settings.Week6DaysPerMonth, null, "Week 6 holiday accrual in days per month."),
            (HolidayRuleSettingKeys.MainHolidayNoticeMonths, settings.MainHolidayNoticeMonths, null, "Notice period for the main holiday."),
            (HolidayRuleSettingKeys.OtherHolidayNoticeMonths, settings.OtherHolidayNoticeMonths, null, "Notice period for other holidays."),
            (HolidayRuleSettingKeys.TransfersEnabled, null, settings.TransfersEnabled, "Whether unused holiday may be transferred.")
        ];

    private static bool IsValid(HolidayRuleSettingsDto settings)
        => settings.Weeks1To5DaysPerMonth is >= 0 and <= 10
            && settings.Week6DaysPerMonth is >= 0 and <= 10
            && settings.MainHolidayNoticeMonths is >= 0 and <= 12
            && settings.OtherHolidayNoticeMonths is >= 0 and <= 12;
}
