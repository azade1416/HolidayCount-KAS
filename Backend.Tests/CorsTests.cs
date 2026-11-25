using System.Net.Http;
using Xunit;

namespace Backend.Tests;

// CORS: a browser may call the API only from the client's own address.
public class CorsTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public CorsTests(ApiFactory factory) => _client = factory.CreateClient();

    // The browser asks first (preflight): "may this origin call you?"
    private Task<HttpResponseMessage> Preflight(string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/auth/users");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "GET");
        return _client.SendAsync(request);
    }

    [Fact]
    public async Task Client_origin_is_allowed()
    {
        var response = await Preflight(ApiFactory.ClientOrigin);

        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values));
        Assert.Equal(ApiFactory.ClientOrigin, Assert.Single(values));
    }

    [Fact]
    public async Task Other_origin_is_not_allowed()
    {
        var response = await Preflight("https://evil.example");

        // No header = the browser blocks the call.
        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
