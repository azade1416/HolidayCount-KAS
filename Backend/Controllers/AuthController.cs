using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using LinqToDB;
using LinqToDB.Async;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ITokenService = Backend.Services.ITokenService;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ITokenService _authService;

    public AuthController(AppDbContext context, ITokenService tokenService)
    {
        _context = context;
        _authService = tokenService;
    }
    
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var email = dto.Email.Trim();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        
        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }
        var token = _authService.GenerateToken(user);

        return Ok(new 
        { 
            message = "Login successful", 
            token = token, 
            name = user.FullName,
            email = user.Email,
            role = user.Role 
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var user = await _authService.ValidateAndGetUserAsync(User);
        if (user == null) return Unauthorized();
        return Ok(new
        {
            user.Id,
            name = user.FullName,
            email = user.Email,
            role = user.Role,
            employmentType = user.EmploymentType.ToString()
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout() => NoContent();
    
    [HttpGet("users")]
    [Authorize(Roles = "admin,accountant")]
    public async Task<IActionResult> GetAllUsers()
    {
        var currentUser = await _authService.ValidateAndGetUserAsync(User);
        if (currentUser == null)
        {
            return Unauthorized(new { message = "User no longer exists or token is invalid" });
        }
        
        var users = await _context.Users.Select(u => new { u.Id, u.FullName, u.Email, u.Role, u.EmploymentType }).ToListAsync();
        return Ok(users);
    }
    
    [HttpPost("users")]
    [Authorize]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        var currentUser = await _authService.ValidateAndGetUserAsync(User);
        if (currentUser == null)
        {
            return Unauthorized(new { message = "User no longer exists" });
        }
        
        if (currentUser.Role != "admin")
        {
            return StatusCode(403, new { message = "Only administrators can manage users." });
        }
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
        {
            return BadRequest(new { message = "Email is already taken" });
        }
        
        string targetRole = string.IsNullOrWhiteSpace(dto.Role) ? "employee" : dto.Role.Trim().ToLowerInvariant();
        if (targetRole != "employee" && targetRole != "accountant" && targetRole != "admin")
        {
            return BadRequest(new { message = "Invalid role specified. Allowed roles: employee, accountant, admin" });
        }

        string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        var user = new User
        {
            FullName = dto.FullName,
            Email = dto.Email,
            PasswordHash = passwordHash,
            Role = targetRole
        };

        await _context.InsertAsync(user);

        await InsertScheduleAsync(user, dto.WorkSchedule);
        return StatusCode(201, new { message = "User created successfully", id = user.Id, email = user.Email, role = user.Role });
    }
    
    [HttpPut("users/{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserDto dto)
    {
        var currentUser = await _authService.ValidateAndGetUserAsync(User);
        if (currentUser == null)
        {
            return Unauthorized(new { message = "User no longer exists" });
        }
        if (currentUser.Role != "admin")
        {
            return StatusCode(403, new { message = "Only administrators can manage users." });
        }
        
        var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (targetUser == null)
        {
            return NotFound(new { message = "User not found" });
        }
        
        if (!string.IsNullOrEmpty(dto.FullName))
            targetUser.FullName = dto.FullName;

        if (!string.IsNullOrEmpty(dto.Password))
        {
            targetUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        }
        
        if (!string.IsNullOrWhiteSpace(dto.Role))
        {
            string newRole = dto.Role.Trim().ToLowerInvariant();
            if (newRole != "employee" && newRole != "accountant" && newRole != "admin")
            {
                return BadRequest(new { message = "Invalid role specified. Allowed roles: employee, accountant, admin" });
            }
            targetUser.Role = newRole;
        }

        await _context.UpdateAsync(targetUser);
        if (dto.Email != null)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email && u.Id != id))
                return BadRequest(new { message = "Email is already taken" });
            targetUser.Email = dto.Email;
        }
        if (dto.Name != null) targetUser.FullName = dto.Name;
        if (dto.EmploymentType.HasValue) targetUser.EmploymentType = dto.EmploymentType.Value;
        if (dto.WorkSchedule != null)
            await ReplaceScheduleAsync(targetUser, dto.WorkSchedule, currentUser.Id);
        return Ok(new { message = "User updated successfully" });
    }
    
    [HttpDelete("users/{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var currentUser = await _authService.ValidateAndGetUserAsync(User);
        if (currentUser == null)
        {
            return Unauthorized(new { message = "User no longer exists" });
        }
        
        if (currentUser.Role != "admin")
        {
            return StatusCode(403, new { message = "Only administrators can manage users." });
        }
        
        var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (targetUser == null)
        {
            return NotFound(new { message = "User not found" });
        }
        
        await _context.DeleteAsync(targetUser);

        return Ok(new { message = "User deleted successfully" });
    }

    private async Task InsertScheduleAsync(User user, Dictionary<DayOfWeek, DailyScheduleDto> schedule)
    {
        if (user.Role != "employee") return;

        foreach (var item in schedule)
        {
            if (!TimeOnly.TryParse(item.Value.From, out var start)
                || !TimeOnly.TryParse(item.Value.To, out var end)
                || start >= end)
                throw new ArgumentException("Invalid working schedule.");

            await _context.InsertAsync(new WorkScheduleEntry
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                DayOfWeek = item.Key,
                StartTime = start,
                EndTime = end,
                EffectiveFrom = DateOnly.FromDateTime(DateTime.UtcNow)
            });
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        foreach (var accountType in new[] { HolidayAccountType.Weeks1To5, HolidayAccountType.Week6 })
        {
            await _context.InsertAsync(new HolidayBalance
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                AccountType = accountType,
                EarningYear = today.Year,
                EarningPeriodStart = new DateOnly(today.Year, 9, 1),
                EarningPeriodEnd = new DateOnly(today.Year + 1, 8, 31),
                UsagePeriodStart = new DateOnly(today.Year, 9, 1),
                UsagePeriodEnd = new DateOnly(today.Year + 1, 12, 31)
            });
        }
    }

    private async Task ReplaceScheduleAsync(User user, Dictionary<DayOfWeek, DailyScheduleDto> schedule, Guid changedBy)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var oldEntries = await _context.WorkScheduleEntries
            .Where(x => x.UserId == user.Id && (x.EffectiveTo == null || x.EffectiveTo >= today))
            .ToListAsync();
        var previousJson = System.Text.Json.JsonSerializer.Serialize(oldEntries.Select(x => new
        {
            day = x.DayOfWeek,
            from = x.StartTime.ToString("HH:mm"),
            to = x.EndTime.ToString("HH:mm")
        }));

        foreach (var entry in oldEntries)
        {
            entry.EffectiveTo = today.AddDays(-1);
            await _context.UpdateAsync(entry);
        }

        foreach (var item in schedule)
        {
            if (!TimeOnly.TryParse(item.Value.From, out var start)
                || !TimeOnly.TryParse(item.Value.To, out var end)
                || start >= end)
                throw new ArgumentException("Invalid working schedule.");

            await _context.InsertAsync(new WorkScheduleEntry
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                DayOfWeek = item.Key,
                StartTime = start,
                EndTime = end,
                EffectiveFrom = today
            });
        }

        await _context.InsertAsync(new ScheduleChange
        {
            UserId = user.Id,
            EffectiveFrom = today,
            PreviousScheduleJson = previousJson,
            NewScheduleJson = System.Text.Json.JsonSerializer.Serialize(schedule),
            CreatedByUserId = changedBy
        });
    }
}
