using Backend.Data;
using Backend.Models;
using Backend.Services;
using LinqToDB;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;
using Xunit;

namespace Backend.Tests;

// Starts the real API in memory, connected to a throwaway PostgreSQL in Docker.
public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _database = new PostgreSqlBuilder("postgres:15-alpine").Build();

    // 1. Test settings: the test database and a test JWT key (never the real one).
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:DefaultConnection", _database.GetConnectionString());
        builder.UseSetting("Jwt:Key", "test-only-signing-key-at-least-32-bytes");
    }

    // 2. Start the database before the tests, remove it after.
    public Task InitializeAsync() => _database.StartAsync();
    Task IAsyncLifetime.DisposeAsync() => _database.DisposeAsync().AsTask();

    // 3. Create a user with the given role and return a valid token for them.
    public async Task<string> TokenForNewUser(string role)
    {
        using var scope = Services.CreateScope();
        var user = new User { Fullname = role, Username = $"{role}-{Guid.NewGuid()}", PasswordHash = "unused", Role = role };
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().InsertAsync(user);
        return scope.ServiceProvider.GetRequiredService<ITokenService>().GenerateToken(user);
    }
}