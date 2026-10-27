using System.Linq.Expressions;
using MeetingRoomBooking.Api.Models;

namespace MeetingRoomBooking.Api.Services;

/// <summary>
/// Single source of truth for how reservation state is interpreted over time.
/// <para>
/// A Booked reservation whose planned end has passed is reported as Completed (it ran its course);
/// it is not rewritten in storage, so no background job is needed to keep statuses correct.
/// </para>
/// </summary>
public static class ReservationRules
{
    /// <summary>
    /// The reservation holds its room/organizer during [Start, ActualEnd ?? End) unless cancelled.
    /// Standard half-open interval overlap, so back-to-back meetings do not conflict.
    /// </summary>
    public static Expression<Func<Reservation, bool>> Overlaps(DateTime start, DateTime end) =>
        r => r.Status != ReservationStatus.Cancelled
             && r.StartDateTime < end
             && start < (r.ActualEndDateTime ?? r.EndDateTime);

    /// <summary>Active = Booked and not yet ended. Ongoing meetings count as active.</summary>
    public static Expression<Func<Reservation, bool>> IsActive(DateTime now) =>
        r => r.Status == ReservationStatus.Booked && r.EndDateTime > now;

    public static Expression<Func<Reservation, bool>> HasEffectiveStatus(ReservationStatus status, DateTime now) =>
        status switch
        {
            ReservationStatus.Booked => r => r.Status == ReservationStatus.Booked && r.EndDateTime > now,
            ReservationStatus.Completed => r => r.Status == ReservationStatus.Completed
                                                || (r.Status == ReservationStatus.Booked && r.EndDateTime <= now),
            _ => r => r.Status == ReservationStatus.Cancelled
        };

    public static ReservationStatus EffectiveStatus(Reservation reservation, DateTime now) =>
        reservation.Status == ReservationStatus.Booked && reservation.EndDateTime <= now
            ? ReservationStatus.Completed
            : reservation.Status;

    public static bool IsInProgress(Reservation reservation, DateTime now) =>
        reservation.Status == ReservationStatus.Booked
        && reservation.StartDateTime <= now
        && now < reservation.EndDateTime;

    public static bool IsUpcoming(Reservation reservation, DateTime now) =>
        reservation.Status == ReservationStatus.Booked && reservation.StartDateTime > now;

    public static bool EndedEarly(Reservation reservation) =>
        reservation.ActualEndDateTime.HasValue && reservation.ActualEndDateTime < reservation.EndDateTime;
}
