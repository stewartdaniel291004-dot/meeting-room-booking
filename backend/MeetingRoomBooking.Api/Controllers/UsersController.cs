using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MeetingRoomBooking.Api.Controllers;

[ApiController]
[Route("api/users")]
[Produces("application/json")]
public sealed class UsersController(IUserService users) : ControllerBase
{
    /// <summary>Lists users with their active reservation count, optionally filtered by name or ID.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetUsers([FromQuery] string? search, CancellationToken cancellationToken) =>
        Ok(await users.GetUsersAsync(search, cancellationToken));

    /// <summary>Returns a user and their active reservations.</summary>
    [HttpGet("{id}")]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserDetailsDto>> GetUser(string id, CancellationToken cancellationToken) =>
        Ok(await users.GetUserAsync(id, cancellationToken));
}
