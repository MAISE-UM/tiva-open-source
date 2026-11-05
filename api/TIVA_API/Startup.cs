using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi;
using TIVA_API.Authentication;
using TIVA_API.Helpers;
using TIVA_API.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.IdentityModel.Tokens;
using AppContext = TIVA_API.Helpers.AppContext;

namespace TIVA_API
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
            StaticConfiguration = configuration;
        }

        private IConfiguration Configuration { get; }
        public static IConfiguration StaticConfiguration { get; private set; }
        
        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            // DEBUG ONLY
            // IdentityModelEventSource.LogCompleteSecurityArtifact = true;
            // IdentityModelEventSource.ShowPII = true;
            //////////////////////////
            
            services.AddHttpLogging(_ => { });
            services.AddCors(options => options.AddPolicy("AllowAll", builder =>
            {
                builder
                    .WithOrigins(Configuration["AppSettings:SITE_URL"]?.Split(",") ?? []) // Replace with your React app's URL()
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials();
            }));
            services.AddMvc(o =>
            {
                var policy = new AuthorizationPolicyBuilder()
                    .RequireAuthenticatedUser()
                    .Build();
                o.Filters.Add(new AuthorizeFilter(policy));
            });
            services.AddControllers().AddJsonOptions(x =>
                x.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.Preserve);
            services.AddTransient<IRepository, Repository>();
            services.AddTransient<ITokenService, TokenService>();

            // API JWT Token Verification
            var rsa = RSA.Create();
            var key = Configuration["JwtAuthentication:JWT_PRIVATE_KEY"];
            rsa.ImportFromPem(key.AsSpan());
            services.AddAuthentication(i =>
            {
                i.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                i.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                i.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
                i.DefaultSignInScheme = JwtBearerDefaults.AuthenticationScheme;

            }).AddCookie(options =>
            {
                options.Cookie.Name = "X-Access-Token";
            }).AddJwtBearer(options =>
            {
                options.SaveToken = true;
                options.RequireHttpsMetadata = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = false,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = Configuration["JwtAuthentication:ValidIssuer"],
                    ValidAudience = Configuration["JwtAuthentication:ValidAudience"],
                    IssuerSigningKey = new RsaSecurityKey(rsa)
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        context.Token = context.Request.Cookies["X-Access-Token"];
                        return Task.CompletedTask;
                    },
                    OnAuthenticationFailed = context =>
                    {
                        Console.WriteLine($"Authentication failed: {context.Exception.Message}");
                        return Task.CompletedTask;
                    }
                };
            });
            
            services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders =
                    ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            });
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "MWA_API", Version = "v1" });

                c.AddSecurityDefinition("bearer", new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "JWT Authorization header using the Bearer scheme."
                });

                c.AddSecurityRequirement(document => new OpenApiSecurityRequirement()
                {
                    [new OpenApiSecuritySchemeReference("bearer", document)] = []
                });
            });
            // services.AddSession();  
            services.AddHttpContextAccessor();
            
            // Session and SessionCache state are stored in process memory (single instance deployment).
            // SessionCache and AddSession need an IDistributedCache, this registers the in-memory one.
            services.AddDistributedMemoryCache();

            // Services setup
            services.AddScoped<SessionCache>();
            services.AddSession(options =>
            {
                options.IdleTimeout = TimeSpan.FromMinutes(60);
                options.Cookie.HttpOnly = true;
                options.Cookie.IsEssential = true;
            });
            services.AddSingleton<EndpointCache>();
            services.AddSingleton<AccessCheckerService>();

            // EHR (SMART on FHIR) integration
            services.Configure<EhrSettings>(Configuration.GetSection(EhrSettings.SectionName));
            services.AddScoped<SmartOnFhirService>();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public async void Configure(IApplicationBuilder app, IWebHostEnvironment env, EndpointCache endpointCache)
        {
            app.UseHttpLogging();
            app.UseForwardedHeaders();
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "TIVA API v1"));
            }
            app.UseSession();
            app.Use(async (context, next) =>
            {
                context.Response.Headers.Append("Access-Control-Allow-Credentials", "true");
                context.Response.Headers.Append("Access-Control-Allow-Origin", Configuration["AppSettings:SITE_URL"]);
                await next();
            });
            app.UseHttpsRedirection();
            
            app.UseCors("AllowAll");

            AppContext.Configure(app.ApplicationServices.GetRequiredService<IHttpContextAccessor>());
            
            app.UseRouting();
            
            // JWT Auth
            app.UseAuthentication();
            app.UseAuthorization();
            
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                MapEhrRoutes(endpoints);
            });

            // Warm up the cache
            try
            {
                await endpointCache.WarmCache();
            }
            catch (Exception ex)
            {
                // Log the error but don't prevent the application from starting
                Console.WriteLine($"Error warming cache: {ex.Message}");
            }
        }

        // EHR login paths come from Ehr:Routes so a site keeps the URLs registered with its EHR vendor
        private void MapEhrRoutes(IEndpointRouteBuilder endpoints)
        {
            var ehr = Configuration.GetSection(EhrSettings.SectionName).Get<EhrSettings>() ?? new EhrSettings();
            if (!ehr.Enabled)
            {
                return;
            }

            if (ehr.AllowedIssuers.Count == 0)
            {
                Console.WriteLine("Warning: Ehr:AllowedIssuers is empty, EHR launches from any issuer are accepted");
            }

            void Map(string action, string path) => endpoints.MapControllerRoute(
                $"ehr-{action}", path.Trim('/'), new { controller = "EhrOAuth", action });

            Map("Launch", ehr.Routes.Launch);
            Map("Callback", ehr.Routes.Callback);
            Map("Complete", ehr.Routes.Complete);
            Map("StandaloneLaunch", ehr.Routes.StandaloneLaunch);
            Map("StandaloneCallback", ehr.Routes.StandaloneCallback);
        }
    }
}