using System.ComponentModel.DataAnnotations;

namespace MeetingRoomBooking.Api.Configuration;

/// <summary>
/// Office-wide settings. All timestamps are stored and exchanged in UTC; the office time zone is
/// used to generate realistic seed data and is published to the frontend for display.
/// </summary>
public sealed class OfficeOptions
{
    public const string SectionName = "Office";

    /// <summary>IANA time zone id, e.g. "Europe/Vilnius".</summary>
    [Required]
    public string TimeZone { get; set; } = "UTC";

    public TimeZoneInfo ResolveTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(TimeZone);
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.Utc;
        }
    }
}
