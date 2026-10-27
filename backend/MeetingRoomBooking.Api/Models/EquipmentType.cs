namespace MeetingRoomBooking.Api.Models;

/// <summary>
/// Room equipment. Stored as flags so a room can have several items and
/// "has all of the requested equipment" becomes a single bitwise check.
/// </summary>
[Flags]
public enum EquipmentType
{
    None = 0,
    Projector = 1,
    TvScreen = 2,
    VideoConferencing = 4,
    Whiteboard = 8
}

public static class EquipmentTypeExtensions
{
    public static readonly EquipmentType[] All =
    [
        EquipmentType.Projector,
        EquipmentType.TvScreen,
        EquipmentType.VideoConferencing,
        EquipmentType.Whiteboard
    ];

    public static IReadOnlyList<EquipmentType> ToList(this EquipmentType equipment) =>
        All.Where(item => equipment.HasFlag(item)).ToList();

    public static EquipmentType Combine(this IEnumerable<EquipmentType> items) =>
        items.Aggregate(EquipmentType.None, (combined, item) => combined | item);
}
