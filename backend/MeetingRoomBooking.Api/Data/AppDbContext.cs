using MeetingRoomBooking.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace MeetingRoomBooking.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Room> Rooms => Set<Room>();

    public DbSet<User> Users => Set<User>();

    public DbSet<Reservation> Reservations => Set<Reservation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Every timestamp is UTC. Re-applying the kind on read keeps JSON output unambiguous ("...Z").
        var utc = new ValueConverter<DateTime, DateTime>(
            value => value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime(),
            value => DateTime.SpecifyKind(value, DateTimeKind.Utc));
        var nullableUtc = new ValueConverter<DateTime?, DateTime?>(
            value => value.HasValue ? (value.Value.Kind == DateTimeKind.Utc ? value : value.Value.ToUniversalTime()) : value,
            value => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : value);

        modelBuilder.Entity<Room>(room =>
        {
            room.HasKey(r => r.Id);
            room.Property(r => r.Name).IsRequired().HasMaxLength(100);
            room.Property(r => r.Location).IsRequired().HasMaxLength(200);
        });

        modelBuilder.Entity<User>(user =>
        {
            user.HasKey(u => u.Id);
            user.Ignore(u => u.FullName);
        });

        modelBuilder.Entity<Reservation>(reservation =>
        {
            reservation.HasKey(r => r.Id);
            reservation.Ignore(r => r.EffectiveEndDateTime);
            reservation.Property(r => r.MeetingTitle).IsRequired().HasMaxLength(200);
            reservation.Property(r => r.StartDateTime).HasConversion(utc);
            reservation.Property(r => r.EndDateTime).HasConversion(utc);
            reservation.Property(r => r.CreatedAt).HasConversion(utc);
            reservation.Property(r => r.ActualEndDateTime).HasConversion(nullableUtc);

            reservation.HasOne(r => r.Room)
                .WithMany(r => r.Reservations)
                .HasForeignKey(r => r.RoomId);

            reservation.HasOne(r => r.Organizer)
                .WithMany(u => u.Reservations)
                .HasForeignKey(r => r.OrganizerId);
        });
    }
}
