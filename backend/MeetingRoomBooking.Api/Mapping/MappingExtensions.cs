using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Models;
using MeetingRoomBooking.Api.Services;

namespace MeetingRoomBooking.Api.Mapping;

/// <summary>Hand-written entity → DTO mapping. Small enough that a mapping library would add more than it saves.</summary>
public static class MappingExtensions
{
    public static RoomDto ToDto(this Room room) =>
        new(room.Id, room.Name, room.Capacity, room.Floor, room.Location, room.Equipment.ToList(), room.IsActive);

    public static UserDto ToDto(this User user, int activeReservationCount) =>
        new(user.Id, user.FirstName, user.LastName, user.FullName, activeReservationCount);

    /// <remarks>Requires <see cref="Reservation.Room"/> and <see cref="Reservation.Organizer"/> to be loaded.</remarks>
    public static ReservationDto ToDto(this Reservation reservation, DateTime now)
    {
        var room = reservation.Room
                   ?? throw new InvalidOperationException($"Reservation {reservation.Id} was loaded without its room.");
        var organizer = reservation.Organizer
                        ?? throw new InvalidOperationException($"Reservation {reservation.Id} was loaded without its organizer.");
        var isUpcoming = ReservationRules.IsUpcoming(reservation, now);
        var isInProgress = ReservationRules.IsInProgress(reservation, now);

        return new ReservationDto(
            reservation.Id,
            room.Id,
            room.Name,
            room.Floor,
            organizer.Id,
            organizer.FullName,
            reservation.MeetingTitle,
            reservation.StartDateTime,
            reservation.EndDateTime,
            reservation.ActualEndDateTime,
            reservation.AttendeeCount,
            ReservationRules.EffectiveStatus(reservation, now),
            isInProgress,
            ReservationRules.EndedEarly(reservation),
            CanCancel: isUpcoming,
            CanEndEarly: isInProgress,
            CanEdit: isUpcoming);
    }
}
