namespace MeetingRoomBooking.Api.DTOs;

/// <summary>
/// Recorded usage of one room. "Actual" hours come from recorded meeting end times (ending early),
/// not from sensors, so they measure how long meetings ran, not how many people were present.
/// </summary>
public sealed record RoomUsageDto(
    string RoomId,
    string RoomName,
    int Floor,
    int Capacity,
    bool IsActive,
    int TotalReservations,
    int UpcomingReservations,
    int CompletedMeetings,
    int CancelledReservations,
    int EarlyEndedMeetings,
    double PlannedHours,
    double ActualHours,
    double UnusedHours,
    double? UsageRatePercent,
    double? CancellationRatePercent,
    double? AverageSeatFillPercent,
    bool IsFrequentlyBookedRarelyUsed,
    IReadOnlyList<string> FlagReasons);

public sealed record AnalyticsThresholdsDto(
    int MinimumReservationsForFlag,
    double LowUsageThresholdPercent,
    double HighCancellationThresholdPercent);

public sealed record RoomUsageTotalsDto(
    int TotalReservations,
    int CompletedMeetings,
    int CancelledReservations,
    int EarlyEndedMeetings,
    double PlannedHours,
    double ActualHours,
    double? UsageRatePercent,
    int FlaggedRooms);

public sealed record RoomUsageReportDto(
    DateTime GeneratedAt,
    DateTime? From,
    DateTime? To,
    AnalyticsThresholdsDto Thresholds,
    RoomUsageTotalsDto Totals,
    IReadOnlyList<RoomUsageDto> Rooms);
