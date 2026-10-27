using MeetingRoomBooking.Api.Data;
using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Errors;
using MeetingRoomBooking.Api.Interfaces;
using MeetingRoomBooking.Api.Mapping;
using MeetingRoomBooking.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MeetingRoomBooking.Api.Services;

public sealed class ReservationService(
    AppDbContext db,
    IBookingValidator validator,
    TimeProvider clock) : IReservationService
{
    // The InMemory provider has no transactions, so two concurrent requests could both pass the overlap
    // check before either saves. Serialising "validate + save" closes that gap for this single-process demo.
    private static readonly SemaphoreSlim WriteLock = new(1, 1);

    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<IReadOnlyList<ReservationDto>> GetReservationsAsync(
        ReservationQuery query, CancellationToken cancellationToken = default)
    {
        var now = Now;
        var from = query.From?.UtcDateTime;
        var to = query.To?.UtcDateTime;
        if (from.HasValue && to.HasValue && from >= to)
        {
            throw ApiException.BadRequest(ErrorCodes.ValidationError, "The start of the date range must be before its end.");
        }

        var reservations = db.Reservations
            .AsNoTracking()
            .Include(r => r.Room)
            .Include(r => r.Organizer)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.RoomId))
        {
            reservations = reservations.Where(r => r.RoomId == query.RoomId);
        }

        if (!string.IsNullOrWhiteSpace(query.OrganizerId))
        {
            reservations = reservations.Where(r => r.OrganizerId == query.OrganizerId);
        }

        if (query.Status is { } status)
        {
            reservations = reservations.Where(ReservationRules.HasEffectiveStatus(status, now));
        }

        // Date range keeps every reservation that overlaps [from, to).
        if (from.HasValue)
        {
            reservations = reservations.Where(r => (r.ActualEndDateTime ?? r.EndDateTime) > from.Value);
        }

        if (to.HasValue)
        {
            reservations = reservations.Where(r => r.StartDateTime < to.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLowerInvariant();
            reservations = reservations.Where(r =>
                r.MeetingTitle.ToLower().Contains(term)
                || r.Room!.Name.ToLower().Contains(term)
                || (r.Organizer!.FirstName + " " + r.Organizer.LastName).ToLower().Contains(term));
        }

        var results = await reservations.ToListAsync(cancellationToken);

        // Actionable reservations first (ongoing and upcoming, soonest first), then history (most recent first).
        return results
            .OrderByDescending(r => ReservationRules.EffectiveStatus(r, now) == ReservationStatus.Booked)
            .ThenBy(r => ReservationRules.EffectiveStatus(r, now) == ReservationStatus.Booked ? r.StartDateTime.Ticks : -r.StartDateTime.Ticks)
            .Select(r => r.ToDto(now))
            .ToList();
    }

    public async Task<ReservationDto> GetReservationAsync(int id, CancellationToken cancellationToken = default)
    {
        var reservation = await FindReservationAsync(id, cancellationToken);
        return reservation.ToDto(Now);
    }

    public async Task<ReservationDto> CreateAsync(ReservationRequest request, CancellationToken cancellationToken = default)
    {
        await WriteLock.WaitAsync(cancellationToken);
        try
        {
            var room = await FindRoomAsync(request.RoomId, cancellationToken);
            var organizer = await FindUserAsync(request.OrganizerId, cancellationToken);
            var (start, end, attendees) = ReadTimesAndAttendees(request);

            await EnsureValidAsync(new BookingCandidate(room, organizer, start, end, attendees), cancellationToken);

            var reservation = new Reservation
            {
                RoomId = room.Id,
                Room = room,
                OrganizerId = organizer.Id,
                Organizer = organizer,
                MeetingTitle = request.MeetingTitle.Trim(),
                StartDateTime = start,
                EndDateTime = end,
                AttendeeCount = attendees,
                Status = ReservationStatus.Booked,
                CreatedAt = Now
            };
            db.Reservations.Add(reservation);
            await db.SaveChangesAsync(cancellationToken);

            return reservation.ToDto(Now);
        }
        finally
        {
            WriteLock.Release();
        }
    }

    public async Task<ReservationDto> UpdateAsync(int id, ReservationRequest request, CancellationToken cancellationToken = default)
    {
        await WriteLock.WaitAsync(cancellationToken);
        try
        {
            var reservation = await FindReservationAsync(id, cancellationToken);
            if (!ReservationRules.IsUpcoming(reservation, Now))
            {
                throw ApiException.Conflict(
                    ErrorCodes.ReservationNotEditable,
                    "Only upcoming reservations can be edited. Meetings that have started, ended or been cancelled are read-only.");
            }

            var room = await FindRoomAsync(request.RoomId, cancellationToken);
            var organizer = await FindUserAsync(request.OrganizerId, cancellationToken);
            var (start, end, attendees) = ReadTimesAndAttendees(request);

            await EnsureValidAsync(
                new BookingCandidate(room, organizer, start, end, attendees, ExcludeReservationId: reservation.Id),
                cancellationToken);

            reservation.RoomId = room.Id;
            reservation.Room = room;
            reservation.OrganizerId = organizer.Id;
            reservation.Organizer = organizer;
            reservation.MeetingTitle = request.MeetingTitle.Trim();
            reservation.StartDateTime = start;
            reservation.EndDateTime = end;
            reservation.AttendeeCount = attendees;
            await db.SaveChangesAsync(cancellationToken);

            return reservation.ToDto(Now);
        }
        finally
        {
            WriteLock.Release();
        }
    }

    public async Task<ReservationDto> CancelAsync(int id, CancellationToken cancellationToken = default)
    {
        await WriteLock.WaitAsync(cancellationToken);
        try
        {
            var now = Now;
            var reservation = await FindReservationAsync(id, cancellationToken);
            var message = ReservationRules.EffectiveStatus(reservation, now) switch
            {
                ReservationStatus.Cancelled => "This reservation has already been cancelled.",
                ReservationStatus.Completed => "A completed meeting cannot be cancelled.",
                _ when ReservationRules.IsInProgress(reservation, now) =>
                    "This meeting is already in progress. End it early instead of cancelling it.",
                _ => null
            };
            if (message is not null)
            {
                throw ApiException.Conflict(ErrorCodes.ReservationNotCancellable, message);
            }

            // The record is kept for history and analytics; only the status changes.
            reservation.Status = ReservationStatus.Cancelled;
            await db.SaveChangesAsync(cancellationToken);

            return reservation.ToDto(now);
        }
        finally
        {
            WriteLock.Release();
        }
    }

    public async Task<ReservationDto> EndEarlyAsync(int id, CancellationToken cancellationToken = default)
    {
        await WriteLock.WaitAsync(cancellationToken);
        try
        {
            var now = Now;
            var reservation = await FindReservationAsync(id, cancellationToken);
            if (!ReservationRules.IsInProgress(reservation, now))
            {
                throw ApiException.Conflict(
                    ErrorCodes.MeetingNotInProgress,
                    "Only a meeting that is currently in progress can be ended early.");
            }

            // The planned end stays untouched so analytics can compare booked and actual time.
            reservation.ActualEndDateTime = now;
            reservation.Status = ReservationStatus.Completed;
            await db.SaveChangesAsync(cancellationToken);

            return reservation.ToDto(now);
        }
        finally
        {
            WriteLock.Release();
        }
    }

    private async Task EnsureValidAsync(BookingCandidate candidate, CancellationToken cancellationToken)
    {
        var violations = await validator.ValidateAsync(candidate, cancellationToken);
        if (violations.Count == 0)
        {
            return;
        }

        var primary = violations[0];
        throw new ApiException(
            primary.StatusCode,
            primary.Code,
            primary.Message,
            violations.Select(v => new ErrorDetail(v.Code, v.Message)).ToList());
    }

    private static (DateTime Start, DateTime End, int Attendees) ReadTimesAndAttendees(ReservationRequest request)
    {
        // [Required] guarantees these are present once model validation has passed.
        var start = request.StartDateTime!.Value.UtcDateTime;
        var end = request.EndDateTime!.Value.UtcDateTime;
        return (start, end, request.AttendeeCount!.Value);
    }

    private async Task<Reservation> FindReservationAsync(int id, CancellationToken cancellationToken) =>
        await db.Reservations
            .Include(r => r.Room)
            .Include(r => r.Organizer)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
        ?? throw ApiException.NotFound(ErrorCodes.ReservationNotFound, $"Reservation {id} was not found.");

    private async Task<Room> FindRoomAsync(string id, CancellationToken cancellationToken) =>
        await db.Rooms.FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
        ?? throw ApiException.NotFound(ErrorCodes.RoomNotFound, $"Room '{id}' was not found.");

    private async Task<User> FindUserAsync(string id, CancellationToken cancellationToken) =>
        await db.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken)
        ?? throw ApiException.NotFound(ErrorCodes.UserNotFound, $"User '{id}' was not found.");
}
