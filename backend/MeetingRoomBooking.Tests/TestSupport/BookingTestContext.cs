using MeetingRoomBooking.Api.Configuration;
using MeetingRoomBooking.Api.Data;
using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Errors;
using MeetingRoomBooking.Api.Models;
using MeetingRoomBooking.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace MeetingRoomBooking.Tests.TestSupport;

/// <summary>
/// A fresh, isolated in-memory database and a frozen clock per test, with a few known rooms and users.
/// </summary>
public sealed class BookingTestContext : IDisposable
{
    /// <summary>"Now" for every test: Tuesday 10 March 2026, 08:00 UTC.</summary>
    public static readonly DateTime Now = new(2026, 3, 10, 8, 0, 0, DateTimeKind.Utc);

    public const string Alpha = "R-1";      // capacity 8, active
    public const string Beta = "R-2";       // capacity 4, active
    public const string Closed = "R-3";     // capacity 10, inactive
    public const string Alice = "U-1";
    public const string Bob = "U-2";

    public BookingTestContext()
    {
        Clock = new FakeTimeProvider(new DateTimeOffset(Now));
        Db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"tests-{Guid.NewGuid()}")
            .Options);

        Db.Rooms.AddRange(
            new Room { Id = Alpha, Name = "Alpha", Capacity = 8, Floor = 1, Location = "Test", Equipment = EquipmentType.Projector | EquipmentType.Whiteboard },
            new Room { Id = Beta, Name = "Beta", Capacity = 4, Floor = 2, Location = "Test", Equipment = EquipmentType.TvScreen },
            new Room { Id = Closed, Name = "Closed", Capacity = 10, Floor = 2, Location = "Test", IsActive = false });
        Db.Users.AddRange(
            new User { Id = Alice, FirstName = "Alice", LastName = "Archer" },
            new User { Id = Bob, FirstName = "Bob", LastName = "Baker" });
        Db.SaveChanges();
    }

    public FakeTimeProvider Clock { get; }

    public AppDbContext Db { get; }

    public BookingRulesOptions Rules { get; } = new() { MaximumDurationDays = 7, MaximumBookingHorizonDays = 90 };

    public AnalyticsOptions AnalyticsOptions { get; } = new()
    {
        MinimumReservationsForFlag = 3,
        LowUsageThresholdPercent = 60,
        HighCancellationThresholdPercent = 30
    };

    public OfficeOptions Office { get; } = new() { TimeZone = "UTC" };

    public BookingValidator Validator => new(Db, Options.Create(Rules), Options.Create(Office), Clock);

    public ReservationService Reservations => new(Db, Validator, Clock);

    public RoomService Rooms => new(Db, Validator, Clock);

    public UserService Users => new(Db, Clock);

    public AnalyticsService Analytics => new(Db, Options.Create(AnalyticsOptions), Clock);

    public static ReservationRequest Request(
        string roomId = Alpha,
        string organizerId = Alice,
        DateTime? start = null,
        TimeSpan? duration = null,
        int attendees = 4,
        DateTime? end = null)
    {
        var startTime = start ?? Now.AddDays(1);
        var endTime = end ?? startTime + (duration ?? TimeSpan.FromHours(1));
        return new ReservationRequest
        {
            RoomId = roomId,
            OrganizerId = organizerId,
            MeetingTitle = "Planning",
            StartDateTime = new DateTimeOffset(startTime),
            EndDateTime = new DateTimeOffset(endTime),
            AttendeeCount = attendees
        };
    }

    /// <summary>Inserts a reservation directly, bypassing validation (e.g. for history).</summary>
    public Reservation AddExisting(
        DateTime start,
        DateTime end,
        string roomId = Alpha,
        string organizerId = Alice,
        ReservationStatus status = ReservationStatus.Booked,
        DateTime? actualEnd = null,
        int attendees = 4)
    {
        var reservation = new Reservation
        {
            RoomId = roomId,
            OrganizerId = organizerId,
            MeetingTitle = "Existing",
            StartDateTime = start,
            EndDateTime = end,
            ActualEndDateTime = actualEnd,
            AttendeeCount = attendees,
            Status = status,
            CreatedAt = Now.AddDays(-30)
        };
        Db.Reservations.Add(reservation);
        Db.SaveChanges();
        return reservation;
    }

    public static async Task<ApiException> AssertRejected(Func<Task> action, string expectedCode, int expectedStatus)
    {
        var exception = await Assert.ThrowsAsync<ApiException>(action);
        Assert.Equal(expectedCode, exception.Code);
        Assert.Equal(expectedStatus, exception.StatusCode);
        Assert.False(string.IsNullOrWhiteSpace(exception.Message));
        return exception;
    }

    public void Dispose() => Db.Dispose();
}
