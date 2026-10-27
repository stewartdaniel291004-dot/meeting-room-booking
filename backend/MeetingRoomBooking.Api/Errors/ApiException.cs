using MeetingRoomBooking.Api.DTOs;

namespace MeetingRoomBooking.Api.Errors;

/// <summary>
/// An expected, client-facing failure. Translated into an <see cref="ErrorResponse"/> by
/// <see cref="Middleware.ApiExceptionHandler"/>.
/// </summary>
public class ApiException(
    int statusCode,
    string code,
    string message,
    IReadOnlyList<ErrorDetail>? details = null) : Exception(message)
{
    public int StatusCode { get; } = statusCode;

    public string Code { get; } = code;

    public IReadOnlyList<ErrorDetail> Details { get; } = details ?? [];

    public static ApiException NotFound(string code, string message) =>
        new(StatusCodes.Status404NotFound, code, message);

    public static ApiException BadRequest(string code, string message) =>
        new(StatusCodes.Status400BadRequest, code, message);

    public static ApiException Conflict(string code, string message) =>
        new(StatusCodes.Status409Conflict, code, message);
}
