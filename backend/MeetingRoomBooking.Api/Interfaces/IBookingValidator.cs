using MeetingRoomBooking.Api.Errors;
using MeetingRoomBooking.Api.Models;

namespace MeetingRoomBooking.Api.Interfaces;

/// <summary>
/// A proposed booking to check against the rules.
/// <paramref name="Organizer"/> and <paramref name="AttendeeCount"/> are optional so the same rules can
/// answer "is this room free?" before the organizer is known.
/// </summary>
public sealed record BookingCandidate(
    Room Room,
    User? Organizer,
    DateTime Start,
    DateTime End,
    int? AttendeeCount,
    int? ExcludeReservationId = null);

public interface IBookingValidator
{
    /// <summary>Checks rules R1–R7 against the current database state and returns every violation found.</summary>
    Task<IReadOnlyList<BookingRuleViolation>> ValidateAsync(BookingCandidate candidate, CancellationToken cancellationToken = default);
}
