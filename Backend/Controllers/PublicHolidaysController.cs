using Backend.Data;
using Backend.Models;
using LinqToDB;
using LinqToDB.Async;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/public-holidays")]
[Authorize]
public class PublicHolidaysController : ControllerBase
{
    private readonly AppDbContext _db;

    public PublicHolidaysController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var query = _db.PublicHolidays.Where(x =>
            (!from.HasValue || x.Date >= from.Value)
            && (!to.HasValue || x.Date <= to.Value));
        return Ok(await query.OrderBy(x => x.Date).ToListAsync());
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create(PublicHoliday dto)
    {
        if (await _db.PublicHolidays.AnyAsync(x => x.Date == dto.Date))
            return Conflict(new { message = "Public holiday already exists." });
        dto.Id = Guid.NewGuid();
        await _db.InsertAsync(dto);
        return StatusCode(201, dto);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(Guid id, PublicHoliday dto)
    {
        var existing = await _db.PublicHolidays.FirstOrDefaultAsync(x => x.Id == id);
        if (existing == null) return NotFound();
        existing.Date = dto.Date;
        existing.Name = dto.Name;
        existing.IsCompanySpecific = dto.IsCompanySpecific;
        await _db.UpdateAsync(existing);
        return Ok(existing);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var existing = await _db.PublicHolidays.FirstOrDefaultAsync(x => x.Id == id);
        if (existing == null) return NotFound();
        await _db.DeleteAsync(existing);
        return NoContent();
    }
}
