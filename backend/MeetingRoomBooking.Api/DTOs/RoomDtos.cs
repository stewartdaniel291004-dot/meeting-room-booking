using System.ComponentModel.DataAnnotations;
using MeetingRoomBooking.Api.Models;

namespace MeetingRoomBooking.Api.DTOs;

public sealed record RoomDto(
    string Id,
    string Name,
    int Capacity,
    int Floor,
    string Location,
    IReadOnlyList<EquipmentType> Equipment,
    bool IsActive);

public sealed record RoomDetailsDto(
    RoomDto Room,
    ReservationDto? CurrentReservation,
    IReadOnlyList<ReservationDto> UpcomingReservations);

public sealed record FloorDto(int Floor, int RoomCount, int ActiveRoomCount);

/// <summary>Whether a room can be booked for a specific time window, and why not if it can't.</summary>
public sealed record RoomAvailabilityDto(
    string RoomId,
    DateTime Start,
    DateTime End,
    bool IsAvailable,
    IReadOnlyList<ErrorDetail> Reasons,
    IReadOnlyList<ReservationDto> ConflictingReservations);

/// <summary>
/// How a room looks during a time window, used by the 3D floor plan.
/// InProgress is derived: an overlapping Booked meeting that has already started.
/// </summary>
public enum RoomOccupancyState
{
    Available,
    InProgress,
    Booked,
    Inactive
}

public sealed record RoomOccupancyDto(string RoomId, RoomOccupancyState State, ReservationDto? Reservation);

public sealed class RoomQuery
{
    [Range(1, 1000)]
    public int? MinCapacity { get; init; }

    public int? Floor { get; init; }

    /// <summary>Rooms must have every listed item, e.g. ?equipment=Projector&amp;equipment=Whiteboard.</summary>
    public List<EquipmentType>? Equipment { get; init; }

    public bool? IsActive { get; init; }

    public string? Search { get; init; }
}
