using Backend.Data;
using Backend.Models;
using Backend.Services;
using LinqToDB;
using LinqToDB.Async;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class HolidayAccountsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokens;
    private readonly IHolidayService _holidays;

    public HolidayAccountsController(AppDbContext db, ITokenService tokens, IHolidayService holidays)
    {
        _db = db;
        _tokens = tokens;
        _holidays = holidays;
    }

    [HttpGet("employees/{employeeId:guid}/holiday-accounts")]
    public async Task<IActionResult> Get(Guid employeeId)
    {
        var current = await _tokens.ValidateAndGetUserAsync(User);
        if (current == null) return Unauthorized();
        if (current.Role == "employee" && current.Id != employeeId)
            return NotFound();

        var accounts = await _db.HolidayBalances.Where(x => x.UserId == employeeId).ToListAsync();
        return Ok(accounts.Select(x => new
        {
            x.Id,
            employeeId = x.UserId,
            name = x.AccountType == HolidayAccountType.Weeks1To5 ? "Weeks 1–5" : "Week 6",
            accrued = new { hours = x.EarnedHours },
            used = new { hours = x.UsedHours },
            remaining = new { hours = x.EarnedHours - x.UsedHours - x.TransferredHours },
            eligibleDate = x.UsagePeriodStart.ToString("yyyy-MM-dd")
        }));
    }

    [HttpGet("employees/{employeeId:guid}/schedule")]
    [Authorize(Roles = "employee,accountant,admin")]
    public async Task<IActionResult> Schedule(Guid employeeId)
    {
        var current = await _tokens.ValidateAndGetUserAsync(User);
        if (current == null) return Unauthorized();
        if (current.Role == "employee" && current.Id != employeeId)
            return NotFound();

        var entries = await _db.WorkScheduleEntries
            .Where(x => x.UserId == employeeId && (x.EffectiveTo == null || x.EffectiveTo >= DateOnly.FromDateTime(DateTime.UtcNow)))
            .ToListAsync();

        var schedule = entries.ToDictionary(
            x => x.DayOfWeek.ToString(),
            x => new { from = x.StartTime.ToString("HH:mm"), to = x.EndTime.ToString("HH:mm") });
        return Ok(schedule);
    }

    [HttpGet("employees/{employeeId:guid}/schedule-history")]
    [Authorize(Roles = "accountant,admin")]
    public async Task<IActionResult> ScheduleHistory(Guid employeeId)
        => Ok(await _db.ScheduleChanges
            .Where(x => x.UserId == employeeId)
            .OrderByDescending(x => x.EffectiveFrom)
            .ToListAsync());

    [HttpGet("employees")]
    [Authorize(Roles = "employee,accountant,admin")]
    public async Task<IActionResult> Employees()
    {
        var users = await _db.Users.Where(x => x.Role == "employee").ToListAsync();
        return Ok(users.Select(x => new
        {
            x.Id,
            name = x.FullName,
            role = x.EmploymentType.ToFrontendString()
        }));
    }

    [HttpGet("holiday-accounts/future-balance")]
    public async Task<IActionResult> FutureBalance([FromQuery] DateOnly date)
    {
        var current = await _tokens.ValidateAndGetUserAsync(User);
        if (current == null) return Unauthorized();
        if (date < DateOnly.FromDateTime(DateTime.UtcNow))
            return BadRequest(new { message = "Date must be today or in the future." });

        var accounts = await _db.HolidayBalances.Where(x => x.UserId == current.Id).ToListAsync();
        var approved = await _db.LeaveRequests.Where(x =>
            x.UserId == current.Id
            && x.Status == LeaveRequestStatus.Approved
            && x.RequestType == LeaveRequestType.Holiday
            && x.StartDate <= date).ToListAsync();

        return Ok(accounts.Select(x =>
        {
            var futureUsed = approved
                .Where(r => r.AccountType == x.AccountType && r.StartDate >= DateOnly.FromDateTime(DateTime.UtcNow))
                .Sum(r => r.RequestedHours);
            return new
            {
                x.Id,
                name = x.AccountType == HolidayAccountType.Weeks1To5 ? "Weeks 1–5" : "Week 6",
                remainingHours = Math.Round(x.EarnedHours - x.UsedHours - futureUsed - x.TransferredHours, 2)
            };
        }));
    }
}
