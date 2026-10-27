using System.ComponentModel.DataAnnotations;

namespace MeetingRoomBooking.Api.Configuration;

/// <summary>
/// Configurable limits for the booking rules (R1 and R6). Bound from the "BookingRules" section.
/// </summary>
public sealed class BookingRulesOptions
{
    public const string SectionName = "BookingRules";

    /// <summary>R1: the longest a single reservation may last. Exactly this many days is allowed.</summary>
    [Range(1, 365)]
    public int MaximumDurationDays { get; set; } = 7;

    /// <summary>R6: how far ahead (from now) a reservation may start. Exactly this many days is allowed.</summary>
    [Range(1, 3650)]
    public int MaximumBookingHorizonDays { get; set; } = 90;

    public TimeSpan MaximumDuration => TimeSpan.FromDays(MaximumDurationDays);

    public TimeSpan MaximumBookingHorizon => TimeSpan.FromDays(MaximumBookingHorizonDays);
}
