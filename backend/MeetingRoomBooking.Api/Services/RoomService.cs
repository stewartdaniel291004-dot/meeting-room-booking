using MeetingRoomBooking.Api.Data;
using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Errors;
using MeetingRoomBooking.Api.Interfaces;
using MeetingRoomBooking.Api.Mapping;
using MeetingRoomBooking.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MeetingRoomBooking.Api.Services;

public sealed class RoomService(
    AppDbContext db,
    IBookingValidator validator,
    TimeProvider clock) : IRoomService
{
    private const int UpcomingReservationsShown = 5;

    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<IReadOnlyList<RoomDto>> GetRoomsAsync(RoomQuery query, CancellationToken cancellationToken = default)
    {
        var rooms = db.Rooms.AsNoTracking();

        if (query.MinCapacity is { } minCapacity)
        {
            rooms = rooms.Where(r => r.Capacity >= minCapacity);
        }

        if (query.Floor is { } floor)
        {
            rooms = rooms.Where(r => r.Floor == floor);
        }

        if (query.IsActive is { } isActive)
        {
            rooms = rooms.Where(r => r.IsActive == isActive);
        }

        if (query.Equipment is { Count: > 0 })
        {
            var required = query.Equipment.Combine();
            rooms = rooms.Where(r => (r.Equipment & required) == required);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLowerInvariant();
            rooms = rooms.Where(r => r.Name.ToLower().Contains(term) || r.Id.ToLower().Contains(term));
        }

        var results = await rooms
            .OrderBy(r => r.Floor)
            .ThenBy(r => r.Id)
            .ToListAsync(cancellationToken);

        return results.Select(r => r.ToDto()).ToList();
    }

    public async Task<RoomDetailsDto> GetRoomAsync(string id, CancellationToken cancellationToken = default)
    {
        var now = Now;
        var room = await FindRoomAsync(id, cancellationToken);

        var reservations = await db.Reservations
            .AsNoTracking()
            .Include(r => r.Room)
            .Include(r => r.Organizer)
            .Where(r => r.RoomId == id)
            .Where(ReservationRules.IsActive(now))
            .OrderBy(r => r.StartDateTime)
            .ToListAsync(cancellationToken);

        var current = reservations.FirstOrDefault(r => ReservationRules.IsInProgress(r, now));
        var upcoming = reservations
            .Where(r => ReservationRules.IsUpcoming(r, now))
            .Take(UpcomingReservationsShown)
            .Select(r => r.ToDto(now))
            .ToList();

        return new RoomDetailsDto(room.ToDto(), current?.ToDto(now), upcoming);
    }

    public async Task<IReadOnlyList<FloorDto>> GetFloorsAsync(CancellationToken cancellationToken = default)
    {
        var rooms = await db.Rooms.AsNoTracking().ToListAsync(cancellationToken);
        return rooms
            .GroupBy(r => r.Floor)
            .OrderBy(g => g.Key)
            .Select(g => new FloorDto(g.Key, g.Count(), g.Count(r => r.IsActive)))
            .ToList();
    }

    public async Task<RoomAvailabilityDto> GetAvailabilityAsync(
        string id, DateTime start, DateTime end, int? excludeReservationId, CancellationToken cancellationToken = default)
    {
        var now = Now;
        var room = await FindRoomAsync(id, cancellationToken);

        // Same rules as a real booking, minus the organizer and attendee checks which need a full request.
        var violations = await validator.ValidateAsync(
            new BookingCandidate(room, Organizer: null, start, end, AttendeeCount: null, excludeReservationId),
            cancellationToken);

        var conflicts = end > start
            ? await db.Reservations
                .AsNoTracking()
                .Include(r => r.Room)
                .Include(r => r.Organizer)
                .Where(r => r.RoomId == id && r.Id != (excludeReservationId ?? 0))
                .Where(ReservationRules.Overlaps(start, end))
                .OrderBy(r => r.StartDateTime)
                .ToListAsync(cancellationToken)
            : [];

        return new RoomAvailabilityDto(
            room.Id,
            start,
            end,
            IsAvailable: violations.Count == 0,
            violations.Select(v => new ErrorDetail(v.Code, v.Message)).ToList(),
            conflicts.Select(r => r.ToDto(now)).ToList());
    }

    public async Task<IReadOnlyList<RoomOccupancyDto>> GetOccupancyAsync(
        DateTime start, DateTime end, int? floor, CancellationToken cancellationToken = default)
    {
        if (end <= start)
        {
            throw ApiException.BadRequest(ErrorCodes.InvalidTimeRange, "The end time must be after the start time.");
        }

        var now = Now;
        var rooms = db.Rooms.AsNoTracking();
        if (floor.HasValue)
        {
            rooms = rooms.Where(r => r.Floor == floor.Value);
        }

        var roomList = await rooms.OrderBy(r => r.Id).ToListAsync(cancellationToken);
        var roomIds = roomList.Select(r => r.Id).ToList();

        var overlapping = await db.Reservations
            .AsNoTracking()
            .Include(r => r.Room)
            .Include(r => r.Organizer)
            .Where(r => roomIds.Contains(r.RoomId))
            .Where(ReservationRules.Overlaps(start, end))
            .OrderBy(r => r.StartDateTime)
            .ToListAsync(cancellationToken);
        var byRoom = overlapping.ToLookup(r => r.RoomId);

        return roomList.Select(room => Describe(room, byRoom[room.Id].ToList(), now)).ToList();
    }

    private static RoomOccupancyDto Describe(Room room, List<Reservation> overlapping, DateTime now)
    {
        if (!room.IsActive)
        {
            return new RoomOccupancyDto(room.Id, RoomOccupancyState.Inactive, null);
        }

        var inProgress = overlapping.FirstOrDefault(r => ReservationRules.IsInProgress(r, now));
        if (inProgress is not null)
        {
            return new RoomOccupancyDto(room.Id, RoomOccupancyState.InProgress, inProgress.ToDto(now));
        }

        var booked = overlapping.FirstOrDefault();
        return booked is not null
            ? new RoomOccupancyDto(room.Id, RoomOccupancyState.Booked, booked.ToDto(now))
            : new RoomOccupancyDto(room.Id, RoomOccupancyState.Available, null);
    }

    private async Task<Room> FindRoomAsync(string id, CancellationToken cancellationToken) =>
        await db.Rooms.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
        ?? throw ApiException.NotFound(ErrorCodes.RoomNotFound, $"Room '{id}' was not found.");
}
