using MeetingRoomBooking.Api.Models;

namespace MeetingRoomBooking.Api.Data;

/// <summary>
/// Deterministic demo data. The structure is always the same; reservation times are anchored to the
/// current office day so there are always past, ongoing and upcoming meetings to look at.
/// <para>
/// Meetings are placed in fixed, non-overlapping daily slots, each slot gets distinct organizers, and the
/// "today" meetings use dedicated rooms and organizers, so the seed never breaks the overlap rules.
/// Past meetings were valid when they were booked; they are inserted directly as history.
/// </para>
/// </summary>
public static class DataSeeder
{
    private enum UsageProfile
    {
        WellUsed,
        Mixed,
        Underused
    }

    private sealed record SeedRoom(
        string Id,
        string Name,
        int Floor,
        string Location,
        int Capacity,
        EquipmentType Equipment,
        bool IsActive,
        int Popularity,
        UsageProfile Profile);

    private const EquipmentType Projector = EquipmentType.Projector;
    private const EquipmentType Tv = EquipmentType.TvScreen;
    private const EquipmentType Video = EquipmentType.VideoConferencing;
    private const EquipmentType Board = EquipmentType.Whiteboard;

    // Popularity 0–10 controls how often a room is booked; the profile controls how the bookings are used.
    private static readonly SeedRoom[] Rooms =
    [
        new("R-101", "Atlas", 1, "East wing", 16, Projector | Video | Board, true, 7, UsageProfile.WellUsed),
        new("R-102", "Harbor", 1, "Lobby side", 6, Tv | Board, true, 5, UsageProfile.Mixed),
        new("R-103", "Meadow", 1, "Garden view", 8, Tv | Video, true, 4, UsageProfile.WellUsed),
        new("R-104", "Canyon", 1, "West wing", 10, Projector | Board, true, 6, UsageProfile.Underused),
        new("R-105", "Pine", 1, "Lobby side", 4, Board, false, 0, UsageProfile.WellUsed),

        new("R-201", "Quartz", 2, "North wing", 12, Projector | Tv | Video, true, 8, UsageProfile.Underused),
        new("R-202", "Vertex", 2, "North wing", 8, Tv | Video | Board, true, 6, UsageProfile.WellUsed),
        new("R-203", "Pulse", 2, "South wing", 6, Tv, true, 4, UsageProfile.Mixed),
        new("R-204", "Ember", 2, "South wing", 4, Board, true, 3, UsageProfile.WellUsed),
        new("R-205", "Lumen", 2, "Atrium", 20, Projector | Tv | Video | Board, true, 5, UsageProfile.Mixed),

        new("R-301", "Nebula", 3, "North-east corner", 12, Projector | Tv | Video | Board, true, 8, UsageProfile.WellUsed),
        new("R-302", "Zenith", 3, "North-west corner", 6, Tv | Video | Board, true, 5, UsageProfile.Mixed),
        new("R-303", "Aurora", 3, "North wing", 8, Projector | Video | Board, true, 6, UsageProfile.WellUsed),
        new("R-304", "Orion", 3, "East wing", 10, Projector | Tv | Video, true, 5, UsageProfile.WellUsed),
        new("R-305", "Summit", 3, "South-west corner", 4, Tv | Board, true, 3, UsageProfile.Mixed),
        new("R-306", "Horizon", 3, "South wing", 8, Tv | Video | Board, true, 9, UsageProfile.Underused),

        new("R-401", "Skyline", 4, "Panorama side", 14, Projector | Tv | Video | Board, true, 6, UsageProfile.WellUsed),
        new("R-402", "Cosmos", 4, "North wing", 10, Projector | Video, true, 4, UsageProfile.Mixed),
        new("R-403", "Echo", 4, "Quiet zone", 4, Tv, true, 2, UsageProfile.WellUsed),
        new("R-404", "Polaris", 4, "South wing", 6, Tv | Board, false, 0, UsageProfile.WellUsed)
    ];

    private static readonly (string Id, string FirstName, string LastName)[] Users =
    [
        ("U-001", "John", "Smith"),
        ("U-002", "Emma", "Wilson"),
        ("U-003", "Michael", "Brown"),
        ("U-004", "Sophia", "Davis"),
        ("U-005", "Daniel", "Lee"),
        ("U-006", "Olivia", "Martin"),
        ("U-007", "Lukas", "Kazlauskas"),
        ("U-008", "Ieva", "Jankauskaitė"),
        ("U-009", "Mantas", "Petraitis"),
        ("U-010", "Greta", "Vasiliauskaitė"),
        ("U-011", "Tomas", "Žukauskas"),
        ("U-012", "Rūta", "Balčiūnienė")
    ];

    private static readonly string[] Titles =
    [
        "Sprint planning", "Daily stand-up", "Design review", "Client workshop", "Quarterly business review",
        "Architecture sync", "Hiring interview", "Product demo", "Retrospective", "1:1 catch-up",
        "Marketing brainstorm", "Budget planning", "Security briefing", "Onboarding session", "Release go/no-go"
    ];

    // Non-overlapping office-time slots: (hour, minute, duration in minutes).
    private static readonly (int Hour, int Minute, int Minutes)[] Slots =
    [
        (9, 0, 60), (10, 30, 90), (13, 0, 60), (14, 30, 90), (16, 30, 60)
    ];

    private const int PastDays = 21;
    private const int FutureDays = 12;

    public static void Seed(AppDbContext db, DateTime nowUtc, TimeZoneInfo officeTimeZone)
    {
        if (db.Rooms.Any())
        {
            return;
        }

        db.Rooms.AddRange(Rooms.Select(r => new Room
        {
            Id = r.Id,
            Name = r.Name,
            Floor = r.Floor,
            Location = r.Location,
            Capacity = r.Capacity,
            Equipment = r.Equipment,
            IsActive = r.IsActive
        }));
        db.Users.AddRange(Users.Select(u => new User { Id = u.Id, FirstName = u.FirstName, LastName = u.LastName }));
        db.Reservations.AddRange(BuildReservations(nowUtc, officeTimeZone));
        db.SaveChanges();
    }

    public static List<Reservation> BuildReservations(DateTime nowUtc, TimeZoneInfo officeTimeZone)
    {
        var reservations = new List<Reservation>();
        var officeToday = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, officeTimeZone).Date;
        var slotOrganizers = Users.Select(u => u.Id).ToArray();

        for (var dayOffset = -PastDays; dayOffset <= FutureDays; dayOffset++)
        {
            var day = officeToday.AddDays(dayOffset);
            if (dayOffset == 0 || day.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
            {
                continue;
            }

            for (var slotIndex = 0; slotIndex < Slots.Length; slotIndex++)
            {
                var (hour, minute, minutes) = Slots[slotIndex];
                var start = TimeZoneInfo.ConvertTimeToUtc(day.AddHours(hour).AddMinutes(minute), officeTimeZone);
                var end = start.AddMinutes(minutes);
                var organizerIndex = Hash(dayOffset, slotIndex) % slotOrganizers.Length;
                var organizersUsed = 0;

                for (var roomIndex = 0; roomIndex < Rooms.Length; roomIndex++)
                {
                    var room = Rooms[roomIndex];
                    var bookingChance = dayOffset < 0 ? room.Popularity * 5 : room.Popularity * 3 / 2;
                    if (!room.IsActive || Hash(roomIndex, dayOffset, slotIndex) >= bookingChance)
                    {
                        continue;
                    }

                    // Every meeting in a slot gets a different organizer (R3).
                    if (organizersUsed == slotOrganizers.Length)
                    {
                        break;
                    }

                    var organizerId = slotOrganizers[(organizerIndex + organizersUsed++) % slotOrganizers.Length];
                    var outcome = Hash(roomIndex, dayOffset, slotIndex, 7);
                    var reservation = new Reservation
                    {
                        RoomId = room.Id,
                        OrganizerId = organizerId,
                        MeetingTitle = Titles[Hash(roomIndex, dayOffset, slotIndex, 3) % Titles.Length],
                        StartDateTime = start,
                        EndDateTime = end,
                        AttendeeCount = Attendees(room, outcome),
                        CreatedAt = start.AddDays(-(3 + outcome % 10)),
                        Status = ReservationStatus.Booked
                    };

                    if (dayOffset < 0)
                    {
                        ApplyPastOutcome(reservation, room.Profile, outcome, minutes);
                    }
                    else if (outcome < 8)
                    {
                        reservation.Status = ReservationStatus.Cancelled;
                    }

                    if (reservation.CreatedAt > nowUtc)
                    {
                        reservation.CreatedAt = nowUtc;
                    }

                    reservations.Add(reservation);
                }
            }
        }

        reservations.AddRange(TodayReservations(nowUtc));
        return reservations;
    }

    /// <summary>Meetings relative to "now": two in progress and two starting later today.</summary>
    private static IEnumerable<Reservation> TodayReservations(DateTime nowUtc)
    {
        var anchor = new DateTime(nowUtc.Ticks - nowUtc.Ticks % TimeSpan.FromMinutes(15).Ticks, DateTimeKind.Utc);

        Reservation Today(string roomId, string organizerId, string title, int startMinutes, int endMinutes, int attendees) => new()
        {
            RoomId = roomId,
            OrganizerId = organizerId,
            MeetingTitle = title,
            StartDateTime = anchor.AddMinutes(startMinutes),
            EndDateTime = anchor.AddMinutes(endMinutes),
            AttendeeCount = attendees,
            Status = ReservationStatus.Booked,
            CreatedAt = anchor.AddDays(-2)
        };

        // Slot meetings never touch "today" (dayOffset 0 is skipped) and run 09:00–17:30 office time,
        // so these windows (at most anchor − 45 min to anchor + 4 h) cannot overlap them.
        yield return Today("R-301", "U-001", "Sprint planning", -30, 60, 10);
        yield return Today("R-101", "U-007", "Client workshop", -45, 45, 12);
        yield return Today("R-306", "U-002", "Design review", 30, 150, 7);
        yield return Today("R-302", "U-004", "Hiring interview", 180, 240, 3);
    }

    private static void ApplyPastOutcome(Reservation reservation, UsageProfile profile, int outcome, int minutes)
    {
        var (cancelBelow, earlyBelow) = profile switch
        {
            UsageProfile.WellUsed => (5, 15),
            UsageProfile.Mixed => (12, 35),
            _ => (30, 80)
        };

        if (outcome < cancelBelow)
        {
            reservation.Status = ReservationStatus.Cancelled;
            return;
        }

        reservation.Status = ReservationStatus.Completed;
        if (outcome < earlyBelow)
        {
            // Under-used rooms are typically vacated very early; others end a bit early.
            var usedShare = profile == UsageProfile.Underused ? 0.15 + outcome % 20 / 100.0 : 0.5 + outcome % 30 / 100.0;
            var usedMinutes = Math.Max(10, (int)Math.Round(minutes * usedShare / 5) * 5);
            reservation.ActualEndDateTime = reservation.StartDateTime.AddMinutes(usedMinutes);
        }
    }

    private static int Attendees(SeedRoom room, int outcome) =>
        room.Profile == UsageProfile.Underused
            ? Math.Max(1, room.Capacity / 4 + outcome % 3)
            : Math.Clamp(2 + outcome % room.Capacity, 1, room.Capacity);

    /// <summary>Small deterministic hash in [0, 100) so the seed is identical on every run.</summary>
    private static int Hash(params int[] values)
    {
        unchecked
        {
            var hash = 17;
            foreach (var value in values)
            {
                hash = hash * 31 + value + 1013;
                hash ^= hash >> 13;
            }

            return (int)((uint)hash % 100);
        }
    }
}
