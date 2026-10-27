using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Errors;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace MeetingRoomBooking.Api.Middleware;

/// <summary>Turns exceptions into the shared <see cref="ErrorResponse"/> shape.</summary>
public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        var (status, body) = exception switch
        {
            ApiException api => (api.StatusCode, new ErrorResponse(api.Code, api.Message, api.Details)),
            _ => (StatusCodes.Status500InternalServerError,
                new ErrorResponse(ErrorCodes.InternalError, "An unexpected error occurred. Please try again.", []))
        };

        if (status >= StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
        }

        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(body, cancellationToken);
        return true;
    }

    /// <summary>Replaces the default ProblemDetails for model-binding failures (malformed JSON, missing fields).</summary>
    public static IActionResult InvalidModelStateResponse(ActionContext context)
    {
        var details = context.ModelState
            .Where(entry => entry.Value is { Errors.Count: > 0 })
            .SelectMany(entry => entry.Value!.Errors.Select(error => Describe(entry.Key, error)))
            .ToList();

        var message = details.Count == 1
            ? details[0].Message
            : "The request contains invalid or missing values.";

        return new BadRequestObjectResult(new ErrorResponse(ErrorCodes.ValidationError, message, details));
    }

    private static ErrorDetail Describe(string key, ModelError error)
    {
        // Keys starting with "$" come from the JSON deserializer; its messages mention .NET types, so replace them.
        var isJsonError = key.StartsWith('$');
        var field = ToCamelCase(key.TrimStart('$', '.'));
        var message = isJsonError || string.IsNullOrWhiteSpace(error.ErrorMessage)
            ? $"'{field}' has an invalid value or format. Dates must be ISO 8601, e.g. 2026-10-27T09:00:00Z."
            : error.ErrorMessage;
        return new ErrorDetail(ErrorCodes.ValidationError, message, field);
    }

    private static string ToCamelCase(string value) =>
        string.IsNullOrEmpty(value) ? value : char.ToLowerInvariant(value[0]) + value[1..];
}
