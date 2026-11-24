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
[Route("api/rule-presets")]
[Authorize(Roles = "admin")]
public class RulePresetsController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly AppDbContext _db;
    private readonly ITokenService _tokens;

    public RulePresetsController(AppDbContext db, ITokenService tokens)
    {
        _db = db;
        _tokens = tokens;
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

        var existing = await _db.RulePresets.ToListAsync();
        if (existing.Any(x => string.Equals(x.Name, name, StringComparison.OrdinalIgnoreCase)))
            return Conflict(new { message = "A preset with that name already exists." });

        var user = await _tokens.ValidateAndGetUserAsync(User);
        if (user == null) return Unauthorized();

        var preset = new RulePreset
        {
            Id = Guid.NewGuid(),
            Code = Guid.NewGuid().ToString("N"),
            Name = name,
            SettingsJson = JsonSerializer.Serialize(dto.Settings, JsonOptions),
            AccrualRatePerMonth = dto.Settings.Weeks1To5DaysPerMonth,
            Weeks1To5Enabled = true,
            Week6Enabled = dto.Settings.Week6DaysPerMonth > 0,
            EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow),
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByUserId = user.Id
        };

        await _db.InsertAsync(preset);
        return CreatedAtAction(nameof(Get), new { id = preset.Id }, ToResponse(preset));
    }

    private static RulePresetResponseDto ToResponse(RulePreset preset)
    {
        var settings = JsonSerializer.Deserialize<HolidayRuleSettingsDto>(preset.SettingsJson, JsonOptions)
            ?? throw new InvalidOperationException($"Preset '{preset.Id}' has invalid settings JSON.");
        return new RulePresetResponseDto { Id = preset.Id, Name = preset.Name, Settings = settings };
    }

    private static bool IsValid(HolidayRuleSettingsDto settings)
        => settings.Weeks1To5DaysPerMonth is >= 0 and <= 10
            && settings.Week6DaysPerMonth is >= 0 and <= 10
            && settings.MainHolidayNoticeMonths is >= 0 and <= 12
            && settings.OtherHolidayNoticeMonths is >= 0 and <= 12;
}
