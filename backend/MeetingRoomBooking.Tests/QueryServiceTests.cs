using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Models;
using MeetingRoomBooking.Tests.TestSupport;
using static MeetingRoomBooking.Tests.TestSupport.BookingTestContext;

namespace MeetingRoomBooking.Tests;

/// <summary>Calculated read models: active reservation counts, room filters, occupancy and analytics.</summary>
public sealed class QueryServiceTests : IDisposable
{
    private readonly BookingTestContext _context = new();

    [Fact]
    public async Task Active_reservation_count_includes_upcoming_and_ongoing_meetings_only()
    {
        _context.AddExisting(Now.AddDays(1), Now.AddDays(1).AddHours(1));                                // upcoming: counts
        _context.AddExisting(Now.AddMinutes(-10), Now.AddMinutes(50), roomId: Beta);                      // ongoing: counts
        _context.AddExisting(Now.AddDays(-1), Now.AddDays(-1).AddHours(1));                               // elapsed
        _context.AddExisting(Now.AddDays(2), Now.AddDays(2).AddHours(1), status: ReservationStatus.Cancelled);
        _context.AddExisting(Now.AddHours(-2), Now.AddHours(1), roomId: Beta, status: ReservationStatus.Completed,
            actualEnd: Now.AddHours(-1));                                                                 // ended early
        _context.AddExisting(Now.AddDays(1), Now.AddDays(1).AddHours(1), roomId: Beta, organizerId: Bob); // other user

        var users = await _context.Users.GetUsersAsync(null);

        Assert.Equal(2, users.Single(u => u.Id == Alice).ActiveReservationCount);
        Assert.Equal(1, users.Single(u => u.Id == Bob).ActiveReservationCount);
    }

    [Fact]
    public async Task Active_reservation_count_updates_after_booking_and_cancelling()
    {
        var booked = await _context.Reservations.CreateAsync(Request(start: Now.AddDays(1)));
        Assert.Equal(1, (await _context.Users.GetUserAsync(Alice)).User.ActiveReservationCount);

        await _context.Reservations.CancelAsync(booked.Id);
        Assert.Equal(0, (await _context.Users.GetUserAsync(Alice)).User.ActiveReservationCount);
    }

    [Fact]
    public async Task Room_filters_apply_capacity_floor_and_all_selected_equipment()
    {
        var byCapacity = await _context.Rooms.GetRoomsAsync(new RoomQuery { MinCapacity = 8 });
        var byFloor = await _context.Rooms.GetRoomsAsync(new RoomQuery { Floor = 2 });
        var byEquipment = await _context.Rooms.GetRoomsAsync(new RoomQuery
        {
            Equipment = [EquipmentType.Projector, EquipmentType.Whiteboard]
        });
        var noMatch = await _context.Rooms.GetRoomsAsync(new RoomQuery
        {
            Equipment = [EquipmentType.Projector, EquipmentType.TvScreen]
        });

        Assert.Equal([Alpha, Closed], byCapacity.Select(r => r.Id));
        Assert.Equal([Beta, Closed], byFloor.Select(r => r.Id));
        Assert.Equal([Alpha], byEquipment.Select(r => r.Id));
        Assert.Empty(noMatch);
    }

    [Fact]
    public async Task Occupancy_distinguishes_in_progress_booked_available_and_inactive()
    {
        _context.AddExisting(Now.AddMinutes(-15), Now.AddMinutes(45), roomId: Alpha);
        _context.AddExisting(Now.AddMinutes(30), Now.AddMinutes(90), roomId: Beta);

        var occupancy = await _context.Rooms.GetOccupancyAsync(Now, Now.AddHours(1), null);
        var states = occupancy.ToDictionary(o => o.RoomId, o => o.State);

        Assert.Equal(RoomOccupancyState.InProgress, states[Alpha]);
        Assert.Equal(RoomOccupancyState.Booked, states[Beta]);
        Assert.Equal(RoomOccupancyState.Inactive, states[Closed]);

        // Later the same day both rooms are free again; a future booking is never shown as "in progress".
        var later = await _context.Rooms.GetOccupancyAsync(Now.AddHours(3), Now.AddHours(4), null);
        Assert.All(later.Where(o => o.RoomId != Closed), o => Assert.Equal(RoomOccupancyState.Available, o.State));
    }

    [Fact]
    public async Task Analytics_separates_completed_cancelled_and_upcoming_and_flags_underused_rooms()
    {
        var day = Now.Date.AddDays(-3).AddHours(9);
        // Alpha: three 2h meetings each vacated after 30 minutes, plus one cancellation → flagged.
        for (var i = 0; i < 3; i++)
        {
            var start = day.AddDays(i);
            _context.AddExisting(start, start.AddHours(2), status: ReservationStatus.Completed, actualEnd: start.AddMinutes(30));
        }

        _context.AddExisting(day.AddHours(4), day.AddHours(5), status: ReservationStatus.Cancelled);
        _context.AddExisting(Now.AddDays(1), Now.AddDays(1).AddHours(1));
        // Beta: one full meeting, below the minimum reservation count → never flagged.
        _context.AddExisting(day, day.AddHours(1), roomId: Beta, organizerId: Bob);

        var report = await _context.Analytics.GetRoomUsageAsync(null, null);
        var alpha = report.Rooms.Single(r => r.RoomId == Alpha);
        var beta = report.Rooms.Single(r => r.RoomId == Beta);
        var closed = report.Rooms.Single(r => r.RoomId == Closed);

        Assert.Equal(5, alpha.TotalReservations);
        Assert.Equal(3, alpha.CompletedMeetings);
        Assert.Equal(1, alpha.CancelledReservations);
        Assert.Equal(1, alpha.UpcomingReservations);
        Assert.Equal(6, alpha.PlannedHours);
        Assert.Equal(1.5, alpha.ActualHours);
        Assert.Equal(25, alpha.UsageRatePercent);
        Assert.Equal(20, alpha.CancellationRatePercent);
        Assert.True(alpha.IsFrequentlyBookedRarelyUsed);
        Assert.NotEmpty(alpha.FlagReasons);

        Assert.Equal(100, beta.UsageRatePercent);
        Assert.False(beta.IsFrequentlyBookedRarelyUsed);

        // No data → no invented percentages.
        Assert.Null(closed.UsageRatePercent);
        Assert.Null(closed.CancellationRatePercent);
        Assert.Equal(alpha.RoomId, report.Rooms[0].RoomId);
    }

    public void Dispose() => _context.Dispose();
}
