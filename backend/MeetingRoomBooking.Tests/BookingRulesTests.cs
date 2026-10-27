using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Errors;
using MeetingRoomBooking.Api.Models;
using MeetingRoomBooking.Tests.TestSupport;
using static MeetingRoomBooking.Tests.TestSupport.BookingTestContext;

namespace MeetingRoomBooking.Tests;

/// <summary>Rules R1–R7 as enforced when creating or editing a reservation.</summary>
public sealed class BookingRulesTests : IDisposable
{
    private readonly BookingTestContext _context = new();

    private static readonly DateTime Tomorrow9 = Now.Date.AddDays(1).AddHours(9);

    // ---- R1: maximum duration ----

    [Fact]
    public async Task Valid_reservation_shorter_than_maximum_duration_is_created()
    {
        var created = await _context.Reservations.CreateAsync(Request(start: Tomorrow9, duration: TimeSpan.FromHours(2)));

        Assert.Equal(ReservationStatus.Booked, created.Status);
        Assert.Equal(Tomorrow9, created.StartDateTime);
        Assert.Single(_context.Db.Reservations);
    }

    [Fact]
    public async Task Reservation_lasting_exactly_the_maximum_duration_is_allowed()
    {
        var created = await _context.Reservations.CreateAsync(Request(start: Tomorrow9, duration: TimeSpan.FromDays(7)));

        Assert.Equal(TimeSpan.FromDays(7), created.EndDateTime - created.StartDateTime);
    }

    [Fact]
    public async Task Reservation_longer_than_the_maximum_duration_is_rejected()
    {
        await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(start: Tomorrow9, duration: TimeSpan.FromDays(7).Add(TimeSpan.FromMinutes(1)))),
            ErrorCodes.MaximumDurationExceeded, 400);
    }

    [Fact]
    public async Task Maximum_duration_comes_from_configuration()
    {
        _context.Rules.MaximumDurationDays = 1;

        await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(start: Tomorrow9, duration: TimeSpan.FromHours(25))),
            ErrorCodes.MaximumDurationExceeded, 400);
    }

    // ---- R2: no overlapping room bookings ----

    [Fact]
    public async Task Overlapping_booking_for_the_same_room_is_rejected()
    {
        _context.AddExisting(Tomorrow9, Tomorrow9.AddHours(1), organizerId: Bob);

        await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(start: Tomorrow9.AddMinutes(30))),
            ErrorCodes.RoomBookingConflict, 409);
    }

    [Fact]
    public async Task Booking_that_fully_contains_an_existing_one_is_rejected()
    {
        _context.AddExisting(Tomorrow9.AddMinutes(15), Tomorrow9.AddMinutes(45), organizerId: Bob);

        await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(start: Tomorrow9, duration: TimeSpan.FromHours(1))),
            ErrorCodes.RoomBookingConflict, 409);
    }

    [Fact]
    public async Task Non_overlapping_bookings_for_the_same_room_are_allowed()
    {
        _context.AddExisting(Tomorrow9, Tomorrow9.AddHours(1), organizerId: Bob);

        var created = await _context.Reservations.CreateAsync(Request(start: Tomorrow9.AddHours(3)));

        Assert.Equal(2, _context.Db.Reservations.Count());
        Assert.Equal(Tomorrow9.AddHours(3), created.StartDateTime);
    }

    [Fact]
    public async Task Exactly_adjacent_bookings_are_allowed()
    {
        _context.AddExisting(Tomorrow9, Tomorrow9.AddHours(1), organizerId: Alice);

        // Starts exactly when the other ends, same room and same organizer.
        await _context.Reservations.CreateAsync(Request(start: Tomorrow9.AddHours(1)));
        // Ends exactly when the other starts.
        await _context.Reservations.CreateAsync(Request(start: Tomorrow9.AddHours(-1)));

        Assert.Equal(3, _context.Db.Reservations.Count());
    }

    [Fact]
    public async Task Cancelled_reservations_do_not_block_the_room()
    {
        _context.AddExisting(Tomorrow9, Tomorrow9.AddHours(1), organizerId: Bob, status: ReservationStatus.Cancelled);

        var created = await _context.Reservations.CreateAsync(Request(start: Tomorrow9));

        Assert.Equal(ReservationStatus.Booked, created.Status);
    }

    // ---- R3: no overlapping organizer bookings ----

    [Fact]
    public async Task Overlapping_booking_for_the_same_organizer_in_another_room_is_rejected()
    {
        _context.AddExisting(Tomorrow9, Tomorrow9.AddHours(1), roomId: Beta, organizerId: Alice);

        await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(roomId: Alpha, organizerId: Alice, start: Tomorrow9.AddMinutes(30))),
            ErrorCodes.OrganizerBookingConflict, 409);
    }

    [Fact]
    public async Task Cancelled_reservations_do_not_block_the_organizer()
    {
        _context.AddExisting(Tomorrow9, Tomorrow9.AddHours(1), roomId: Beta, organizerId: Alice, status: ReservationStatus.Cancelled);

        var created = await _context.Reservations.CreateAsync(Request(roomId: Alpha, organizerId: Alice, start: Tomorrow9));

        Assert.Equal(ReservationStatus.Booked, created.Status);
    }

    // ---- R4: valid time range ----

    [Fact]
    public async Task Reservation_starting_in_the_past_is_rejected()
    {
        await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(start: Now.AddHours(-1))),
            ErrorCodes.InvalidTimeRange, 400);
    }

    [Fact]
    public async Task Reservation_starting_exactly_now_is_rejected()
    {
        await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(start: Now)),
            ErrorCodes.InvalidTimeRange, 400);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-30)]
    public async Task Reservation_ending_at_or_before_its_start_is_rejected(int durationMinutes)
    {
        await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(start: Tomorrow9, duration: TimeSpan.FromMinutes(durationMinutes))),
            ErrorCodes.InvalidTimeRange, 400);
    }

    [Fact]
    public async Task Offsets_are_normalised_to_utc_before_validation()
    {
        // 12:00 at UTC+3 is 09:00 UTC.
        var start = new DateTimeOffset(Tomorrow9).ToOffset(TimeSpan.FromHours(3));
        var request = new ReservationRequest
        {
            RoomId = Alpha,
            OrganizerId = Alice,
            MeetingTitle = "Planning",
            StartDateTime = start,
            EndDateTime = start.AddHours(1),
            AttendeeCount = 2
        };

        var created = await _context.Reservations.CreateAsync(request);

        Assert.Equal(Tomorrow9, created.StartDateTime);
        Assert.Equal(DateTimeKind.Utc, created.StartDateTime.Kind);
    }

    // ---- R5: capacity ----

    [Fact]
    public async Task Attendees_equal_to_capacity_are_allowed()
    {
        var created = await _context.Reservations.CreateAsync(Request(roomId: Alpha, attendees: 8));

        Assert.Equal(8, created.AttendeeCount);
    }

    [Fact]
    public async Task Reservation_exceeding_room_capacity_is_rejected()
    {
        await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(roomId: Beta, attendees: 5)),
            ErrorCodes.RoomCapacityExceeded, 400);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-2)]
    public async Task Non_positive_attendee_count_is_rejected(int attendees)
    {
        await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(attendees: attendees)),
            ErrorCodes.InvalidAttendeeCount, 400);
    }

    // ---- R6: booking horizon ----

    [Fact]
    public async Task Reservation_starting_exactly_at_the_horizon_is_allowed()
    {
        var created = await _context.Reservations.CreateAsync(Request(start: Now.AddDays(90)));

        Assert.Equal(Now.AddDays(90), created.StartDateTime);
    }

    [Fact]
    public async Task Reservation_starting_beyond_the_booking_horizon_is_rejected()
    {
        await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(start: Now.AddDays(90).AddMinutes(1))),
            ErrorCodes.BookingHorizonExceeded, 400);
    }

    [Fact]
    public async Task Booking_horizon_comes_from_configuration()
    {
        _context.Rules.MaximumBookingHorizonDays = 14;

        await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(start: Now.AddDays(15))),
            ErrorCodes.BookingHorizonExceeded, 400);
    }

    // ---- R7: active rooms only ----

    [Fact]
    public async Task Reservation_for_an_inactive_room_is_rejected()
    {
        await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(roomId: Closed)),
            ErrorCodes.RoomInactive, 400);
    }

    // ---- General ----

    [Fact]
    public async Task All_broken_rules_are_reported_with_the_most_fundamental_first()
    {
        var exception = await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(roomId: Closed, start: Now.AddHours(-2), attendees: 50)),
            ErrorCodes.InvalidTimeRange, 400);

        var codes = exception.Details.Select(d => d.Code).ToList();
        Assert.Equal([ErrorCodes.InvalidTimeRange, ErrorCodes.RoomCapacityExceeded, ErrorCodes.RoomInactive], codes);
    }

    [Fact]
    public async Task Unknown_room_and_user_return_not_found()
    {
        await AssertRejected(() => _context.Reservations.CreateAsync(Request(roomId: "R-404")), ErrorCodes.RoomNotFound, 404);
        await AssertRejected(() => _context.Reservations.CreateAsync(Request(organizerId: "U-404")), ErrorCodes.UserNotFound, 404);
    }

    [Fact]
    public async Task Rejected_reservation_is_not_saved()
    {
        await Assert.ThrowsAsync<ApiException>(() => _context.Reservations.CreateAsync(Request(roomId: Beta, attendees: 9)));

        Assert.Empty(_context.Db.Reservations);
    }

    [Fact]
    public async Task Seven_day_reservation_across_a_daylight_saving_change_is_measured_in_real_time()
    {
        // EU clocks go forward on 29 March 2026. Durations are compared in UTC, so 7×24h is exactly 7 days.
        var start = new DateTime(2026, 3, 26, 8, 0, 0, DateTimeKind.Utc);

        var created = await _context.Reservations.CreateAsync(Request(start: start, duration: TimeSpan.FromDays(7)));

        Assert.Equal(start.AddDays(7), created.EndDateTime);
    }

    [Fact]
    public async Task Reservation_crossing_midnight_conflicts_with_one_on_the_next_morning()
    {
        var lateEvening = Now.Date.AddDays(1).AddHours(22);
        _context.AddExisting(lateEvening.AddHours(3), lateEvening.AddHours(4), organizerId: Bob); // 01:00–02:00 next day

        await AssertRejected(
            () => _context.Reservations.CreateAsync(Request(start: lateEvening, duration: TimeSpan.FromHours(4))),
            ErrorCodes.RoomBookingConflict, 409);
    }

    public void Dispose() => _context.Dispose();
}
