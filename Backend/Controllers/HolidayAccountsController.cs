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

        await _holidays.EnsureAccrualsAsync(employeeId, DateOnly.FromDateTime(DateTime.UtcNow));
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

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await _holidays.EnsureAccrualsAsync(current.Id, today);
        var accounts = await _db.HolidayBalances.Where(x => x.UserId == current.Id).ToListAsync();
        var approved = await _db.LeaveRequests.Where(x =>
            x.UserId == current.Id
            && x.Status == LeaveRequestStatus.Approved
            && x.RequestType == LeaveRequestType.Holiday).ToListAsync();

        var result = new List<object>();
        foreach (var account in accounts)
        {
            var projectedEarned = await _holidays.ProjectAccruedHoursAsync(current.Id, account, date);
            decimal usedByDate = 0;
            foreach (var request in approved.Where(x => x.AccountType == account.AccountType
                && x.StartDate <= date && x.EndDate >= account.UsagePeriodStart))
            {
                var start = request.StartDate < account.UsagePeriodStart ? account.UsagePeriodStart : request.StartDate;
                var end = request.EndDate > date ? date : request.EndDate;
                if (end > account.UsagePeriodEnd) end = account.UsagePeriodEnd;
                if (start <= end)
                    usedByDate += await _holidays.CalculateHoursAsync(current.Id, start, end);
            }

            result.Add(new
            {
                account.Id,
                name = account.AccountType == HolidayAccountType.Weeks1To5 ? "Weeks 1–5" : "Week 6",
                accruedHours = Math.Round(projectedEarned, 2),
                usedHours = Math.Round(usedByDate, 2),
                remainingHours = Math.Round(projectedEarned - usedByDate - account.TransferredHours, 2)
            });
        }
        return Ok(result);
    }
}
