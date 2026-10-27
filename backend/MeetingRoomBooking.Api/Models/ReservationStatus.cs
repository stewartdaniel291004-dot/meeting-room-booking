namespace MeetingRoomBooking.Api.Models;

/// <summary>
/// The reservation statuses defined by the assignment. "In progress" is not a status; it is derived
/// from a Booked reservation whose start has passed and whose end has not.
/// </summary>
public enum ReservationStatus
{
    Booked,
    Completed,
    Cancelled
}
