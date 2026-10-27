using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using MeetingRoomBooking.Api.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;

namespace MeetingRoomBooking.Tests;

/// <summary>End-to-end checks of the HTTP contract (status codes and the shared error body) against the real app.</summary>
public sealed class ApiContractTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Seeded_data_is_served()
    {
        var rooms = await _client.GetFromJsonAsync<List<RoomDto>>("/api/rooms", Json);
        var users = await _client.GetFromJsonAsync<List<UserDto>>("/api/users", Json);

        Assert.NotEmpty(rooms!);
        Assert.Contains(rooms!, r => !r.IsActive);
        Assert.NotEmpty(users!);
    }

    [Fact]
    public async Task Booking_rule_violation_returns_code_and_message()
    {
        var start = DateTimeOffset.UtcNow.AddDays(2);
        var response = await _client.PostAsJsonAsync("/api/reservations", new
        {
            roomId = "R-403",
            organizerId = "U-005",
            meetingTitle = "Too many people",
            startDateTime = start,
            endDateTime = start.AddHours(1),
            attendeeCount = 40
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>(Json);
        Assert.Equal("ROOM_CAPACITY_EXCEEDED", error!.Code);
        Assert.Contains("Echo", error.Message);
    }

    [Fact]
    public async Task Malformed_body_returns_validation_error_in_the_same_shape()
    {
        var body = new StringContent("""{"roomId":"R-301","startDateTime":"tomorrow"}""", Encoding.UTF8, "application/json");

        var response = await _client.PostAsync("/api/reservations", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>(Json);
        Assert.Equal("VALIDATION_ERROR", error!.Code);
        Assert.Contains(error.Details, d => d.Field == "startDateTime");
    }

    [Fact]
    public async Task Missing_resources_return_404()
    {
        var room = await _client.GetAsync("/api/rooms/R-999");
        var reservation = await _client.PostAsync("/api/reservations/999999/cancel", null);

        Assert.Equal(HttpStatusCode.NotFound, room.StatusCode);
        Assert.Equal("ROOM_NOT_FOUND", (await room.Content.ReadFromJsonAsync<ErrorResponse>(Json))!.Code);
        Assert.Equal(HttpStatusCode.NotFound, reservation.StatusCode);
        Assert.Equal("RESERVATION_NOT_FOUND", (await reservation.Content.ReadFromJsonAsync<ErrorResponse>(Json))!.Code);
    }

    [Fact]
    public async Task Created_reservation_returns_201_and_a_second_identical_booking_returns_409()
    {
        var start = new DateTimeOffset(DateTime.UtcNow.Date.AddDays(60).AddHours(6), TimeSpan.Zero);
        var request = new
        {
            roomId = "R-204",
            organizerId = "U-012",
            meetingTitle = "Contract test",
            startDateTime = start,
            endDateTime = start.AddHours(1),
            attendeeCount = 2
        };

        var first = await _client.PostAsJsonAsync("/api/reservations", request);
        var second = await _client.PostAsJsonAsync("/api/reservations", request);

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.NotNull(first.Headers.Location);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal("ROOM_BOOKING_CONFLICT", (await second.Content.ReadFromJsonAsync<ErrorResponse>(Json))!.Code);
    }
}
