namespace MeetingRoomBooking.Api.Models;

public class User
{
    /// <summary>Unique, human-readable identifier such as "U-001".</summary>
    public required string Id { get; set; }

    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    public string FullName => $"{FirstName} {LastName}";

    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}
