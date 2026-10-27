using System.Reflection;
using System.Text.Json.Serialization;
using MeetingRoomBooking.Api.Configuration;
using MeetingRoomBooking.Api.Data;
using MeetingRoomBooking.Api.Interfaces;
using MeetingRoomBooking.Api.Middleware;
using MeetingRoomBooking.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Configuration
builder.Services.AddOptions<BookingRulesOptions>()
    .Bind(builder.Configuration.GetSection(BookingRulesOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddOptions<OfficeOptions>()
    .Bind(builder.Configuration.GetSection(OfficeOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddOptions<AnalyticsOptions>()
    .Bind(builder.Configuration.GetSection(AnalyticsOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// Data and services
builder.Services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("MeetingRoomBooking"));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<IBookingValidator, BookingValidator>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IReservationService, ReservationService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();

// HTTP
builder.Services
    // Request DTOs mark required members explicitly; without this, a body that fails to deserialize also
    // reports a confusing "request field is required" error.
    .AddControllers(options => options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true)
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.Configure<ApiBehaviorOptions>(options =>
    options.InvalidModelStateResponseFactory = ApiExceptionHandler.InvalidModelStateResponse);
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Caucus · Meeting Room Booking API",
        Version = "v1",
        Description = "Rooms, users, reservations and room-usage analytics. All timestamps are UTC (ISO 8601)."
    });
    var xmlFile = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
    if (File.Exists(xmlFile))
    {
        options.IncludeXmlComments(xmlFile);
    }
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var office = scope.ServiceProvider.GetRequiredService<IOptions<OfficeOptions>>().Value;
    var clock = scope.ServiceProvider.GetRequiredService<TimeProvider>();
    DataSeeder.Seed(db, clock.GetUtcNow().UtcDateTime, office.ResolveTimeZone());
}

app.UseExceptionHandler();
app.UseSwagger();
app.UseSwaggerUI(options => options.DocumentTitle = "Caucus · Meeting Room Booking API");
app.UseCors();
app.MapControllers();
app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();

app.Run();

// Exposed for WebApplicationFactory in the integration tests.
public partial class Program;
