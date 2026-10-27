namespace MeetingRoomBooking.Api.DTOs;

/// <summary>The single error shape returned by every failing endpoint.</summary>
public sealed record ErrorResponse(string Code, string Message, IReadOnlyList<ErrorDetail> Details);

/// <summary>One specific problem: a broken booking rule or an invalid request field.</summary>
public sealed record ErrorDetail(string Code, string Message, string? Field = null);
