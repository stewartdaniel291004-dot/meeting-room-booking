using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace MeetingRoomBooking.Api.Controllers;

[ApiController]
[Route("api/rooms")]
[Produces("application/json")]
public sealed class RoomsController(IRoomService rooms) : ControllerBase
{
    /// <summary>Lists rooms, optionally filtered by minimum capacity, floor, equipment (all required), status or name.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoomDto>>> GetRooms([FromQuery] RoomQuery query, CancellationToken cancellationToken) =>
        Ok(await rooms.GetRoomsAsync(query, cancellationToken));

    /// <summary>Lists the floors that have rooms, with room counts.</summary>
    [HttpGet("floors")]
    public async Task<ActionResult<IReadOnlyList<FloorDto>>> GetFloors(CancellationToken cancellationToken) =>
        Ok(await rooms.GetFloorsAsync(cancellationToken));

    /// <summary>Returns each room's state (Available, InProgress, Booked, Inactive) for a time window.</summary>
    [HttpGet("occupancy")]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<RoomOccupancyDto>>> GetOccupancy(
        [FromQuery, BindRequired] DateTimeOffset start,
        [FromQuery, BindRequired] DateTimeOffset end,
        [FromQuery] int? floor,
        CancellationToken cancellationToken) =>
        Ok(await rooms.GetOccupancyAsync(start.UtcDateTime, end.UtcDateTime, floor, cancellationToken));

    /// <summary>Returns a room with its current meeting and next upcoming reservations.</summary>
    [HttpGet("{id}")]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RoomDetailsDto>> GetRoom(string id, CancellationToken cancellationToken) =>
        Ok(await rooms.GetRoomAsync(id, cancellationToken));

    /// <summary>Checks whether a room can be booked for a window, using the same rules as a real booking.</summary>
    [HttpGet("{id}/availability")]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RoomAvailabilityDto>> GetAvailability(
        string id,
        [FromQuery, BindRequired] DateTimeOffset start,
        [FromQuery, BindRequired] DateTimeOffset end,
        [FromQuery] int? excludeReservationId,
        CancellationToken cancellationToken) =>
        Ok(await rooms.GetAvailabilityAsync(id, start.UtcDateTime, end.UtcDateTime, excludeReservationId, cancellationToken));
}
