using System.ComponentModel.DataAnnotations;
using MeetingRoomBooking.Api.Models;

namespace MeetingRoomBooking.Api.DTOs;

/// <summary>
/// A reservation as seen by clients. <see cref="Status"/> is the effective status (a Booked meeting whose
/// end has passed is reported as Completed). The Can* flags tell the UI which actions the backend will accept.
/// </summary>
public sealed record ReservationDto(
    int Id,
    string RoomId,
    string RoomName,
    int RoomFloor,
    string OrganizerId,
    string OrganizerName,
    string MeetingTitle,
    DateTime StartDateTime,
    DateTime EndDateTime,
    DateTime? ActualEndDateTime,
    int AttendeeCount,
    ReservationStatus Status,
    bool IsInProgress,
    bool EndedEarly,
    bool CanCancel,
    bool CanEndEarly,
    bool CanEdit);

/// <summary>
/// Body for creating or editing a reservation. Timestamps must be ISO 8601 with an offset
/// (e.g. "2026-10-27T08:00:00Z"); they are normalised to UTC.
/// </summary>
public sealed class ReservationRequest
{
    [Required]
    public string RoomId { get; init; } = string.Empty;

    [Required]
    public string OrganizerId { get; init; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string MeetingTitle { get; init; } = string.Empty;

    [Required]
    public DateTimeOffset? StartDateTime { get; init; }

    [Required]
    public DateTimeOffset? EndDateTime { get; init; }

    /// <summary>Validated against the room capacity by the booking rules (R5), not by annotations.</summary>
    [Required]
    public int? AttendeeCount { get; init; }
}

public sealed class ReservationQuery
{
    public string? RoomId { get; init; }

    public string? OrganizerId { get; init; }

    public ReservationStatus? Status { get; init; }

    /// <summary>Only reservations that end after this instant.</summary>
    public DateTimeOffset? From { get; init; }

    /// <summary>Only reservations that start before this instant.</summary>
    public DateTimeOffset? To { get; init; }

    public string? Search { get; init; }
}
