using MeetingRoomBooking.Api.Data;
using MeetingRoomBooking.Api.DTOs;
using MeetingRoomBooking.Api.Errors;
using MeetingRoomBooking.Api.Interfaces;
using MeetingRoomBooking.Api.Mapping;
using Microsoft.EntityFrameworkCore;

namespace MeetingRoomBooking.Api.Services;

public sealed class UserService(AppDbContext db, TimeProvider clock) : IUserService
{
    private DateTime Now => clock.GetUtcNow().UtcDateTime;

    public async Task<IReadOnlyList<UserDto>> GetUsersAsync(string? search, CancellationToken cancellationToken = default)
    {
        var users = db.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            users = users.Where(u =>
                (u.FirstName + " " + u.LastName).ToLower().Contains(term) || u.Id.ToLower().Contains(term));
        }

        var userList = await users.OrderBy(u => u.Id).ToListAsync(cancellationToken);
        var activeCounts = await CountActiveReservationsAsync(cancellationToken);

        return userList.Select(u => u.ToDto(activeCounts.GetValueOrDefault(u.Id))).ToList();
    }

    public async Task<UserDetailsDto> GetUserAsync(string id, CancellationToken cancellationToken = default)
    {
        var now = Now;
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, cancellationToken)
                   ?? throw ApiException.NotFound(ErrorCodes.UserNotFound, $"User '{id}' was not found.");

        var active = await db.Reservations
            .AsNoTracking()
            .Include(r => r.Room)
            .Include(r => r.Organizer)
            .Where(r => r.OrganizerId == id)
            .Where(ReservationRules.IsActive(now))
            .OrderBy(r => r.StartDateTime)
            .ToListAsync(cancellationToken);

        return new UserDetailsDto(user.ToDto(active.Count), active.Select(r => r.ToDto(now)).ToList());
    }

    private async Task<Dictionary<string, int>> CountActiveReservationsAsync(CancellationToken cancellationToken)
    {
        var counts = await db.Reservations
            .AsNoTracking()
            .Where(ReservationRules.IsActive(Now))
            .GroupBy(r => r.OrganizerId)
            .Select(g => new { OrganizerId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        return counts.ToDictionary(c => c.OrganizerId, c => c.Count);
    }
}
