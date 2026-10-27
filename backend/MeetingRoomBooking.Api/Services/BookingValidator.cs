using System.Globalization;
using MeetingRoomBooking.Api.Configuration;
using MeetingRoomBooking.Api.Data;
using MeetingRoomBooking.Api.Errors;
using MeetingRoomBooking.Api.Interfaces;
using MeetingRoomBooking.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace MeetingRoomBooking.Api.Services;

/// <summary>
/// Implements booking rules R1–R7. Violations are returned in a fixed order (invalid data first, then
/// conflicts) so the first one is the most fundamental problem and becomes the API's primary error.
/// </summary>
public sealed class BookingValidator(
    AppDbContext db,
    IOptions<BookingRulesOptions> bookingRules,
    IOptions<OfficeOptions> office,
    TimeProvider clock) : IBookingValidator
{
    private readonly BookingRulesOptions _rules = bookingRules.Value;
    private readonly TimeZoneInfo _officeTimeZone = office.Value.ResolveTimeZone();

    public async Task<IReadOnlyList<BookingRuleViolation>> ValidateAsync(
        BookingCandidate candidate, CancellationToken cancellationToken = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var (room, organizer, start, end, attendeeCount, _) = candidate;
        var violations = new List<BookingRuleViolation>();

        // R4: valid time range
        var hasValidRange = end > start;
        if (!hasValidRange)
        {
            violations.Add(Invalid(ErrorCodes.InvalidTimeRange, "The end time must be after the start time."));
        }

        if (start <= now)
        {
            violations.Add(Invalid(ErrorCodes.InvalidTimeRange, "The reservation must start in the future."));
        }

        // R1: maximum duration (exactly the maximum is allowed)
        if (hasValidRange && end - start > _rules.MaximumDuration)
        {
            violations.Add(Invalid(
                ErrorCodes.MaximumDurationExceeded,
                $"A reservation cannot last longer than {_rules.MaximumDurationDays} days."));
        }

        // R6: booking horizon (starting exactly at the horizon is allowed)
        if (start - now > _rules.MaximumBookingHorizon)
        {
            violations.Add(Invalid(
                ErrorCodes.BookingHorizonExceeded,
                $"A reservation cannot start more than {_rules.MaximumBookingHorizonDays} days in the future."));
        }

        // R5: capacity
        if (attendeeCount is { } attendees)
        {
            if (attendees < 1)
            {
                violations.Add(Invalid(ErrorCodes.InvalidAttendeeCount, "A reservation needs at least one attendee."));
            }
            else if (attendees > room.Capacity)
            {
                violations.Add(Invalid(
                    ErrorCodes.RoomCapacityExceeded,
                    $"{room.Name} seats at most {room.Capacity} people, but {attendees} attendees were requested."));
            }
        }

        // R7: active rooms only
        if (!room.IsActive)
        {
            violations.Add(Invalid(ErrorCodes.RoomInactive, $"{room.Name} is inactive and cannot be booked."));
        }

        // Overlap checks are meaningless without a valid interval.
        if (!hasValidRange)
        {
            return violations;
        }

        // R2: no overlapping room bookings (cancelled reservations never block)
        var roomConflict = await Overlapping(candidate)
            .Where(r => r.RoomId == room.Id)
            .OrderBy(r => r.StartDateTime)
            .FirstOrDefaultAsync(cancellationToken);
        if (roomConflict is not null)
        {
            violations.Add(Conflict(
                ErrorCodes.RoomBookingConflict,
                $"{room.Name} is already booked during the selected time ({Describe(roomConflict)})."));
        }

        // R3: no overlapping organizer bookings, in any room
        if (organizer is not null)
        {
            var organizerConflict = await Overlapping(candidate)
                .Include(r => r.Room)
                .Where(r => r.OrganizerId == organizer.Id)
                .OrderBy(r => r.StartDateTime)
                .FirstOrDefaultAsync(cancellationToken);
            if (organizerConflict is not null)
            {
                violations.Add(Conflict(
                    ErrorCodes.OrganizerBookingConflict,
                    $"{organizer.FullName} already organizes a meeting at that time " +
                    $"in {organizerConflict.Room?.Name ?? organizerConflict.RoomId} ({Describe(organizerConflict)})."));
            }
        }

        return violations;
    }

    private IQueryable<Reservation> Overlapping(BookingCandidate candidate)
    {
        var query = db.Reservations.Where(ReservationRules.Overlaps(candidate.Start, candidate.End));
        if (candidate.ExcludeReservationId is { } excludedId)
        {
            query = query.Where(r => r.Id != excludedId);
        }

        return query;
    }

    private string Describe(Reservation reservation)
    {
        var start = TimeZoneInfo.ConvertTimeFromUtc(reservation.StartDateTime, _officeTimeZone);
        var end = TimeZoneInfo.ConvertTimeFromUtc(reservation.EffectiveEndDateTime, _officeTimeZone);
        var endFormat = start.Date == end.Date ? "HH:mm" : "d MMM HH:mm";
        return string.Create(
            CultureInfo.InvariantCulture,
            $"\"{reservation.MeetingTitle}\", {start:d MMM HH:mm}–{end.ToString(endFormat, CultureInfo.InvariantCulture)} office time");
    }

    private static BookingRuleViolation Invalid(string code, string message) =>
        new(code, message, StatusCodes.Status400BadRequest);

    private static BookingRuleViolation Conflict(string code, string message) =>
        new(code, message, StatusCodes.Status409Conflict);
}
