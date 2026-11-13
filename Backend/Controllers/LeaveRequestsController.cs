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
[Route("api/[controller]")]
[Authorize]
public class LeaveRequestsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ITokenService _tokenService;

    public LeaveRequestsController(AppDbContext context, ITokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLeaveRequestDto dto)
    {
        var currentUser = await _tokenService.ValidateAndGetUserAsync(User);
        if (currentUser == null)
        {
            return Unauthorized(new { message = "User no longer exists or token is invalid." });
        }

        if (!currentUser.IsActive)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "Inactive users cannot submit leave requests." });
        }

        var leaveRequest = new LeaveRequest
        {
            UserId = currentUser.Id,
            AccountType = dto.AccountType,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            RequestedDays = dto.RequestedDays,
            RequestedHours = dto.RequestedHours,
            IsMainHoliday = dto.IsMainHoliday,
            Reason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim()
        };

        await _context.InsertAsync(leaveRequest);

        return CreatedAtAction(
            nameof(GetById),
            new { id = leaveRequest.Id },
            leaveRequest);
    }
    
    [HttpPut("leaverequests/{guid}")]
    public async Task<IActionResult> CancelLeaveRequest(Guid guid)
    {
        var currentUser = await _tokenService.ValidateAndGetUserAsync(User);
        if (currentUser == null)
        {
            return Unauthorized(new { message = "User no longer exists or token is invalid." });
        }
        if (currentUser.Role != "employee")
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "Only employees can cancel leave requests." });
        }

        var leaveRequest = await _context.LeaveRequests.FirstOrDefaultAsync(lr => lr.Id == guid && lr.UserId == currentUser.Id);

        if (leaveRequest == null)
        {
            return NotFound(new { message = "Leave request not found." });
        }

        if (leaveRequest.Status != LeaveRequestStatus.Pending)
        {
            return BadRequest(new { message = "Only pending leave requests can be cancelled." });
        }

        leaveRequest.Status = LeaveRequestStatus.Cancelled;
        leaveRequest.ReviewedAtUtc = DateTime.UtcNow;
        leaveRequest.ReviewedByUserId = currentUser.Id;

        await _context.UpdateAsync(leaveRequest);

        return Ok(new { message = "Leave request cancelled successfully." });
    }

    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        var currentUser = await _tokenService.ValidateAndGetUserAsync(User);
        if (currentUser == null)
        {
            return Unauthorized(new { message = "User no longer exists or token is invalid." });
        }

        var requests = await _context.LeaveRequests
            .Where(request => request.UserId == currentUser.Id)
            .OrderByDescending(request => request.SubmittedAtUtc)
            .ToListAsync();

        return Ok(requests);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var currentUser = await _tokenService.ValidateAndGetUserAsync(User);
        if (currentUser == null)
        {
            return Unauthorized(new { message = "User no longer exists or token is invalid." });
        }

        var request = await _context.LeaveRequests.FirstOrDefaultAsync(item => item.Id == id && item.UserId == currentUser.Id);

        return request == null ? NotFound() : Ok(request);
    }
    
    
    
    [HttpPut("leaverequests/{guid}")]
    public async Task<IActionResult> ApproveLeaveRequest(Guid guid)
    {
        var currentUser = await _tokenService.ValidateAndGetUserAsync(User);
        if (currentUser == null)
        {
            return Unauthorized(new { message = "User no longer exists or token is invalid." });
        }
        if (currentUser.Role != "accountant")
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "Only accountants can approve leave requests." });
        }

        var leaveRequest = await _context.LeaveRequests.FirstOrDefaultAsync(lr => lr.Id == guid && lr.UserId == currentUser.Id);

        if (leaveRequest == null)
        {
            return NotFound(new { message = "Leave request not found." });
        }

        if (leaveRequest.Status != LeaveRequestStatus.Pending)
        {
            return BadRequest(new { message = "Only pending leave requests can be approved." });
        }

        leaveRequest.Status = LeaveRequestStatus.Approved;
        leaveRequest.ReviewedAtUtc = DateTime.UtcNow;
        leaveRequest.ReviewedByUserId = currentUser.Id;

        await _context.UpdateAsync(leaveRequest);
        return Ok(new { message = "Leave request approved successfully." });
    }
    
    [HttpPut("leaverequests/{guid}")]
    public async Task<IActionResult> RejectLeaveRequest(Guid guid)
    {
        var currentUser = await _tokenService.ValidateAndGetUserAsync(User);
        if (currentUser == null)
        {
            return Unauthorized(new { message = "User no longer exists or token is invalid." });
        }
        if (currentUser.Role != "accountant")
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "Only accountants can reject leave requests." });
        }

        var leaveRequest = await _context.LeaveRequests.FirstOrDefaultAsync(lr => lr.Id == guid && lr.UserId == currentUser.Id);

        if (leaveRequest == null)
        {
            return NotFound(new { message = "Leave request not found." });
        }

        if (leaveRequest.Status != LeaveRequestStatus.Pending)
        {
            return BadRequest(new { message = "Only pending leave requests can be rejected." });
        }

        leaveRequest.Status = LeaveRequestStatus.Rejected;
        leaveRequest.ReviewedAtUtc = DateTime.UtcNow;
        leaveRequest.ReviewedByUserId = currentUser.Id;

        await _context.UpdateAsync(leaveRequest);
        return Ok(new { message = "Leave request rejected successfully." });
    }
}
