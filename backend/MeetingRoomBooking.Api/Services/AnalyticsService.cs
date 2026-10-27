using MeetingRoomBooking.Api.Configuration;
using MeetingRoomBooking.Api.Data;
using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Errors;
using MeetingRoomBooking.Api.Interfaces;
using MeetingRoomBooking.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace MeetingRoomBooking.Api.Services;

/// <summary>
/// Compares booked time against recorded meeting time to find rooms that are often booked but rarely used.
/// <list type="bullet">
/// <item>Planned hours: planned end − start, for completed meetings.</item>
/// <item>Actual hours: (actual end ?? planned end) − start, for completed meetings.</item>
/// <item>Usage rate: actual ÷ planned. Cancelled and upcoming reservations are excluded.</item>
/// <item>Cancellation rate: cancelled ÷ all reservations in the period.</item>
/// </list>
/// </summary>
public sealed class AnalyticsService(
    AppDbContext db,
    IOptions<AnalyticsOptions> analyticsOptions,
    TimeProvider clock) : IAnalyticsService
{
    private readonly AnalyticsOptions _options = analyticsOptions.Value;

    public async Task<RoomUsageReportDto> GetRoomUsageAsync(
        DateTime? from, DateTime? to, CancellationToken cancellationToken = default)
    {
        if (from.HasValue && to.HasValue && from >= to)
        {
            throw ApiException.BadRequest(ErrorCodes.ValidationError, "The start of the date range must be before its end.");
        }

        var now = clock.GetUtcNow().UtcDateTime;
        var rooms = await db.Rooms.AsNoTracking().OrderBy(r => r.Id).ToListAsync(cancellationToken);

        var reservations = db.Reservations.AsNoTracking();
        if (from.HasValue)
        {
            reservations = reservations.Where(r => r.StartDateTime >= from.Value);
        }

        if (to.HasValue)
        {
            reservations = reservations.Where(r => r.StartDateTime < to.Value);
        }

        var byRoom = (await reservations.ToListAsync(cancellationToken)).ToLookup(r => r.RoomId);

        var roomUsage = rooms
            .Select(room => Calculate(room, byRoom[room.Id].ToList(), now))
            .OrderByDescending(u => u.IsFrequentlyBookedRarelyUsed)
            .ThenByDescending(u => u.TotalReservations)
            .ThenBy(u => u.RoomId)
            .ToList();

        var plannedTotal = roomUsage.Sum(u => u.PlannedHours);
        var actualTotal = roomUsage.Sum(u => u.ActualHours);
        var totals = new RoomUsageTotalsDto(
            roomUsage.Sum(u => u.TotalReservations),
            roomUsage.Sum(u => u.CompletedMeetings),
            roomUsage.Sum(u => u.CancelledReservations),
            roomUsage.Sum(u => u.EarlyEndedMeetings),
            Round(plannedTotal),
            Round(actualTotal),
            Percent(actualTotal, plannedTotal),
            roomUsage.Count(u => u.IsFrequentlyBookedRarelyUsed));

        var thresholds = new AnalyticsThresholdsDto(
            _options.MinimumReservationsForFlag,
            _options.LowUsageThresholdPercent,
            _options.HighCancellationThresholdPercent);

        return new RoomUsageReportDto(now, from, to, thresholds, totals, roomUsage);
    }

    private RoomUsageDto Calculate(Room room, List<Reservation> reservations, DateTime now)
    {
        var completed = reservations
            .Where(r => ReservationRules.EffectiveStatus(r, now) == ReservationStatus.Completed)
            .ToList();
        var cancelled = reservations.Count(r => r.Status == ReservationStatus.Cancelled);
        var upcoming = reservations.Count(r => ReservationRules.EffectiveStatus(r, now) == ReservationStatus.Booked);

        var plannedHours = completed.Sum(r => (r.EndDateTime - r.StartDateTime).TotalHours);
        var actualHours = completed.Sum(r => (r.EffectiveEndDateTime - r.StartDateTime).TotalHours);
        var usageRate = Percent(actualHours, plannedHours);
        var cancellationRate = Percent(cancelled, reservations.Count);
        var seatFill = completed.Count > 0 && room.Capacity > 0
            ? Round(completed.Average(r => (double)r.AttendeeCount / room.Capacity) * 100)
            : (double?)null;

        var reasons = new List<string>();
        if (reservations.Count >= _options.MinimumReservationsForFlag)
        {
            if (usageRate < _options.LowUsageThresholdPercent)
            {
                reasons.Add($"Only {usageRate:0.#}% of booked meeting time was used (threshold {_options.LowUsageThresholdPercent:0.#}%).");
            }

            if (cancellationRate >= _options.HighCancellationThresholdPercent)
            {
                reasons.Add($"{cancellationRate:0.#}% of reservations were cancelled (threshold {_options.HighCancellationThresholdPercent:0.#}%).");
            }
        }

        return new RoomUsageDto(
            room.Id,
            room.Name,
            room.Floor,
            room.Capacity,
            room.IsActive,
            reservations.Count,
            upcoming,
            completed.Count,
            cancelled,
            completed.Count(ReservationRules.EndedEarly),
            Round(plannedHours),
            Round(actualHours),
            Round(plannedHours - actualHours),
            usageRate,
            cancellationRate,
            seatFill,
            reasons.Count > 0,
            reasons);
    }

    /// <summary>Returns null instead of dividing by zero, so "no data" is never shown as 0%.</summary>
    private static double? Percent(double part, double whole) => whole > 0 ? Round(part / whole * 100) : null;

    private static double Round(double value) => Math.Round(value, 1, MidpointRounding.AwayFromZero);
}
