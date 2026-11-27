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
[Route("api/rule-presets")]
[Authorize(Roles = "admin")]
public class RulePresetsController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly AppDbContext _db;

    public RulePresetsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var presets = await _db.RulePresets.OrderBy(x => x.Name).ToListAsync();
        return Ok(presets.Select(ToResponse));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var preset = await _db.RulePresets.FirstOrDefaultAsync(x => x.Id == id);
        return preset == null ? NotFound() : Ok(ToResponse(preset));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRulePresetDto dto)
    {
        var name = dto.Name.Trim();
        if (name.Length is < 1 or > 200)
            return BadRequest(new { message = "Preset name must contain 1 to 200 characters." });
        if (!IsValid(dto.Settings))
            return BadRequest(new { message = "Rule values are outside the allowed range." });

        var preset = new RulePreset
        {
            Id = Guid.NewGuid(),
            Name = name,
            Settings = JsonSerializer.Serialize(dto.Settings, JsonOptions)
        };

        await _db.InsertAsync(preset);
        return CreatedAtAction(nameof(Get), new { id = preset.Id }, ToResponse(preset));
    }

    private static RulePresetResponseDto ToResponse(RulePreset preset)
        => new()
        {
            Id = preset.Id,
            Name = preset.Name,
            Settings = JsonSerializer.Deserialize<HolidayRuleSettingsDto>(preset.Settings, JsonOptions)
                ?? throw new InvalidOperationException($"Preset '{preset.Id}' has invalid settings.")
        };

    private static bool IsValid(HolidayRuleSettingsDto settings)
        => settings.Weeks1To5HoursPerYear is >= 0 and <= 500
            && settings.Week6HoursPerYear is >= 0 and <= 100
            && settings.MainHolidayNoticeMonths is >= 0 and <= 12
            && settings.OtherHolidayNoticeMonths is >= 0 and <= 12;
}
