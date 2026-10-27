namespace MeetingRoomBooking.Api.Errors;

/// <summary>Stable, machine-readable error codes returned in <see cref="DTOs.ErrorResponse.Code"/>.</summary>
public static class ErrorCodes
{
    // Booking rules
    public const string InvalidTimeRange = "INVALID_TIME_RANGE";                    // R4
    public const string MaximumDurationExceeded = "MAXIMUM_DURATION_EXCEEDED";      // R1
    public const string RoomBookingConflict = "ROOM_BOOKING_CONFLICT";              // R2
    public const string OrganizerBookingConflict = "ORGANIZER_BOOKING_CONFLICT";    // R3
    public const string RoomCapacityExceeded = "ROOM_CAPACITY_EXCEEDED";            // R5
    public const string InvalidAttendeeCount = "INVALID_ATTENDEE_COUNT";            // R5
    public const string BookingHorizonExceeded = "BOOKING_HORIZON_EXCEEDED";        // R6
    public const string RoomInactive = "ROOM_INACTIVE";                             // R7

    // Lookups
    public const string RoomNotFound = "ROOM_NOT_FOUND";
    public const string UserNotFound = "USER_NOT_FOUND";
    public const string ReservationNotFound = "RESERVATION_NOT_FOUND";

    // Lifecycle actions
    public const string ReservationNotCancellable = "RESERVATION_NOT_CANCELLABLE";
    public const string ReservationNotEditable = "RESERVATION_NOT_EDITABLE";
    public const string MeetingNotInProgress = "MEETING_NOT_IN_PROGRESS";

    // Generic
    public const string ValidationError = "VALIDATION_ERROR";
    public const string InternalError = "INTERNAL_ERROR";
}
