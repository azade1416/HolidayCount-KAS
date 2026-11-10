using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);
        
        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid username or password" });
        }
        var token = _authService.GenerateToken(user);

        return Ok(new 
        { 
            message = "Login successful", 
            token = token, 
            name = user.Fullname,
            username = user.Username, 
            role = user.Role 
        });
    }
    
    [HttpGet("users")]
    [Authorize] 
    public async Task<IActionResult> GetAllUsers()
    {
        var currentUser = await _authService.ValidateAndGetUserAsync(User);
        if (currentUser == null)
        {
            return Unauthorized(new { message = "User no longer exists or token is invalid" });
        }
        
        var users = await _context.Users.Select(u => new { u.Id, u.Fullname, u.Username, u.Role }).ToListAsync();
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
        if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
        {
            return BadRequest(new { message = "Username is already taken" });
        }
        
        string targetRole = string.IsNullOrWhiteSpace(dto.Role) ? "employee" : dto.Role.Trim().ToLowerInvariant();
        if (targetRole != "employee" && targetRole != "accountant" && targetRole != "admin")
        {
            return BadRequest(new { message = "Invalid role specified. Allowed roles: employee, accountant, admin" });
        }

        string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        var user = new User
        {
            Fullname = dto.FullName,
            Username = dto.Username,
            PasswordHash = passwordHash,
            Role = targetRole
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "User created successfully", id = user.Id, username = user.Username, role = user.Role });
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
        
        var targetUser = await _context.Users.FindAsync(id);
        if (targetUser == null)
        {
            return NotFound(new { message = "User not found" });
        }
        
        if (!string.IsNullOrEmpty(dto.FullName))
            targetUser.Fullname = dto.FullName;

        if (!string.IsNullOrEmpty(dto.Username))
        {
            if (await _context.Users.AnyAsync(u => u.Username == dto.Username && u.Id != id))
            {
                return BadRequest(new { message = "Username is already taken" });
            }
            targetUser.Username = dto.Username;
        }

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

        await _context.SaveChangesAsync();
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
        
        var targetUser = await _context.Users.FindAsync(id);
        if (targetUser == null)
        {
            return NotFound(new { message = "User not found" });
        }
        
        _context.Users.Remove(targetUser);
        await _context.SaveChangesAsync();

        return Ok(new { message = "User deleted successfully" });
    }
}
