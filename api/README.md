<h1>TIVA API</h1>

The ASP.NET Core API for TIVA. It lives in the `api/` folder of the TIVA repository, next to the Next.js client in `client/`. See the [root README](../README.md) for an overview of the project and the **clinical use disclaimer**: TIVA is not a cleared medical device and is not validated for clinical decision-making.

<h1>How To Install/Configure</h1>

When project loaded the nuget packages should be installed automatically.

<h3>Configurations</h3>

App configurations should go in two places:
1) appsettings.json - copy `deploy/appsettings.example.json` to `TIVA_API/appsettings.json` and fill it in
2) Environmental Variables - any setting can be overridden with an `MA_` prefixed variable, `Section:Key` becomes `MA_Section__Key`

   i) MA_AppSettings__DEBUG=[debug state];

   ii) MA_AppSettings__SECRET_KEY=[encryption key];

   iii) MA_AppSettings__SERVER_IP=[server IP];

   iv) MA_DatabaseSettings__DEFAULT=[database URL];

   v) MA_JwtAuthentication__SecurityKey=[JWT security key];

   v) MA_JwtAuthentication__ValidAudience=[JWT Valid Audience];

   v) MA_JwtAuthentication__ValidIssuer=[JWT Valid Issuer];

   vi) MA_JwtAuthentication__JWT_PRIVATE_KEY / JWT_PUBLIC_KEY=[PEM key pair used to sign TIVA tokens];

Optional sections, all off unless configured:

* `Ehr` - SMART on FHIR login and patient data from an EHR. See the setup guide, [docs/ehr-setup.html](../docs/ehr-setup.html) (also in the docs site)
* `Ldap` - username/password login against LDAP
* `Smtp` - error and help emails

<h3>Security: never deploy with Environment set to Development</h3>

`Environment` (the `MA_Environment` variable or the `Environment` key in appsettings.json) is `Production` in the example configs. **Never set it to `Development` on a server that is reachable by other people, or that holds real data.** When it is `Development`:

* **Test accounts sign in without a password.** Any user marked `TestAccount` in `Application_Users` is accepted on username alone, through both the normal login and the EHR login routes (`AuthenticationController`, `EhrOAuthController`, `Authentication/Repository.cs`)
* `GET /Admin/RestoreSession` and `GET /Admin/GetSession` are enabled. They return or restore the session of any user by name
* Do not leave `TestAccount` set on real users in a production database, as a second line of defence

The ASP.NET Core variable `ASPNETCORE_ENVIRONMENT` is separate. When it is `Development` the API also serves Swagger UI and the developer exception page (stack traces). Keep it `Production` on servers. The example web.config sets both to `Production`.

<h3>Which config file do I edit?</h3>

Three files configure a server. Each has a template in this repo:

| File | What it configures | When it is read | Template |
|---|---|---|---|
| `.env` (in `client/`, on the build machine) | The client | Built into the client by `npm run build`. Change it, then rebuild | `client/.env.example` |
| `web.config` (IIS site root) | Routing (`/REST` goes to the API, everything else to Next.js) and the API settings as `MA_*` variables | When the API starts. Change it, then recycle the app pool | `deploy/web.config.example` |
| `appsettings.json` | The same API settings, as JSON | When the API starts | `deploy/appsettings.example.json` |

`web.config.example` and `appsettings.example.json` hold the same settings, written two ways:

* **On a server: use the web.config only.** Do not put an `appsettings.json` on the server.
* **On your own machine (`dotnet run`): use `appsettings.json`**, because only IIS reads a web.config.

Check the folder you copy to the server: if your project folder has an `appsettings.json` (it is gitignored, so it is your own local one), `dotnet publish` puts a copy in the publish folder. Delete it from there before copying. If it reaches the server, any setting the web.config does not set silently falls back to your local values.

If the same setting appears in both files, **the web.config value is used**. (The `MA_*` lines in the web.config are `<environmentVariable>` entries: IIS passes them to the API as environment variables, and environment variables override `appsettings.json`.)

To write a setting in the web.config, take its JSON path and join it with `__` after `MA_`: `Ehr` → `ClientId` becomes `MA_Ehr__ClientId`. List items get an index: `MA_Ehr__User__StripPrefixes__0`.

<h3>Single Instance Requirement</h3>

Sessions (including EHR tokens), OAuth state and the endpoint cache are held in process memory. Run the API as a single instance:

* One server, no web farm
* IIS app pool Maximum Worker Processes = 1 (no web garden)
* Restarting or recycling the API signs users out. EHR users relaunch from the EHR
* After editing `api.Endpoints*`, call `POST /Admin/ReloadEndpoints` or recycle the app pool

<h3>Generating MA_AppSettings__SECRET_KEY</h3>

Run examples/GenerateAESKey.ps1 in powershell

<h3>Generating MA_JwtAuthentication__SecurityKey</h3>

Generate a random 32 character string using a password generator

<h3>DB Connection String Structure</h3>

Data Source=tcp:[fqdn];Initial Catalog=[database];Integrated Security=True;Pooling=true;Max Pool Size=50;

<h3> Building the Database Schema </h3>

Run the SQL code in examples/CreateDB.sql

<h1>How To Deploy To Windows</h1>

TIVA runs on a single Windows server with IIS: the Next.js client (the `client/` folder of this repo) at the site root and this API as the `/REST` application.

Example folder layout (drive and folder names are up to you):

```
D:\tiva\
  client\    Physical path of the IIS site. The Next.js build: .next, node_modules, public, server.js, and the site root web.config
  api\       Physical path of the IIS application "REST". The contents of the dotnet publish output
```

The application alias (`REST`) is what appears in the URL and what the web.config matches on. The folder name does not matter, so the API folder can be called `api` and sit outside the site folder, as above.

1. Install IIS with URL Rewrite, iisnode, the ASP.NET Core Hosting Bundle and Node.js
2. Publish the API: `dotnet publish TIVA_API -c Release -o publish`. Delete any `appsettings.json` from `publish` (see "Which config file do I edit?" above), then copy the contents of `publish` into the API folder, so `TIVA_API.dll` sits directly in it
3. Create two app pools:
   * Client: No Managed Code
   * API: No Managed Code, Integrated pipeline, Maximum Worker Processes = 1. If the database connection string uses `Integrated Security=True`, run this pool as an account that has access to the database (a domain service account, for example), or the API cannot reach the database. With a SQL login in the connection string the default identity is fine
4. Build the client (see [client/README.md](../client/README.md)) and copy it to the client folder
5. In IIS, create a site with the client folder as its physical path and the client app pool, and add an HTTPS binding with your certificate
6. Right-click the site, choose Add Application, set the alias to `REST`, the physical path to the API folder, and the application pool to the API pool
7. Copy `deploy/web.config.example` to the client folder as `web.config` and fill it in. It routes `/REST` to the API, everything else to Next.js, and holds all the API settings as `MA_*` variables. It contains secrets, so restrict read access to administrators and the app pool identities
8. Recycle both app pools, then open `https://<your host>/REST/Admin/Health`. It should return `Healthy`. Recycle the pools again after any web.config change
9. Optional, the documentation site: copy the repository's `docs` folder (without `docs\tools`) to the server, for example `D:\tiva\docs`, and in IIS right-click the site, choose Add Virtual Directory, alias `docs`, physical path that folder. The `^/(REST|docs(/|$))` condition in `web.config.example` keeps `/docs` away from Next.js. Browse to `https://<your host>/docs/`. The pages are static, so no app pool recycle is needed when you update them

<h1>How To Use</h1>

Endpoints are defined in api.Endpoints

Endpoint Parameters are in api.EndpointParameters

Endpoint Security definitions are in api.EndpointSecurity

Endpoints map to roles from admin.Application_Roles via Endpoint Security

Users and Clients are mapped to Roles as well via admin.Application_Client_Roles and Application_User_Roles

Users are added to Application_Users. A test account (`TestAccount` set) can sign in without a password, but only when `Environment` is `Development`. Never use test accounts in production (see "Security: never deploy with Environment set to Development" above)

Clients are added to Application_Clients. There are no test accounts for clients. The only way to add a client is via the AddClient endpoint.
This is because the secret key needs to be encrypted before it is stored in the DB. The clients are meant to be used if another API needs to access this API.
If you are using user based authentication then Application_Users should be used instead. 

The configuration items in Application_Configuration should have their value encrypted with EncryptString before storing in the DB

Application_Functions are meant to be used to store different functions mapped to roles. This can then be pulled down to the client
and for example display a button that is only viewable to Administrators

<h3>License</h3>

Copyright (C) 2023-2026 The Regents of the University of Michigan.

TIVA is free software, licensed under the [GNU General Public License](../LICENSE), version 3 or (at your option) any later version (GPL-3.0-or-later). It comes with no warranty. See the clinical use disclaimer in the [root README](../README.md).
