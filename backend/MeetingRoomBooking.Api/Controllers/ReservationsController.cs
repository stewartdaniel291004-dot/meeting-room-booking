using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MeetingRoomBooking.Api.Controllers;

[ApiController]
[Route("api/reservations")]
[Produces("application/json")]
public sealed class ReservationsController(IReservationService reservations) : ControllerBase
{
    /// <summary>Lists reservations (ongoing/upcoming soonest first, then history newest first), filtered by room, organizer, status and/or date range.</summary>
    [HttpGet]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<ReservationDto>>> GetReservations(
        [FromQuery] ReservationQuery query, CancellationToken cancellationToken) =>
        Ok(await reservations.GetReservationsAsync(query, cancellationToken));

    [HttpGet("{id:int}")]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ReservationDto>> GetReservation(int id, CancellationToken cancellationToken) =>
        Ok(await reservations.GetReservationAsync(id, cancellationToken));

    /// <summary>Creates a reservation after checking booking rules R1–R7.</summary>
    [HttpPost]
    [ProducesResponseType<ReservationDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ReservationDto>> Create(ReservationRequest request, CancellationToken cancellationToken)
    {
        var created = await reservations.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetReservation), new { id = created.Id }, created);
    }

    /// <summary>Edits an upcoming reservation. The same rules apply; the reservation never conflicts with itself.</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ReservationDto>> Update(int id, ReservationRequest request, CancellationToken cancellationToken) =>
        Ok(await reservations.UpdateAsync(id, request, cancellationToken));

    /// <summary>Cancels an upcoming reservation. The record is kept with status Cancelled.</summary>
    [HttpPost("{id:int}/cancel")]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ReservationDto>> Cancel(int id, CancellationToken cancellationToken) =>
        Ok(await reservations.CancelAsync(id, cancellationToken));

    /// <summary>Ends a meeting in progress now: records the actual end time and marks it Completed.</summary>
    [HttpPost("{id:int}/end-early")]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ReservationDto>> EndEarly(int id, CancellationToken cancellationToken) =>
        Ok(await reservations.EndEarlyAsync(id, cancellationToken));
}
