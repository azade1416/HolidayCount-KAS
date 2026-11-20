using Backend.Data;
using Backend.DTOs;
using Backend.Services;
using LinqToDB;
using LinqToDB.Async;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/announcements")]
[Authorize]
public class AnnouncementsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokens;

    public AnnouncementsController(AppDbContext db, ITokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
        => Ok(await _db.Announcements
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new { x.Id, x.Message, date = x.CreatedAtUtc.ToString("yyyy-MM-dd") })
            .ToListAsync());

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromBody] CreateAnnouncementDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Message))
            return BadRequest(new { message = "Message is required." });
        var user = await _tokens.ValidateAndGetUserAsync(User);
        var announcement = new Models.Announcement
        {
            Message = dto.Message.Trim(),
            CreatedByUserId = user?.Id
        };
        await _db.InsertAsync(announcement);
        return StatusCode(201, new
        {
            announcement.Id,
            announcement.Message,
            date = announcement.CreatedAtUtc.ToString("yyyy-MM-dd")
        });
    }
}
