using MeetingRoomBooking.Api.Data;
using MeetingRoomBooking.Api.Models;

namespace MeetingRoomBooking.Tests;

/// <summary>The demo data must obey the same overlap rules the API enforces, whenever the app starts.</summary>
public sealed class SeedDataTests
{
    public static TheoryData<string, string> StartMoments => new()
    {
        { "2026-10-26T21:08:00Z", "Europe/Vilnius" }, // late evening, the day after the DST change
        { "2026-03-29T00:20:00Z", "Europe/Vilnius" }, // just before clocks go forward
        { "2026-06-15T09:00:00Z", "Europe/Vilnius" }, // office hours
        { "2026-01-04T23:50:00Z", "UTC" }             // Sunday, just before midnight
    };

    [Theory]
    [MemberData(nameof(StartMoments))]
    public void Seeded_reservations_never_overlap_by_room_or_organizer(string nowText, string timeZoneId)
    {
        var now = DateTime.Parse(nowText, null, System.Globalization.DateTimeStyles.AdjustToUniversal);
        var reservations = DataSeeder.BuildReservations(now, TimeZoneInfo.FindSystemTimeZoneById(timeZoneId))
            .Where(r => r.Status != ReservationStatus.Cancelled)
            .ToList();

        AssertNoOverlaps(reservations, r => r.RoomId);
        AssertNoOverlaps(reservations, r => r.OrganizerId);
    }

    [Fact]
    public void Seed_contains_every_kind_of_reservation_the_demo_needs()
    {
        var now = new DateTime(2026, 10, 26, 10, 0, 0, DateTimeKind.Utc);
        var reservations = DataSeeder.BuildReservations(now, TimeZoneInfo.Utc);

        Assert.Contains(reservations, r => r.Status == ReservationStatus.Booked && r.StartDateTime <= now && now < r.EndDateTime);
        Assert.Contains(reservations, r => r.Status == ReservationStatus.Booked && r.StartDateTime > now);
        Assert.Contains(reservations, r => r.Status == ReservationStatus.Completed && r.ActualEndDateTime < r.EndDateTime);
        Assert.Contains(reservations, r => r.Status == ReservationStatus.Cancelled);
        Assert.All(reservations.Where(r => r.StartDateTime > now), r => Assert.True(r.EndDateTime > r.StartDateTime));
    }

    private static void AssertNoOverlaps(List<Reservation> reservations, Func<Reservation, string> key)
    {
        foreach (var group in reservations.GroupBy(key))
        {
            var ordered = group.OrderBy(r => r.StartDateTime).ToList();
            for (var i = 1; i < ordered.Count; i++)
            {
                Assert.True(
                    ordered[i].StartDateTime >= ordered[i - 1].EffectiveEndDateTime,
                    $"{group.Key}: reservation at {ordered[i].StartDateTime:o} overlaps one ending {ordered[i - 1].EffectiveEndDateTime:o}");
            }
        }
    }
}
