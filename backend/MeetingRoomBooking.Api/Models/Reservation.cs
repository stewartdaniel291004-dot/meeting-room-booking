namespace MeetingRoomBooking.Api.Models;

/// <summary>
/// A room reservation. All date/time values are UTC.
/// </summary>
public class Reservation
{
    public int Id { get; set; }

    public required string RoomId { get; set; }

    public Room? Room { get; set; }

    public required string OrganizerId { get; set; }

    public User? Organizer { get; set; }

    public required string MeetingTitle { get; set; }

    public DateTime StartDateTime { get; set; }

    /// <summary>The planned end. Kept unchanged when a meeting ends early so usage can be compared.</summary>
    public DateTime EndDateTime { get; set; }

    /// <summary>Set when a meeting is ended early; null means it ran (or will run) to <see cref="EndDateTime"/>.</summary>
    public DateTime? ActualEndDateTime { get; set; }

    public int AttendeeCount { get; set; }

    public ReservationStatus Status { get; set; } = ReservationStatus.Booked;

    public DateTime CreatedAt { get; set; }

    /// <summary>The moment the room is released: the actual end if recorded, otherwise the planned end.</summary>
    public DateTime EffectiveEndDateTime => ActualEndDateTime ?? EndDateTime;
}
