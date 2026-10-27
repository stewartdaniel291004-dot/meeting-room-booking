namespace MeetingRoomBooking.Api.Models;

public class Room
{
    /// <summary>Unique, human-readable identifier such as "R-301".</summary>
    public required string Id { get; set; }

    public required string Name { get; set; }

    public int Capacity { get; set; }

    public int Floor { get; set; }

    /// <summary>Free-text location within the floor, e.g. "North wing".</summary>
    public required string Location { get; set; }

    public EquipmentType Equipment { get; set; }

    /// <summary>Inactive rooms (e.g. under renovation) cannot be booked.</summary>
    public bool IsActive { get; set; } = true;

    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
