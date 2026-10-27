using MeetingRoomBooking.Api.Configuration;
using MeetingRoomBooking.Api.Data;
using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Interfaces;
using MeetingRoomBooking.Api.Mapping;
using MeetingRoomBooking.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace MeetingRoomBooking.Api.Services;

public sealed class DashboardService(
    AppDbContext db,
    IAnalyticsService analytics,
    IOptions<OfficeOptions> office,
    TimeProvider clock) : IDashboardService
{
    private const int UpcomingMeetingsShown = 6;
    private const int UtilizationHighlightsShown = 5;

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var (todayStart, tomorrowStart) = OfficeDayBounds(now);

        var rooms = await db.Rooms.AsNoTracking().ToListAsync(cancellationToken);
        var activeRoomIds = rooms.Where(r => r.IsActive).Select(r => r.Id).ToHashSet();

        var activeReservations = await db.Reservations
            .AsNoTracking()
            .Include(r => r.Room)
            .Include(r => r.Organizer)
            .Where(ReservationRules.IsActive(now))
            .OrderBy(r => r.StartDateTime)
            .ToListAsync(cancellationToken);

        var inProgress = activeReservations.Where(r => ReservationRules.IsInProgress(r, now)).ToList();
        var upcoming = activeReservations.Where(r => ReservationRules.IsUpcoming(r, now)).ToList();
        var occupiedNow = inProgress.Select(r => r.RoomId).Where(activeRoomIds.Contains).Distinct().Count();

        var meetingsToday = await db.Reservations.CountAsync(
            r => r.Status != ReservationStatus.Cancelled && r.StartDateTime >= todayStart && r.StartDateTime < tomorrowStart,
            cancellationToken);
        var totalUsers = await db.Users.CountAsync(cancellationToken);

        var usage = await analytics.GetRoomUsageAsync(null, null, cancellationToken);

        return new DashboardSummaryDto(
            now,
            rooms.Count,
            activeRoomIds.Count,
            rooms.Count - activeRoomIds.Count,
            AvailableNow: activeRoomIds.Count - occupiedNow,
            OccupiedNow: occupiedNow,
            UpcomingReservations: upcoming.Count,
            MeetingsToday: meetingsToday,
            TotalUsers: totalUsers,
            inProgress.Select(r => r.ToDto(now)).ToList(),
            upcoming.Take(UpcomingMeetingsShown).Select(r => r.ToDto(now)).ToList(),
            usage.Rooms.Where(r => r.TotalReservations > 0).Take(UtilizationHighlightsShown).ToList());
    }

    private (DateTime Start, DateTime End) OfficeDayBounds(DateTime nowUtc)
    {
        var timeZone = office.Value.ResolveTimeZone();
        var localToday = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, timeZone).Date;
        return (
            TimeZoneInfo.ConvertTimeToUtc(localToday, timeZone),
            TimeZoneInfo.ConvertTimeToUtc(localToday.AddDays(1), timeZone));
    }
}
