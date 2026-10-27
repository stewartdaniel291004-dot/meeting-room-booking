using MeetingRoomBooking.Api.Configuration;
using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace MeetingRoomBooking.Api.Controllers;

[ApiController]
[Route("api")]
[Produces("application/json")]
public sealed class InsightsController(
    IAnalyticsService analytics,
    IDashboardService dashboard,
    IOptions<BookingRulesOptions> bookingRules,
    IOptions<OfficeOptions> office,
    TimeProvider clock) : ControllerBase
{
    /// <summary>Per-room booked vs. recorded usage, flagging rooms that are often booked but rarely used.</summary>
    [HttpGet("analytics/room-usage")]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RoomUsageReportDto>> GetRoomUsage(
        [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to, CancellationToken cancellationToken) =>
        Ok(await analytics.GetRoomUsageAsync(from?.UtcDateTime, to?.UtcDateTime, cancellationToken));

    /// <summary>Headline figures for the dashboard, all calculated from current data.</summary>
    [HttpGet("dashboard/summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetDashboardSummary(CancellationToken cancellationToken) =>
        Ok(await dashboard.GetSummaryAsync(cancellationToken));

    /// <summary>Booking limits and office time zone, so the UI can mirror the backend rules.</summary>
    [HttpGet("settings")]
    public ActionResult<SettingsDto> GetSettings() =>
        Ok(new SettingsDto(
            bookingRules.Value.MaximumDurationDays,
            bookingRules.Value.MaximumBookingHorizonDays,
            office.Value.TimeZone,
            clock.GetUtcNow().UtcDateTime));
}
