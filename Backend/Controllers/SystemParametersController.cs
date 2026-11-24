using System.Text.Json;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
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
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly AppDbContext _db;
    private readonly ITokenService _tokens;

    public SystemParametersController(AppDbContext db, ITokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

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
        var name = dto.Name.Trim();
        if (name.Length is < 1 or > 200)
            return BadRequest(new { message = "Preset name must contain 1 to 200 characters." });
        if (await _db.SystemParameters.AnyAsync(x => x.EffectiveFrom == dto.EffectiveFrom))
            return Conflict(new { message = "Rules already exist for that effective date." });

        var user = await _tokens.ValidateAndGetUserAsync(User);
        if (user == null) return Unauthorized();
        var previous = await _db.RulePresets
            .Where(x => x.Name.ToLower() == name.ToLower())
            .OrderByDescending(x => x.Version)
            .FirstOrDefaultAsync();
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

        var preset = new RulePreset
        {
            Id = Guid.NewGuid(),
            Code = Guid.NewGuid().ToString("N"),
            Name = name,
            SettingsJson = JsonSerializer.Serialize(dto.Settings, JsonOptions),
            Version = (previous?.Version ?? 0) + 1,
            PreviousVersionId = previous?.Id,
            Weeks1To5HoursPerYear = dto.Settings.Weeks1To5HoursPerYear,
            Week6HoursPerYear = dto.Settings.Week6HoursPerYear,
            MainHolidayNoticeMonths = dto.Settings.MainHolidayNoticeMonths,
            OtherHolidayNoticeMonths = dto.Settings.OtherHolidayNoticeMonths,
            AccrualRatePerMonth = dto.Settings.Weeks1To5HoursPerYear / 7.4m / 12m,
            Weeks1To5Enabled = true,
            Week6Enabled = dto.Settings.Week6HoursPerYear > 0,
            EffectiveFrom = dto.EffectiveFrom,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByUserId = user.Id
        };
        await _db.InsertAsync(preset);
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
            (HolidayRuleSettingKeys.Weeks1To5HoursPerYear, settings.Weeks1To5HoursPerYear, null, "Full-time annual holiday entitlement for weeks 1–5 in hours."),
            (HolidayRuleSettingKeys.Week6HoursPerYear, settings.Week6HoursPerYear, null, "Full-time annual holiday entitlement for week 6 in hours."),
            (HolidayRuleSettingKeys.MainHolidayNoticeMonths, settings.MainHolidayNoticeMonths, null, "Notice period for the main holiday."),
            (HolidayRuleSettingKeys.OtherHolidayNoticeMonths, settings.OtherHolidayNoticeMonths, null, "Notice period for other holidays.")
        ];

    private static bool IsValid(HolidayRuleSettingsDto settings)
        => settings.Weeks1To5HoursPerYear is >= 0 and <= 500
            && settings.Week6HoursPerYear is >= 0 and <= 100
            && settings.MainHolidayNoticeMonths is >= 0 and <= 12
            && settings.OtherHolidayNoticeMonths is >= 0 and <= 12;
}
