using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Errors;
using MeetingRoomBooking.Api.Models;
using MeetingRoomBooking.Tests.TestSupport;
using static MeetingRoomBooking.Tests.TestSupport.BookingTestContext;

namespace MeetingRoomBooking.Tests;

/// <summary>Cancel, end early, edit, and how each one changes availability.</summary>
public sealed class ReservationLifecycleTests : IDisposable
{
    private readonly BookingTestContext _context = new();

    private static readonly DateTime Tomorrow9 = Now.Date.AddDays(1).AddHours(9);

    [Fact]
    public async Task Cancelling_keeps_the_record_and_frees_the_room()
    {
        var booked = await _context.Reservations.CreateAsync(Request(start: Tomorrow9));
        var before = await _context.Rooms.GetAvailabilityAsync(Alpha, Tomorrow9, Tomorrow9.AddHours(1), null);
        Assert.False(before.IsAvailable);

        var cancelled = await _context.Reservations.CancelAsync(booked.Id);

        Assert.Equal(ReservationStatus.Cancelled, cancelled.Status);
        Assert.Single(_context.Db.Reservations); // not deleted
        var after = await _context.Rooms.GetAvailabilityAsync(Alpha, Tomorrow9, Tomorrow9.AddHours(1), null);
        Assert.True(after.IsAvailable);
        await _context.Reservations.CreateAsync(Request(organizerId: Bob, start: Tomorrow9));
    }

    [Fact]
    public async Task Cancelling_twice_is_rejected()
    {
        var booked = await _context.Reservations.CreateAsync(Request(start: Tomorrow9));
        await _context.Reservations.CancelAsync(booked.Id);

        await AssertRejected(() => _context.Reservations.CancelAsync(booked.Id), ErrorCodes.ReservationNotCancellable, 409);
    }

    [Fact]
    public async Task Meeting_in_progress_cannot_be_cancelled_but_can_be_ended_early()
    {
        var ongoing = _context.AddExisting(Now.AddMinutes(-30), Now.AddMinutes(30));

        await AssertRejected(() => _context.Reservations.CancelAsync(ongoing.Id), ErrorCodes.ReservationNotCancellable, 409);
        var ended = await _context.Reservations.EndEarlyAsync(ongoing.Id);

        Assert.Equal(ReservationStatus.Completed, ended.Status);
        Assert.True(ended.EndedEarly);
    }

    [Fact]
    public async Task Ending_early_records_actual_end_keeps_planned_end_and_frees_the_room()
    {
        var plannedEnd = Now.AddMinutes(60);
        var ongoing = _context.AddExisting(Now.AddMinutes(-30), plannedEnd);

        var ended = await _context.Reservations.EndEarlyAsync(ongoing.Id);

        Assert.Equal(Now, ended.ActualEndDateTime);
        Assert.Equal(plannedEnd, ended.EndDateTime);
        Assert.Equal(TimeSpan.FromMinutes(30), ended.ActualEndDateTime!.Value - ended.StartDateTime);

        // The rest of the original slot can now be booked by someone else.
        _context.Clock.Advance(TimeSpan.FromMinutes(5));
        var rebooked = await _context.Reservations.CreateAsync(
            Request(organizerId: Bob, start: Now.AddMinutes(10), end: plannedEnd));
        Assert.Equal(ReservationStatus.Booked, rebooked.Status);
    }

    [Fact]
    public async Task Ending_early_feeds_actual_hours_into_analytics()
    {
        var ongoing = _context.AddExisting(Now.AddHours(-1), Now.AddHours(1));
        await _context.Reservations.EndEarlyAsync(ongoing.Id);

        var report = await _context.Analytics.GetRoomUsageAsync(null, null);
        var alpha = report.Rooms.Single(r => r.RoomId == Alpha);

        Assert.Equal(2, alpha.PlannedHours);
        Assert.Equal(1, alpha.ActualHours);
        Assert.Equal(50, alpha.UsageRatePercent);
        Assert.Equal(1, alpha.EarlyEndedMeetings);
    }

    [Fact]
    public async Task Only_meetings_in_progress_can_be_ended_early()
    {
        var upcoming = await _context.Reservations.CreateAsync(Request(start: Tomorrow9));
        var past = _context.AddExisting(Now.AddDays(-1), Now.AddDays(-1).AddHours(1));

        await AssertRejected(() => _context.Reservations.EndEarlyAsync(upcoming.Id), ErrorCodes.MeetingNotInProgress, 409);
        await AssertRejected(() => _context.Reservations.EndEarlyAsync(past.Id), ErrorCodes.MeetingNotInProgress, 409);
    }

    [Fact]
    public async Task Unknown_reservation_returns_not_found()
    {
        await AssertRejected(() => _context.Reservations.CancelAsync(999), ErrorCodes.ReservationNotFound, 404);
        await AssertRejected(() => _context.Reservations.EndEarlyAsync(999), ErrorCodes.ReservationNotFound, 404);
    }

    [Fact]
    public async Task Elapsed_booked_meeting_is_reported_as_completed()
    {
        _context.AddExisting(Now.AddHours(-3), Now.AddHours(-2));

        var completed = await _context.Reservations.GetReservationsAsync(new ReservationQuery { Status = ReservationStatus.Completed });
        var booked = await _context.Reservations.GetReservationsAsync(new ReservationQuery { Status = ReservationStatus.Booked });

        Assert.Single(completed);
        Assert.Empty(booked);
    }

    [Fact]
    public async Task Editing_a_reservation_does_not_conflict_with_itself()
    {
        var booked = await _context.Reservations.CreateAsync(Request(start: Tomorrow9, duration: TimeSpan.FromHours(1)));

        var edited = await _context.Reservations.UpdateAsync(booked.Id, Request(start: Tomorrow9.AddMinutes(30), duration: TimeSpan.FromHours(1)));

        Assert.Equal(Tomorrow9.AddMinutes(30), edited.StartDateTime);
    }

    [Fact]
    public async Task Edited_reservation_is_validated_against_the_rules()
    {
        _context.AddExisting(Tomorrow9.AddHours(2), Tomorrow9.AddHours(3), organizerId: Bob);
        var booked = await _context.Reservations.CreateAsync(Request(start: Tomorrow9));

        await AssertRejected(
            () => _context.Reservations.UpdateAsync(booked.Id, Request(start: Tomorrow9.AddHours(2))),
            ErrorCodes.RoomBookingConflict, 409);
        await AssertRejected(
            () => _context.Reservations.UpdateAsync(booked.Id, Request(roomId: Beta, start: Tomorrow9, attendees: 6)),
            ErrorCodes.RoomCapacityExceeded, 400);
    }

    [Fact]
    public async Task Filters_combine_room_organizer_status_and_date_range()
    {
        _context.AddExisting(Tomorrow9, Tomorrow9.AddHours(1), roomId: Alpha, organizerId: Alice);
        _context.AddExisting(Tomorrow9.AddDays(1), Tomorrow9.AddDays(1).AddHours(1), roomId: Alpha, organizerId: Alice);
        _context.AddExisting(Tomorrow9, Tomorrow9.AddHours(1), roomId: Beta, organizerId: Bob);
        _context.AddExisting(Tomorrow9.AddHours(2), Tomorrow9.AddHours(3), roomId: Alpha, organizerId: Alice, status: ReservationStatus.Cancelled);

        var result = await _context.Reservations.GetReservationsAsync(new ReservationQuery
        {
            RoomId = Alpha,
            OrganizerId = Alice,
            Status = ReservationStatus.Booked,
            From = new DateTimeOffset(Tomorrow9.Date),
            To = new DateTimeOffset(Tomorrow9.Date.AddDays(1))
        });

        var only = Assert.Single(result);
        Assert.Equal(Tomorrow9, only.StartDateTime);
    }

    [Fact]
    public async Task List_shows_active_reservations_soonest_first_then_history_newest_first()
    {
        var past1 = _context.AddExisting(Now.AddDays(-2), Now.AddDays(-2).AddHours(1));
        var past2 = _context.AddExisting(Now.AddDays(-1), Now.AddDays(-1).AddHours(1));
        var ongoing = _context.AddExisting(Now.AddMinutes(-10), Now.AddMinutes(50), roomId: Beta);
        var later = _context.AddExisting(Now.AddDays(3), Now.AddDays(3).AddHours(1));
        var sooner = _context.AddExisting(Now.AddDays(1), Now.AddDays(1).AddHours(1));

        var list = await _context.Reservations.GetReservationsAsync(new ReservationQuery());

        Assert.Equal([ongoing.Id, sooner.Id, later.Id, past2.Id, past1.Id], list.Select(r => r.Id));
    }

    public void Dispose() => _context.Dispose();
}
