namespace MeetingRoomBooking.Api.DTOs;

public sealed record DashboardSummaryDto(
    DateTime GeneratedAt,
    int TotalRooms,
    int ActiveRooms,
    int InactiveRooms,
    int AvailableNow,
    int OccupiedNow,
    int UpcomingReservations,
    int MeetingsToday,
    int TotalUsers,
    IReadOnlyList<ReservationDto> InProgressMeetings,
    IReadOnlyList<ReservationDto> UpcomingMeetings,
    IReadOnlyList<RoomUsageDto> UtilizationHighlights);

/// <summary>Configuration the frontend needs to mirror the backend rules in its controls.</summary>
public sealed record SettingsDto(
    int MaximumDurationDays,
    int MaximumBookingHorizonDays,
    string OfficeTimeZone,
    DateTime ServerTimeUtc);
