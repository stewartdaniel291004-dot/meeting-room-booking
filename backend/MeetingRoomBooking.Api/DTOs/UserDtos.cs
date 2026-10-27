namespace MeetingRoomBooking.Api.DTOs;

/// <summary>
/// A user with their active reservation count: Booked reservations that have not yet ended
/// (ongoing meetings included). The count is calculated, never stored.
/// </summary>
public sealed record UserDto(
    string Id,
    string FirstName,
    string LastName,
    string FullName,
    int ActiveReservationCount);

public sealed record UserDetailsDto(UserDto User, IReadOnlyList<ReservationDto> ActiveReservations);
