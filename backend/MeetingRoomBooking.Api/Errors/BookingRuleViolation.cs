namespace MeetingRoomBooking.Api.Errors;

/// <summary>A single broken booking rule, with the HTTP status it maps to (400 invalid data, 409 conflict).</summary>
public sealed record BookingRuleViolation(string Code, string Message, int StatusCode);
