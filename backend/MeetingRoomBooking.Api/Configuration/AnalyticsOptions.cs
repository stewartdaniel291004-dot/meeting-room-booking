using System.ComponentModel.DataAnnotations;

namespace MeetingRoomBooking.Api.Configuration;

/// <summary>
/// Thresholds that decide when a room is flagged as "frequently booked but rarely used".
/// </summary>
public sealed class AnalyticsOptions
{
    public const string SectionName = "Analytics";

    /// <summary>A room needs at least this many reservations before it can be flagged.</summary>
    [Range(1, 1000)]
    public int MinimumReservationsForFlag { get; set; } = 5;

    /// <summary>Flag when recorded meeting hours are below this share of the booked hours.</summary>
    [Range(0, 100)]
    public double LowUsageThresholdPercent { get; set; } = 60;

    /// <summary>Flag when at least this share of reservations were cancelled.</summary>
    [Range(0, 100)]
    public double HighCancellationThresholdPercent { get; set; } = 30;
}
