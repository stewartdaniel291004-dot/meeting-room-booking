using MeetingRoomBooking.Api.DTOs;

namespace MeetingRoomBooking.Api.Interfaces;

public interface IRoomService
{
    Task<IReadOnlyList<RoomDto>> GetRoomsAsync(RoomQuery query, CancellationToken cancellationToken = default);

    Task<RoomDetailsDto> GetRoomAsync(string id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FloorDto>> GetFloorsAsync(CancellationToken cancellationToken = default);

    Task<RoomAvailabilityDto> GetAvailabilityAsync(
        string id, DateTime start, DateTime end, int? excludeReservationId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RoomOccupancyDto>> GetOccupancyAsync(
        DateTime start, DateTime end, int? floor, CancellationToken cancellationToken = default);
}

public interface IUserService
{
    Task<IReadOnlyList<UserDto>> GetUsersAsync(string? search, CancellationToken cancellationToken = default);

    Task<UserDetailsDto> GetUserAsync(string id, CancellationToken cancellationToken = default);
}

public interface IReservationService
{
    Task<IReadOnlyList<ReservationDto>> GetReservationsAsync(ReservationQuery query, CancellationToken cancellationToken = default);

    Task<ReservationDto> GetReservationAsync(int id, CancellationToken cancellationToken = default);

    Task<ReservationDto> CreateAsync(ReservationRequest request, CancellationToken cancellationToken = default);

    Task<ReservationDto> UpdateAsync(int id, ReservationRequest request, CancellationToken cancellationToken = default);

    Task<ReservationDto> CancelAsync(int id, CancellationToken cancellationToken = default);

    Task<ReservationDto> EndEarlyAsync(int id, CancellationToken cancellationToken = default);
}

public interface IAnalyticsService
{
    Task<RoomUsageReportDto> GetRoomUsageAsync(DateTime? from, DateTime? to, CancellationToken cancellationToken = default);
}

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);
}
