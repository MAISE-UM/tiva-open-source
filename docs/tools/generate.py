#!/usr/bin/env python3
"""Regenerates the generated parts of the TIVA documentation site in docs/.

Run from anywhere:   python docs/tools/generate.py
Verify without writing (exit 1 if a generated file is out of date):   python docs/tools/generate.py --check

Inputs (all in this repository):
  api/TIVA_API/examples/CreateDB.sql    -> docs/database.html (whole file)
  api/TIVA_API/examples/SeedData.sql    -> endpoint catalog in docs/api.html, model tables in docs/pk-models.html
  client/api/*.tsx                      -> client call-site table in docs/api.html
  client/package.json, TIVA_API.csproj  -> docs/opensource-libraries.html (whole file)

Sections inside api.html and pk-models.html between
  <!-- BEGIN GENERATED:name --> and <!-- END GENERATED:name -->
are replaced; everything else in those files is hand written. Only the Python standard library is used.
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs"
CREATE_DB = ROOT / "api" / "TIVA_API" / "examples" / "CreateDB.sql"
SEED = ROOT / "api" / "TIVA_API" / "examples" / "SeedData.sql"
CLIENT = ROOT / "client"
CSPROJ = ROOT / "api" / "TIVA_API" / "TIVA_API.csproj"

esc = html.escape


def read_sql(path):
    return path.read_text(encoding="utf-8-sig")


# --------------------------------------------------------------------------- SQL value parsing

def split_values(s):
    """Splits a SQL VALUES list on top-level commas and decodes literals (N'text', numbers, NULL)."""
    out, cur, i, in_quote = [], [], 0, False
    while i < len(s):
        c = s[i]
        if in_quote:
            if c == "'" and i + 1 < len(s) and s[i + 1] == "'":
                cur.append("'")
                i += 2
                continue
            if c == "'":
                in_quote = False
            cur.append(c)
        else:
            if c == "'":
                in_quote = True
                cur.append(c)
            elif c == ",":
                out.append("".join(cur).strip())
                cur = []
            else:
                cur.append(c)
        i += 1
    out.append("".join(cur).strip())
    return [decode_literal(v) for v in out]


def decode_literal(v):
    if v.upper() == "NULL":
        return None
    if v[:2].upper() == "N'" and v.endswith("'"):
        return v[2:-1].replace("''", "'")
    if v.startswith("'") and v.endswith("'"):
        return v[1:-1].replace("''", "'")
    try:
        return int(v)
    except ValueError:
        try:
            return float(v)
        except ValueError:
            return v


def parse_seed():
    text = read_sql(SEED)
    rows = {}
    for m in re.finditer(r"^INSERT INTO ([\w\.]+) \((.*?)\) VALUES \((.*)\);[ \t]*$", text, re.M):
        cols = [c.strip("[] ") for c in m.group(2).split(",")]
        rows.setdefault(m.group(1), []).append(dict(zip(cols, split_values(m.group(3)))))
    return rows


# --------------------------------------------------------------------------- CreateDB.sql parsing

def parse_create_db():
    text = read_sql(CREATE_DB)
    tables = {}
    for m in re.finditer(r"CREATE TABLE \[(\w+)\]\.\[(\w+)\]\(\s*\n(.*?)\n\s*CONSTRAINT \[(\w+)\] PRIMARY KEY\s+\w+\s*\n\((.*?)\)WITH", text, re.S):
        schema, name, body, _pk_name, pk_body = m.groups()
        cols = []
        for line in body.splitlines():
            cm = re.match(r"\s*\[(\w+)\]\s+\[(\w+)\](?:\((\w+(?:,\s*\d+)?)\))?\s*(IDENTITY\(\d+,\d+\))?\s*(NOT NULL|NULL)", line)
            if cm:
                col, typ, size, ident, nullable = cm.groups()
                cols.append({"name": col, "type": typ + (f"({size})" if size else ""),
                             "null": nullable == "NULL", "identity": bool(ident)})
        pk = re.findall(r"\[(\w+)\]\s+(?:ASC|DESC)", pk_body)
        tables[f"{schema}.{name}"] = {"schema": schema, "name": name, "cols": cols, "pk": pk}

    fks = []
    for m in re.finditer(r"ALTER TABLE \[(\w+)\]\.\[(\w+)\]\s+WITH CHECK ADD\s+CONSTRAINT \[(\w+)\] FOREIGN KEY\(\[(\w+)\]\)\s*REFERENCES \[(\w+)\]\.\[(\w+)\] \(\[(\w+)\]\)", text):
        fks.append({"table": f"{m.group(1)}.{m.group(2)}", "name": m.group(3), "col": m.group(4),
                    "ref": f"{m.group(5)}.{m.group(6)}", "ref_col": m.group(7)})

    routines = []
    for m in re.finditer(r"(?:N')?CREATE\s+(PROCEDURE|PROC|FUNCTION)\s+\[(\w+)\]\.\[(\w+)\]", text, re.I):
        kind = "Function" if m.group(1).upper() == "FUNCTION" else "Procedure"
        schema, name = m.group(2), m.group(3)
        rest = text[m.end():m.end() + 6000]
        if kind == "Function":
            pm = re.match(r"\s*\((.*?)\)\s*RETURNS\s+([\w\(\),\s]+?)\s*(?:AS|WITH)\b", rest, re.S)
            params_text = pm.group(1) if pm else ""
            returns = pm.group(2).strip() if pm else ""
        else:
            clean = re.sub(r"--[^\n]*", "", rest)
            am = re.search(r"\bAS\b", clean, re.I)
            params_text = clean[:am.start()] if am else ""
            returns = ""
        params = []
        for p in split_top_level(params_text):
            pm2 = re.match(r"\s*(@\w+)\s+([\w]+(?:\s*\([\d\w,\s]+\))?)\s*(?:=\s*([^\s,]+))?", p.strip(), re.S)
            if pm2:
                params.append({"name": pm2.group(1), "type": re.sub(r"\s+", " ", pm2.group(2)), "default": pm2.group(3)})
        optional = m.group(0).startswith("N'")
        routines.append({"kind": kind, "schema": schema, "name": name, "params": params, "returns": returns,
                         "optional": optional})
    return tables, fks, routines


def split_top_level(s):
    parts, depth, cur = [], 0, []
    for c in s:
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
        if c == "," and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(c)
    if "".join(cur).strip():
        parts.append("".join(cur))
    return parts


# Hand-written one-line purposes. Anything not listed shows no description.
TABLE_NOTES = {
    "admin.Application_Users": "Users who can sign in. Roles through Application_User_Roles. Test_Account is honored only when the API Environment is Development.",
    "admin.Application_Roles": "Roles (seeded: Administrator, User, MPOGGlobal).",
    "admin.Application_User_Roles": "User to role assignments (soft deleted with Delete_Ind).",
    "admin.Application_Clients": "Machine clients for API-to-API access. Secret_ID is stored encrypted.",
    "admin.Application_Client_Roles": "Client to role assignments.",
    "admin.Application_Configurations": "Named configuration values (for example EhrService credentials). Values are expected to be encrypted with the API's EncryptString.",
    "admin.Application_Functions": "Every UI element that can be permissioned: routes, menu categories and links, buttons.",
    "admin.Application_Role_Functions": "Which roles may use which functions.",
    "admin.Application_Routes": "Pages (route groups) such as Shared, Dashboard, Reports.",
    "admin.Application_Route_Functions": "Which functions appear on which route.",
    "admin.Application_Lists": "Lists used by the API editor and the EHR URL bases (Category, Section, List_Key, List_Value).",
    "admin.External_Activity": "Activity log of external (anonymous) use of the graph (written by log/external).",
    "admin.External_User": "External users recorded after a successful reCAPTCHA check.",
    "api.Endpoints": "Dynamic endpoint definitions: name, request type, stored procedure or REST URL, result type, credential source.",
    "api.EndpointParameters": "Parameters of each endpoint: name, type, destination (Parameter, Body, URL), optional flag, templates.",
    "api.EndpointSecurity": "Roles that may call each endpoint.",
    "api.Error_Logs": "Errors written by the API and the client.",
    "api.Graph_Logs": "Inputs of each graph calculation (patient covariates, dose tables, reference time). Can contain case identifiers.",
    "api.User_Logs": "User activity log.",
    "api.UserLogin_Log": "Every login attempt, with source and (for EHR launches) patient ID, MRN and name. Treat as protected health information.",
    "core.List_Groups": "Named groups of list values used by the dashboard (drug picker, units, events, graph styles).",
    "core.List_Values": "Values of each list group.",
    "core.Medications": "Drugs TIVA can simulate: search terms, units, display range (Lower, Upper, Typical), default graph flag.",
    "core.Medication_Models": "PK models per drug: static parameters, covariate flags, the model.PK_* procedure that computes the rest, default model flag.",
}

ROUTINE_NOTES = {
    "core.GetMedicationModels": "Runs every model's stored procedure for the given weight, age, height and sex and returns one row of PK parameters per model.",
    "core.GetMedications": "Active, non-deleted medications for the drug list, ordered by Med_Order.",
    "core.GetLists": "List groups and values (core.List_Groups, core.List_Values) for the dashboard, ordered by List_Order.",
    "core.GetCaseFromMPOG": "Optional. Reads a case from an MPOG linked server. Created only if the linked server exists.",
    "api.GetEndpoints": "Loads endpoints, parameters and role security for the API's endpoint cache.",
    "api.AddEndpoint": "Adds a row to api.Endpoints.",
    "api.UpdateEndpoint": "Updates a row in api.Endpoints.",
    "api.AddParameter": "Adds a row to api.EndpointParameters.",
    "api.UpdateParameter": "Updates a row in api.EndpointParameters.",
    "api.AddSecurityRole": "Adds a role to an endpoint in api.EndpointSecurity.",
    "api.UpdateSecurityRole": "Updates a row in api.EndpointSecurity.",
    "api.Log_Login": "Writes a login attempt (user, source, success, and any EHR case or patient identifiers) to api.UserLogin_Log.",
    "api.LogGraph": "Writes the inputs of a graph calculation to api.Graph_Logs unless an identical row already exists.",
    "api.SaveUserLog": "Writes a user activity entry to api.User_Logs.",
    "api.SaveClientLog": "Writes a client activity entry to api.User_Logs.",
    "api.SaveErrorLog": "Writes an error entry to api.Error_Logs.",
    "admin.AddUser": "Creates a user and assigns roles (@Role_ID_List). Also used to create the first administrator.",
    "admin.EditUser": "Edits a user's name, active flag and roles.",
    "admin.DeleteUser": "Soft deletes a user (Delete_Ind = 'Y').",
    "admin.DeleteUserRoles": "Soft deletes all role assignments of a user.",
    "admin.AddUpdateUserRoles": "Adds or updates a user's role assignments.",
    "admin.CheckUserExists": "Checks whether a user exists.",
    "admin.GetUserDetails": "A user's name, test-account flag and one row per role. Used at login. Raises an error if the user does not exist.",
    "admin.GetUserRoles": "All non-deleted roles, ordered by name.",
    "admin.GetUsersByRole": "Users with a given role (all users if the role name is empty), with their roles joined by |.",
    "admin.GetUsersLoginCount": "Paged login counts for the internal login report (excludes MPOG logins).",
    "admin.GetUserPermissions": "Functions and routes a user may use (roles plus Default_Allow functions), for the client's route guard and UI.",
    "admin.GetUserRoleApplicationFunctions": "Functions assigned to a role.",
    "admin.GetAllApplicationFunctions": "All application functions.",
    "admin.AddApplicationFunction": "Adds a row to Application_Functions.",
    "admin.UpdateApplicationRoleFunctionPairs": "Adds and removes (soft deletes) function assignments of a role from two comma-separated ID lists, and logs the change.",
    "admin.GetApplicationConfigurations": "Rows of Application_Configurations for one configuration name.",
    "admin.GetApplicationLists": "Application_Lists rows, optionally filtered by category, section and key.",
    "admin.GetClientDetails": "A machine client's details and one row per role. Raises an error if the client does not exist.",
    "admin.AddClient": "Adds a machine client definition.",
    "admin.UpdateClient": "Updates a client's name, ID, notes and deleted flag.",
    "admin.SaveRefreshToken": "Stores a refresh token and its expiry on a user or client row.",
    "admin.Log_External_Activity": "Writes external graph activity to admin.External_Activity.",
    "admin.Log_External_User": "Writes an external user (after reCAPTCHA) to admin.External_User.",
    "model.calcAdjustedBodyWeight": "Adjusted body weight: IBW + 0.4 x (weight - IBW), IBW from height and sex.",
    "model.pkLbmJames": "James lean body mass.",
    "model.pkLbmJanmahasatian": "Janmahasatian lean body mass.",
}


def render_database(tables, fks, routines, seed):
    by_schema = {}
    for key, t in tables.items():
        by_schema.setdefault(t["schema"], []).append(t)
    schemas = ["admin", "api", "core", "model"]
    proc_endpoints = {}
    for e in seed.get("api.Endpoints", []):
        sp = (e.get("Stored_Procedure") or "").lower()
        if sp and sp != "hardcoded":
            proc_endpoints.setdefault(sp, []).append(e["Endpoint_Name"])

    n_proc = sum(1 for r in routines if r["kind"] == "Procedure")
    n_fn = sum(1 for r in routines if r["kind"] == "Function")
    pk_notes = {}
    for mm in seed.get("core.Medication_Models", []):
        sp = (mm.get("Stored_Procedure") or "").lower()
        if sp:
            pk_notes.setdefault(sp, []).append(mm["Model_Name"])
    pk_notes = {k: "PK parameters for: " + "; ".join(v) + "." for k, v in pk_notes.items()}
    out = []
    out.append(page_head("TIVA — Database Reference",
                         "SQL Server schema parsed from api/TIVA_API/examples/CreateDB.sql: tables, columns, keys, functions and stored procedures.",
                         "Database Reference"))
    out.append('<main>')
    out.append('<div class="callout"><p>Generated by <code>docs/tools/generate.py</code> from <code>CreateDB.sql</code> and <code>SeedData.sql</code>. Do not edit this file by hand; change the SQL and regenerate. '
               'This is the schema as scripted in the repository, not a live export of a running database.</p></div>')
    out.append('<h2 id="overview">Overview</h2>')
    out.append(f'<p>{len(tables)} tables, {n_fn} functions and {n_proc} stored procedures in four schemas. Requires SQL Server 2017 or later (<code>STRING_AGG</code>, <code>STRING_SPLIT</code>) and database compatibility level 130 or higher.</p>')
    out.append('<table><tr><th>Schema</th><th>Holds</th><th>Tables</th></tr>')
    schema_desc = {
        "admin": "Users, roles, clients, UI functions and routes, configuration, lists, external-use logs",
        "api": "Dynamic endpoint definitions, parameters, endpoint security, and logs (errors, graph inputs, user activity, logins)",
        "core": "Medications, PK models, dashboard lists",
        "model": "Per-drug PK parameter procedures and body-weight helper functions",
    }
    for s in schemas:
        out.append(f'<tr><td><a href="#schema-{s}"><code>{s}</code></a></td><td>{esc(schema_desc[s])}</td><td>{len(by_schema.get(s, []))}</td></tr>')
    out.append('</table>')
    out.append('<div class="callout warn"><p><code>api.UserLogin_Log</code> stores the patient ID, MRN and name sent by the EHR at launch (<code>api.Log_Login</code>), and <code>api.Graph_Logs</code> stores case identifiers. Treat the database as holding protected health information, or change those procedures to not store the values.</p></div>')

    out.append('<h2 id="setup">Setting up</h2>')
    out.append('<pre><code>CREATE DATABASE TIVA;\nsqlcmd -S &lt;server&gt; -d TIVA -E -i CreateDB.sql      -- schema, functions, procedures (no data)\nsqlcmd -S &lt;server&gt; -d TIVA -E -i SeedData.sql -f 65001   -- roles, endpoints, medications, models, lists\n-- then create the first administrator with admin.AddUser (see the end of ExportSeedData.sql output)\n-- and grant the API\'s database user EXECUTE on schemas admin, api, core and model</code></pre>')
    out.append('<p>Messages that a module &ldquo;depends on the missing object <code>api.SaveUserLog</code>&rdquo; are expected while <code>CreateDB.sql</code> runs. Config values with secrets in <code>admin.Application_Configurations</code> are exported as NULL and must be set per installation.</p>')

    out.append('<h2 id="relationships">Relationships</h2>')
    out.append('<p>Declared foreign keys:</p><table><tr><th>Table</th><th>Column</th><th>References</th><th>Constraint</th></tr>')
    for fk in fks:
        out.append(f'<tr><td><code>{esc(fk["table"])}</code></td><td><code>{esc(fk["col"])}</code></td><td><code>{esc(fk["ref"])}.{esc(fk["ref_col"])}</code></td><td class="small">{esc(fk["name"])}</td></tr>')
    out.append('</table>')
    out.append('<p>Relationships that exist by column name but have no foreign key constraint in the script:</p>')
    implied = [
        ("admin.Application_Client_Roles", "Client_ID", "admin.Application_Clients.ID"),
        ("admin.Application_Client_Roles", "Role_ID", "admin.Application_Roles.Role_ID"),
        ("admin.Application_Role_Functions", "Role_ID", "admin.Application_Roles.Role_ID"),
        ("admin.Application_Role_Functions", "Function_ID", "admin.Application_Functions.Function_ID"),
        ("admin.Application_Route_Functions", "View_ID", "admin.Application_Routes.View_ID"),
        ("admin.Application_Route_Functions", "Function_ID", "admin.Application_Functions.Function_ID"),
        ("admin.Application_Functions", "Parent_ID", "admin.Application_Functions.Function_ID"),
        ("api.EndpointSecurity", "Role_ID", "admin.Application_Roles.Role_ID"),
        ("core.List_Values", "List_Group_ID", "core.List_Groups.List_Group_ID"),
        ("core.Medication_Models", "Medication_ID", "core.Medications.Med_ID"),
    ]
    out.append('<table><tr><th>Table</th><th>Column</th><th>Refers to</th></tr>')
    for t, c, r in implied:
        out.append(f'<tr><td><code>{t}</code></td><td><code>{c}</code></td><td><code>{r}</code></td></tr>')
    out.append('</table>')

    for s in schemas:
        out.append(f'<h2 id="schema-{s}">Schema <code>{s}</code> &mdash; tables</h2>')
        for t in sorted(by_schema.get(s, []), key=lambda x: x["name"].lower()):
            key = f'{t["schema"]}.{t["name"]}'
            out.append(f'<h3 id="t-{key}"><code>{esc(key)}</code></h3>')
            if key in TABLE_NOTES:
                out.append(f'<p>{esc(TABLE_NOTES[key])}</p>')
            out.append('<div class="table-wrap"><table><tr><th>Column</th><th>Type</th><th>Null</th><th>Notes</th></tr>')
            for c in t["cols"]:
                notes = []
                if c["name"] in t["pk"]:
                    notes.append("PK")
                if c["identity"]:
                    notes.append("identity")
                for fk in fks:
                    if fk["table"] == key and fk["col"] == c["name"]:
                        notes.append(f'FK &rarr; {esc(fk["ref"])}.{esc(fk["ref_col"])}')
                out.append(f'<tr><td><code>{esc(c["name"])}</code></td><td>{esc(c["type"])}</td><td>{"yes" if c["null"] else "no"}</td><td>{", ".join(notes)}</td></tr>')
            out.append('</table></div>')

    out.append('<h2 id="routines">Functions and stored procedures</h2>')
    out.append('<p>&ldquo;Endpoints&rdquo; lists the dynamic API endpoints (from <code>SeedData.sql</code>) that call the procedure.</p>')
    for s in schemas:
        rs = sorted([r for r in routines if r["schema"] == s], key=lambda r: r["name"].lower())
        if not rs:
            continue
        out.append(f'<h3 id="r-{s}">Schema <code>{s}</code></h3>')
        out.append('<div class="table-wrap"><table><tr><th>Name</th><th>Kind</th><th>Parameters</th><th>Description</th><th>Endpoints</th></tr>')
        for r in rs:
            key = f'{r["schema"]}.{r["name"]}'
            params = "<br>".join(f'<code>{esc(p["name"])}</code> {esc(p["type"])}' + (f' = {esc(p["default"])}' if p["default"] else "") for p in r["params"]) or "&mdash;"
            if r["returns"]:
                params += f'<br><span class="muted small">returns {esc(r["returns"])}</span>'
            desc = ROUTINE_NOTES.get(key) or pk_notes.get(key.lower(), "")
            if r["optional"] and key not in ROUTINE_NOTES:
                desc = (desc + " " if desc else "") + "Optional: created only if the MPOG linked server exists."
            eps = proc_endpoints.get(key.lower(), [])
            ep_html = "<br>".join(f'<code>{esc(e)}</code>' for e in eps) or "&mdash;"
            out.append(f'<tr><td><code>{esc(key)}</code></td><td>{r["kind"]}</td><td>{params}</td><td>{esc(desc) if desc else "&mdash;"}</td><td>{ep_html}</td></tr>')
        out.append('</table></div>')

    out.append(page_foot())
    return "\n".join(out)


# --------------------------------------------------------------------------- HTML helpers

def page_head(title, subtitle, h1):
    return (f'<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            f'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>{esc(title)}</title>\n'
            f'<link rel="stylesheet" href="assets/docs.css">\n<script src="assets/nav.js" defer></script>\n</head>\n<body>\n<header>\n'
            f'  <div class="crumb"><a href="index.html">&larr; Docs index</a></div>\n'
            f'  <h1>TIVA — {esc(h1)}</h1>\n  <p>{esc(subtitle)}</p>\n</header>\n')


def page_foot():
    return '<footer>tiva-open-source workspace docs</footer>\n</main>\n</body>\n</html>\n'


def method_pill(m):
    m = (m or "").upper()
    cls = {"GET": "get", "POST": "post"}.get(m, "")
    return f'<span class="pill {cls}">{esc(m or "?")}</span>'


# --------------------------------------------------------------------------- api.html sections

def render_endpoints(seed, routines):
    known_procs = {f'{r["schema"]}.{r["name"]}'.lower() for r in routines}
    roles = {r["Role_ID"]: r["Role_Name"] for r in seed.get("admin.Application_Roles", [])}
    params = {}
    for p in sorted(seed.get("api.EndpointParameters", []), key=lambda p: (p["Endpoint_ID"], p.get("Parameter_Order") or 0)):
        params.setdefault(p["Endpoint_ID"], []).append(p)
    sec = {}
    for s in seed.get("api.EndpointSecurity", []):
        if s.get("Has_Access"):
            sec.setdefault(s["Endpoint_ID"], []).append(roles.get(s["Role_ID"], str(s["Role_ID"])))
    bases = {l["List_Key"]: l["List_Value"] for l in seed.get("admin.Application_Lists", []) if l.get("Section") == "URLBases"}

    groups = {}
    for e in seed.get("api.Endpoints", []):
        groups.setdefault(e["Endpoint_Name"].split("/")[0], []).append(e)

    out = []
    total = len(seed.get("api.Endpoints", []))
    out.append(f'<p>{total} endpoints in <code>SeedData.sql</code>, grouped by schema (first path segment). Call them as <code>/Api/{{schema}}/{{endpoint}}</code>. '
               'Implementation: <span class="pill sp">SP</span> runs a stored procedure, <span class="pill rest">REST</span> calls an external API, <span class="pill">Controller</span> marks rows whose procedure is <code>hardcoded</code>: the action is implemented in C# and the row exists so roles can be granted to it. '
               'Rows with request type <code>hardcoded</code> have no HTTP method defined by the row. '
               'Parameters: <code>?</code> optional, <code>*</code> system-provided, <code>[body]</code> / <code>[url]</code> destination (default: query string or procedure parameter).</p>')
    for g in sorted(groups):
        out.append(f'<h4>{esc(g)}</h4><div class="table-wrap"><table><tr><th>Endpoint</th><th>Method</th><th>Implementation</th><th>Access</th><th>Parameters</th></tr>')
        for e in sorted(groups[g], key=lambda e: e["Endpoint_Name"].lower()):
            rt = e.get("Request_Type") or ""
            no_method = rt.lower() == "hardcoded"
            sp = e.get("Stored_Procedure") or ""
            if e.get("Call_Type") == "REST":
                url = (e.get("URL") or "")
                base = e.get("URL_Base") or ""
                impl = f'<span class="pill rest">REST</span> <code>{esc(base)}</code> + <code>{esc(url)}</code>'
                if url.startswith("REPLACE_WITH"):
                    impl += ' <span class="small muted">(set the URL for your EHR)</span>'
                cred = f'{e.get("Credential_Source") or ""}/{e.get("Credential_Key") or ""}'
                impl += f'<br><span class="small muted">credentials: {esc(cred)}</span>'
            elif sp.lower() == "hardcoded":
                impl = '<span class="pill">Controller</span>'
            else:
                impl = f'<span class="pill sp">SP</span> <code>{esc(sp)}</code> <span class="small muted">&rarr; {esc(e.get("Result_Type") or "")}</span>'
                if sp.lower() not in known_procs:
                    impl += '<br><span class="small" style="color:#8a4b00">procedure not found in CreateDB.sql</span>'
            access = "anonymous" if e.get("Allow_Anonymous") else ", ".join(sec.get(e["Endpoint_ID"], [])) or "<span class=\"muted\">no roles</span>"
            if e.get("UseParam0UserPass"):
                impl += '<br><span class="small muted">caller name passed as @User</span>'
            plist = []
            for p in params.get(e["Endpoint_ID"], []):
                label = f'<code>{esc(p["Parameter_Name"])}</code>'
                if p.get("Is_Optional"):
                    label += "?"
                if p.get("System_Provided"):
                    label += "*"
                dest = (p.get("Parameter_Destination") or "").lower()
                if dest in ("body", "url"):
                    label += f'<span class="muted small">[{dest}]</span>'
                plist.append(label)
            out.append(f'<tr><td><code>{esc(e["Endpoint_Name"])}</code></td><td>{method_pill(rt) if not no_method else "&mdash;"}</td><td>{impl}</td>'
                       f'<td>{access}</td><td>{", ".join(plist) or "&mdash;"}</td></tr>')
        out.append('</table></div>')
    if bases:
        out.append('<p class="small muted">URL bases (<code>admin.Application_Lists</code>, section <code>URLBases</code>): ' +
                   ", ".join(f'<code>{esc(k)}</code> = <code>{esc(v)}</code>' for k, v in bases.items()) + ' (placeholder values in the seed data).</p>')
    return "\n".join(out)


def render_client_calls(seed):
    known = {e["Endpoint_Name"].lower(): e for e in seed.get("api.Endpoints", [])}
    rows = []
    for path in sorted((CLIENT / "api").glob("*.tsx")):
        text = path.read_text(encoding="utf-8")
        for m in re.finditer(r"export async function (\w+)\(([^)]*)\)\s*(?::[^{]+)?\{(.*?)(?=\nexport async function |\Z)", text, re.S):
            fn, body = m.group(1), m.group(3)
            pm = re.search(r"fetch_api_wrapper\(\s*['\"`](GET|POST)['\"`]\s*,\s*['\"`]([^'\"`]+)['\"`]", body)
            if not pm:
                pm = re.search(r"axios_post_api_wrapper\(\s*['\"`]([^'\"`]+)['\"`]", body)
                if not pm:
                    continue
                method, target = "POST", pm.group(1)
            else:
                method, target = pm.group(1), pm.group(2)
            rows.append((path.name, fn, method, target))
    out = ['<div class="table-wrap"><table><tr><th>Client file</th><th>Function</th><th>Method</th><th>Path called</th><th>Endpoint definition</th></tr>']
    for f, fn, method, target in rows:
        norm = re.sub(r"\$\{[^}]*\}", "", target).split("?")[0].strip("/")
        if norm.lower().startswith("api/"):
            name = norm[4:]
            name = "/".join(name.split("/")[:2])
            status = ("seeded" if name.lower() in known else '<span class="muted">not in SeedData.sql</span>')
            link = f'<code>{esc(name)}</code> &mdash; {status}'
        else:
            link = "controller route"
        out.append(f'<tr><td><code>{esc(f)}</code></td><td><code>{esc(fn)}</code></td><td>{method_pill(method)}</td><td><code>{esc(target)}</code></td><td>{link}</td></tr>')
    out.append('</table></div>')
    return "\n".join(out)


# --------------------------------------------------------------------------- pk-models.html sections

def render_pk_tables(seed, routines):
    meds = {m["Med_ID"]: m for m in seed.get("core.Medications", [])}
    out = ['<h3>Medications</h3><div class="table-wrap"><table><tr><th>Drug</th><th>Dose units offered</th><th>Graphed by default</th><th>Target band (Lower&ndash;Upper)</th></tr>']
    for m in sorted(meds.values(), key=lambda m: m.get("Med_Order") or 0):
        lo, up = m.get("Lower"), m.get("Upper")
        band = f'{lo:g}&ndash;{up:g}' if isinstance(lo, (int, float)) and isinstance(up, (int, float)) else "&mdash;"
        out.append(f'<tr><td>{esc(m["Medication_Name"])}</td><td>{esc((m.get("Units") or "").replace(",", ", "))}</td>'
                   f'<td>{"yes" if m.get("Load_Graph_Default") else "no"}</td><td>{band}</td></tr>')
    out.append('</table></div>')
    out.append('<h3>Models</h3><div class="table-wrap"><table><tr><th>Model</th><th>Drug</th><th>Procedure</th><th>Conc. unit</th><th>Default</th><th>Covariate switches</th></tr>')
    for mm in sorted(seed.get("core.Medication_Models", []), key=lambda x: (meds.get(x["Medication_ID"], {}).get("Med_Order", 0), x["Model_ID"])):
        sw = [n for n, c in (("adjusted body weight", "useABWCorrection"), ("lean body mass", "useLBMCorrection"), ("weight adjusted", "useWeightAdjusted")) if mm.get(c)]
        out.append(f'<tr><td>{esc(mm["Model_Name"])}</td><td>{esc(meds.get(mm["Medication_ID"], {}).get("Medication_Name", ""))}</td>'
                   f'<td><code>{esc(mm.get("Stored_Procedure") or "")}</code></td><td>{esc(mm.get("tci_unit") or "")}</td>'
                   f'<td>{"yes" if mm.get("Default") else ""}</td><td>{esc(", ".join(sw)) or "&mdash;"}</td></tr>')
    out.append('</table></div>')
    out.append('<p class="small muted">Model ID 2, 11 and 15 are not present: the seed export skips soft-deleted rows. The static parameter columns of <code>core.Medication_Models</code> (Vc, ke0, and for some models the rate constants) are inputs to the procedures; the procedures return the patient-specific values.</p>')
    procs = sorted(r["name"] for r in routines if r["schema"] == "model" and r["kind"] == "Procedure")
    out.append('<p>Procedures in schema <code>model</code>: ' + ", ".join(f'<code>{esc(p)}</code>' for p in procs) + '.</p>')
    return "\n".join(out)


# --------------------------------------------------------------------------- opensource-libraries.html

CLIENT_PURPOSE = {
    "next": "React framework (App Router, server actions, proxy)", "react": "UI library", "react-dom": "React DOM renderer",
    "plotly.js-dist-min": "Concentration graphs", "axios": "HTTP client for multipart server-side posts",
    "jose": "JWT verification against the API's JWKS", "js-cookie": "Reading cookies in browser code",
    "exceljs": "Excel export on the Reports page", "html2canvas": "PNG capture of the full-size graph",
    "react-datetime": "Date/time picker", "react-google-recaptcha": "reCAPTCHA widget",
    "react-select": "Searchable selects (user admin, API editor)", "styled-components": "Styled wrappers in admin screens",
    "tailwind-merge": "Merges Tailwind class names", "tailwindcss-animate": "Tailwind animation utilities",
    "class-variance-authority": "Component variants (shadcn style)", "clsx": "Conditional class names",
    "lucide-react": "Icons", "react-icons": "Icons", "yaml": "YAML parsing (build/tooling)",
    "tailwindcss": "Utility CSS framework", "typescript": "Type checking", "jest": "Test runner", "ts-jest": "TypeScript support for Jest",
    "eslint": "Linting", "eslint-config-next": "Next.js lint rules", "@eslint/eslintrc": "ESLint config compatibility",
}
API_PURPOSE = {
    "log4net": "Logging", "Microsoft.AspNetCore.Authentication.JwtBearer": "JWT bearer authentication",
    "Microsoft.EntityFrameworkCore": "EF Core (referenced)", "Microsoft.EntityFrameworkCore.SqlServer": "EF Core SQL Server provider (referenced)",
    "Microsoft.Extensions.Caching.SqlServer": "SQL Server distributed cache package (the app registers the in-memory cache)",
    "Microsoft.OpenApi": "OpenAPI model types for Swagger", "Newtonsoft.Json": "JSON for dynamic endpoint results and EHR responses",
    "Novell.Directory.Ldap.NETStandard": "LDAP bind and search", "RestSharp": "Outgoing REST calls (EHR/FHIR, token endpoint)",
    "Swashbuckle.AspNetCore": "Swagger UI (development only)", "System.DirectoryServices": "Directory services",
    "System.IdentityModel.Tokens.Jwt": "Creating and validating TIVA JWTs", "System.Security.Cryptography.Pkcs": "Certificate and key handling",
}


def render_libraries():
    pkg = json.loads((CLIENT / "package.json").read_text(encoding="utf-8"))
    cs = CSPROJ.read_text(encoding="utf-8")
    api = re.findall(r'<PackageReference Include="([^"]+)" Version="([^"]+)"', cs)
    tfm = re.search(r"<TargetFramework>([^<]+)</TargetFramework>", cs)

    def rows(deps, purposes):
        return "".join(f'<tr><td><code>{esc(n)}</code></td><td>{esc(v)}</td><td>{esc(purposes.get(n, ""))}</td></tr>' for n, v in sorted(deps.items()))

    out = [page_head("TIVA — Open-source Libraries",
                     "Open-source libraries used by the client and API, generated from client/package.json and TIVA_API.csproj.",
                     "Open-source Libraries"), "<main>"]
    out.append('<div class="callout"><p>Generated by <code>docs/tools/generate.py</code>. Versions are the ranges declared in the manifests; the exact resolved versions are in <code>client/package-lock.json</code>. '
               'Each package keeps its own license; check them before redistributing. TIVA itself is GPL-3.0-or-later.</p></div>')
    out.append(f'<h2 id="client">Client (<code>client/package.json</code>)</h2><p>Package <code>{esc(pkg["name"])}</code>, license {esc(pkg.get("license", ""))}.</p>')
    out.append('<h3>Runtime dependencies</h3><div class="table-wrap"><table><tr><th>Package</th><th>Version</th><th>Used for</th></tr>')
    radix = {k: v for k, v in pkg["dependencies"].items() if k.startswith("@radix-ui/")}
    rest = {k: v for k, v in pkg["dependencies"].items() if k not in radix}
    out.append(rows(rest, CLIENT_PURPOSE))
    out.append(rows(radix, {k: "Accessible UI primitive wrapped in components/ui" for k in radix}))
    out.append('</table></div>')
    out.append('<h3>Development dependencies</h3><div class="table-wrap"><table><tr><th>Package</th><th>Version</th><th>Used for</th></tr>')
    out.append(rows(pkg.get("devDependencies", {}), CLIENT_PURPOSE))
    out.append('</table></div>')
    if pkg.get("overrides"):
        out.append('<p class="small muted">Overrides pin patched transitive versions: ' + ", ".join(f'<code>{esc(k)}</code>' for k in pkg["overrides"]) + '.</p>')
    out.append(f'<h2 id="api">API (<code>TIVA_API.csproj</code>, {esc(tfm.group(1) if tfm else "")})</h2>')
    out.append('<div class="table-wrap"><table><tr><th>Package</th><th>Version</th><th>Used for</th></tr>')
    out.append(rows(dict(api), API_PURPOSE))
    out.append('</table></div>')
    out.append('<h2 id="platform">Platform components (not packages)</h2><ul>'
               '<li>.NET SDK per <code>api/global.json</code>; ASP.NET Core Hosting Bundle on the server</li>'
               '<li>Node.js and npm for the client build and runtime</li>'
               '<li>SQL Server 2017 or later</li>'
               '<li>IIS with URL Rewrite and iisnode for the documented Windows deployment</li>'
               '<li>Google reCAPTCHA (hosted service) for the disclaimer gate</li></ul>')
    out.append(page_foot())
    return "\n".join(out)


# --------------------------------------------------------------------------- file writing

class Writer:
    def __init__(self, check):
        self.check = check
        self.stale = []

    def write(self, path, content):
        old = path.read_text(encoding="utf-8") if path.exists() else None
        if old != content:
            self.stale.append(path.name)
            if not self.check:
                path.write_text(content, encoding="utf-8", newline="\n")

    def replace_section(self, path, name, html_text):
        text = path.read_text(encoding="utf-8")
        pat = re.compile(rf"(<!-- BEGIN GENERATED:{re.escape(name)}[^>]*-->)(.*?)(<!-- END GENERATED:{re.escape(name)} -->)", re.S)
        if not pat.search(text):
            raise SystemExit(f"Marker GENERATED:{name} not found in {path}")
        new = pat.sub(lambda m: f"{m.group(1)}\n{html_text}\n{m.group(3)}", text, count=1)
        self.write(path, new)


def main():
    check = "--check" in sys.argv
    w = Writer(check)
    seed = parse_seed()
    tables, fks, routines = parse_create_db()
    w.write(DOCS / "database.html", render_database(tables, fks, routines, seed))
    w.write(DOCS / "opensource-libraries.html", render_libraries())
    w.replace_section(DOCS / "api.html", "endpoints", render_endpoints(seed, routines))
    w.replace_section(DOCS / "api.html", "client-calls", render_client_calls(seed))
    w.replace_section(DOCS / "pk-models.html", "seed-models", render_pk_tables(seed, routines))
    print(f"{len(tables)} tables, {len(fks)} foreign keys, {len(routines)} routines, "
          f"{len(seed.get('api.Endpoints', []))} endpoints, {len(seed.get('core.Medication_Models', []))} models")
    if check:
        if w.stale:
            print("Out of date: " + ", ".join(w.stale))
            sys.exit(1)
        print("Generated docs are up to date")
    else:
        print("Updated: " + (", ".join(w.stale) if w.stale else "nothing (already current)"))


if __name__ == "__main__":
    main()
