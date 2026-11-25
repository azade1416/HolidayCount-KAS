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
[Route("api/leave-requests")]
[Route("api/leaverequests")]
[Authorize]
public class LeaveRequestsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokens;
    private readonly IHolidayService _holidays;

    public LeaveRequestsController(AppDbContext db, ITokenService tokens, IHolidayService holidays)
    {
        _db = db;
        _tokens = tokens;
        _holidays = holidays;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLeaveRequestDto dto)
    {
        var user = await _tokens.ValidateAndGetUserAsync(User);
        if (user == null) return Unauthorized();

        if (dto.AccountId == Guid.Empty)
            return BadRequest(new { message = "A valid holiday account is required." });

        try
        {
            var result = await _holidays.CreateHolidayAsync(user.Id, dto.AccountId, dto.StartDate, dto.EndDate);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var user = await _tokens.ValidateAndGetUserAsync(User);
        if (user == null) return Unauthorized();
        try
        {
            var result = await _holidays.CreateCancellationAsync(user.Id, id);
            return StatusCode(201, result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = "accountant,admin")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var reviewer = await _tokens.ValidateAndGetUserAsync(User);
        if (reviewer == null) return Unauthorized();

        var existing = await _db.LeaveRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (existing == null) return NotFound();
        if (existing.Status != LeaveRequestStatus.Pending)
            return Conflict(new { message = "Only pending requests can be approved." });

        try
        {
            var result = await _holidays.ApproveAsync(id, reviewer.Id);
            return result == null ? Conflict() : Ok(result);
        }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = "accountant,admin")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectLeaveRequestDto? dto)
    {
        var reviewer = await _tokens.ValidateAndGetUserAsync(User);
        if (reviewer == null) return Unauthorized();
        var existing = await _db.LeaveRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (existing == null) return NotFound();
        if (existing.Status != LeaveRequestStatus.Pending)
            return Conflict(new { message = "Only pending requests can be rejected." });

        var result = await _holidays.RejectAsync(id, reviewer.Id, dto?.Reason);
        return Ok(result);
    }

    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer([FromBody] CreateTransferDto dto)
    {
        var user = await _tokens.ValidateAndGetUserAsync(User);
        if (user == null) return Unauthorized();
        if (!dto.WrittenAgreement)
            return BadRequest(new { message = "Written agreement is required." });

        try
        {
            var result = await _holidays.CreateTransferAsync(user.Id, dto.AccountId, dto.Hours);
            return StatusCode(201, result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpGet("pending")]
    [Authorize(Roles = "accountant,admin")]
    public async Task<IActionResult> Pending()
        => Ok(await _db.LeaveRequests.Where(x => x.Status == LeaveRequestStatus.Pending)
            .OrderByDescending(x => x.SubmittedAtUtc).ToListAsync());

    [HttpGet("history")]
    [Authorize(Roles = "accountant,admin")]
    public async Task<IActionResult> History()
        => Ok(await _db.LeaveRequests.Where(x => x.Status != LeaveRequestStatus.Pending)
            .OrderByDescending(x => x.SubmittedAtUtc).ToListAsync());

    [HttpGet("approved-holidays")]
    public async Task<IActionResult> ApprovedHolidays()
        => Ok(await _db.LeaveRequests.Where(x =>
            x.Status == LeaveRequestStatus.Approved
            && x.RequestType == LeaveRequestType.Holiday)
            .OrderBy(x => x.StartDate).ToListAsync());

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _tokens.ValidateAndGetUserAsync(User);
        if (user == null) return Unauthorized();
        var request = await _db.LeaveRequests.FirstOrDefaultAsync(x =>
            x.Id == id && (user.Role != "employee" || x.UserId == user.Id));
        if (request == null) return NotFound();
        if (user.Role == "employee" && request.UserId != user.Id) return Forbid();
        return Ok(request);
    }

    [HttpGet]
    public async Task<IActionResult> Mine()
    {
        var user = await _tokens.ValidateAndGetUserAsync(User);
        if (user == null) return Unauthorized();
        return Ok(await _db.LeaveRequests.Where(x => x.UserId == user.Id)
            .OrderByDescending(x => x.SubmittedAtUtc).ToListAsync());
    }

    [HttpGet("/api/employees/{employeeId:guid}/leave-requests")]
    [Authorize(Roles = "accountant,admin")]
    public async Task<IActionResult> ForEmployee(Guid employeeId)
        => Ok(await _db.LeaveRequests.Where(x => x.UserId == employeeId)
            .OrderByDescending(x => x.SubmittedAtUtc).ToListAsync());
}
