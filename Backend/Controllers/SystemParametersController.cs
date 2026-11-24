using System.Text.Json;
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
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly AppDbContext _db;

    public SystemParametersController(AppDbContext db)
    {
        _db = db;
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
        var values = ToValues(dto.Settings);
        var keys = values.Select(value => value.Key).ToArray();
        if (await _db.SystemParameters.AnyAsync(x =>
                x.EffectiveFrom == dto.EffectiveFrom && keys.Contains(x.Key)))
            return Conflict(new { message = "Rules already exist for one or more keys on that effective date." });

        await using var transaction = await _db.BeginTransactionAsync();
        var rows = values.Select(value => new SystemParameter
        {
            Id = Guid.NewGuid(),
            Key = value.Key,
            Value = JsonSerializer.Serialize(value.Value, JsonOptions),
            EffectiveFrom = dto.EffectiveFrom
        }).ToArray();

        foreach (var row in rows)
            await _db.InsertAsync(row);

        var preset = new RulePreset
        {
            Id = Guid.NewGuid(),
            Name = name,
            Settings = JsonSerializer.Serialize(dto.Settings, JsonOptions)
        };
        await _db.InsertAsync(preset);
        await transaction.CommitAsync();
        return StatusCode(201, rows.Select(ToResponse));
    }

    private static SystemParameterResponseDto ToResponse(SystemParameter row)
    {
        return new SystemParameterResponseDto
        {
            Key = row.Key,
            Value = ParseValue(row),
            EffectiveFrom = row.EffectiveFrom
        };
    }

    private static object? ParseValue(SystemParameter row)
    {
        using var document = JsonDocument.Parse(row.Value);
        var value = document.RootElement;
        return value.ValueKind switch
        {
            JsonValueKind.Number => value.GetDecimal(),
            JsonValueKind.String => value.GetString(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            JsonValueKind.Array or JsonValueKind.Object => value.Clone(),
            _ => throw new InvalidOperationException($"System parameter '{row.Key}' has an invalid value.")
        };
    }

    private static (string Key, object Value)[] ToValues(HolidayRuleSettingsDto settings)
        =>
        [
            (HolidayRuleSettingKeys.Weeks1To5HoursPerYear, settings.Weeks1To5HoursPerYear),
            (HolidayRuleSettingKeys.Week6HoursPerYear, settings.Week6HoursPerYear),
            (HolidayRuleSettingKeys.MainHolidayNoticeMonths, settings.MainHolidayNoticeMonths),
            (HolidayRuleSettingKeys.OtherHolidayNoticeMonths, settings.OtherHolidayNoticeMonths)
        ];

    private static bool IsValid(HolidayRuleSettingsDto settings)
        => settings.Weeks1To5HoursPerYear is >= 0 and <= 500
            && settings.Week6HoursPerYear is >= 0 and <= 100
            && settings.MainHolidayNoticeMonths is >= 0 and <= 12
            && settings.OtherHolidayNoticeMonths is >= 0 and <= 12;
}
