# TIVA

TIVA is a web application for simulating the plasma and effect-site concentrations of intravenous anesthetic drugs (propofol, opioids, benzodiazepines, neuromuscular blockers) from a case's dosing history, using published pharmacokinetic (PK) models.

This repository holds the whole application in two folders:

| Folder | What it is | Details |
|---|---|---|
| [`client/`](client/) | Next.js web client | [client/README.md](client/README.md) |
| [`api/`](api/) | ASP.NET Core REST API (SQL Server) | [api/README.md](api/README.md) |

The API also has optional SMART on FHIR (EHR) and LDAP sign-in. See the setup guide, [docs/ehr-setup.html](docs/ehr-setup.html).

A browsable documentation site (client and API reference, database schema, architecture, EHR launch flow, PK models) is in [docs/](docs/index.html). It is static HTML: open `docs/index.html`. Regenerate the schema, endpoint and library pages with `python docs/tools/generate.py`.

## Clinical use disclaimer

**TIVA is research and educational software. It is not a cleared or approved medical device, and it has not been validated for clinical decision-making or patient care.**

* Do not use TIVA output to select, dose or titrate any drug for a patient.
* The simulations are model predictions for a typical patient. Real concentrations vary between patients and can differ greatly from the model.
* Results depend on the accuracy of the data entered or imported, such as doses, times, age, weight, height and sex. Check them.
* Anyone who uses or deploys TIVA is responsible for validating it for their purpose and for complying with the regulations that apply to them.
* The software is provided "as is", without warranty of any kind.

The same statement is shown in the application (disclaimer dialog and page footer).

## PK models

The PK and PD parameters live in the database, not in the source, so each installation chooses its models. These are the published parameter sets used in development. Cite the original publication for any model you use.

| Drug | Model | Source |
|---|---|---|
| Propofol | Schnider (standard, or with adjusted body weight for obese patients) | Schnider TW, Minto CF, Gambus PL, et al. The influence of method of administration and covariates on the pharmacokinetics of propofol in adult volunteers. *Anesthesiology* 1998;88:1170-1182. Adjusted body weight: Cortínez LI, et al. Performance of propofol target-controlled infusion models in the obese: pharmacokinetic and pharmacodynamic analysis. *Anesth Analg* 2014. |
| Remifentanil | Minto (James lean body mass, or Janmahasatian) | Minto CF, Schnider TW, Egan TD, et al. Influence of age and gender on the pharmacokinetics and pharmacodynamics of remifentanil. I. Model development. *Anesthesiology* 1997;86:10-23. Janmahasatian lean body mass: *Clin Pharmacokinet* 2005;44:1051-1065, and *Clin Pharmacokinet* 2010;49:131-139. |
| Fentanyl | Shafer PK/PD | Shafer fentanyl PK/PD model. The effect-site rate constant corresponds to a time to peak effect of 3.7 min. |
| Alfentanil | Scott/Stanski | Scott JC, Stanski DR. Decreased fentanyl and alfentanil dose requirements with age. A simultaneous pharmacokinetic and pharmacodynamic evaluation. *J Pharmacol Exp Ther* 1987;240:159-166. |
| Sufentanil | Gepts (PK), Shafer/Varvel (ke0 from a time to peak effect of 5.6 min) | Gepts E, Shafer SL, Camu F, et al. Linearity of pharmacokinetics and model estimation of sufentanil. *Anesthesiology* 1995;83:1194-1204. Time to peak effect: Shafer SL, Varvel JR. Pharmacokinetics, pharmacodynamics, and rational opioid selection. *Anesthesiology* 1991;74:53-63. |
| Morphine | Ravn | Ravn et al. *Basic Clin Pharmacol Toxicol* 2014;115:257-267. |
| Midazolam | Albrecht PK/PD (parameters differ for patients up to 66 years and over 66) | Albrecht midazolam PK/PD model. |
| Succinylcholine | Roy | Roy et al. *Anesthesiology* 2002;97:1082-1092. |
| Rocuronium | Cooper (PK), Plaud (PD) | Cooper et al. *Br J Anaesth* 1993;71:222-226. Plaud et al. *Clin Pharmacol Ther* 1995;58:185-191. |
| Dexmedetomidine | Dyck | Dyck et al. *Anesthesiology* 1993;78:821-828. The original model has no effect-site rate constant, so ke0 comes from a later study. |

## How the simulation works

TIVA simulates the drug in a three-compartment model with an effect-site compartment (and, for succinylcholine, an absorption compartment). For each drug it takes a PK model (central volume and the rate constants k10, k12, k21, k13, k31 and ke0, per minute), the patient's weight, height, age and sex, and the dosing history, as boluses and continuous infusions.

* The amount of drug in each compartment is stepped forward in 1-second Euler steps (`client/model/PKSimIterate.tsx`). The effect site is a very small compartment, 1/10,000 of the central volume, fed from the central compartment.
* Plasma (Cp) and effect-site (Ce) concentrations are computed from the compartment amounts and shown over time, in the units suited to each drug.
* The method follows Shafer and Gregg, *J Pharmacokinet Biopharm* 1992;20(2), and an Octave reference implementation provided by Utah.

### Agreement with the reference implementation

The client's calculations were compared with the Octave reference implementation on 101 anesthesia cases (347 drug-specific comparisons: propofol, remifentanil, sufentanil, fentanyl, rocuronium, succinylcholine, morphine and midazolam; bolus and continuous infusion; adults and children). The percent deviation between the two was at most 0.103% (remifentanil), with a median of 0.009%.

This shows that the web app reproduces the reference calculations. It is not a clinical validation, and it does not show that the models are accurate for any patient. The comparison data came from real cases and is not included in this repository.

## Getting started

You need Node.js, the .NET SDK (see [api/global.json](api/global.json)) and a SQL Server database.

1. Set up the API: copy `api/deploy/appsettings.example.json` to `api/TIVA_API/appsettings.json`, fill it in, and run `dotnet run --project api/TIVA_API`. See [api/README.md](api/README.md).
2. Set up the client: in `client/`, copy `.env.example` to `.env`, fill it in, then `npm install` and `npm run dev`. See [client/README.md](client/README.md).
3. Run the client tests with `npm test` in `client/`.

To deploy on a Windows server with IIS, follow "How To Deploy To Windows" in [api/README.md](api/README.md).

## Security notes

* **Never run a server with `Environment` set to `Development`.** In that mode test accounts sign in without a password. See [api/README.md](api/README.md), "Security: never deploy with Environment set to Development".
* Config files with secrets (`appsettings.json`, `web.config`, `.env`, `keys/`) are gitignored. Keep them out of source control.
* Report vulnerabilities as described in [SECURITY.md](SECURITY.md).

## MPOG case search

The client has a "search by MPOG case ID" dialog that calls a `GetCaseFromMPOG` endpoint. That endpoint is not part of the API source: it is defined in the database (`api.Endpoints`) and needs access to Multicenter Perioperative Outcomes Group (MPOG) data, so it only works for MPOG members. Its stored procedure, `core.GetCaseFromMPOG`, is in `api/TIVA_API/examples/CreateDB.sql`; the script creates it only if your MPOG linked server exists (the name is set at the top of that part of the script). The dashboard button for it is disabled by default. Other sites load cases from an EHR or enter doses by hand.

## License

Copyright (C) 2023-2026 The Regents of the University of Michigan.

TIVA is free software: you can redistribute it and/or modify it under the terms of the [GNU General Public License](LICENSE) as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version (GPL-3.0-or-later).

It is distributed in the hope that it will be useful, but **without any warranty**, without even the implied warranty of merchantability or fitness for a particular purpose. See the [clinical use disclaimer](#clinical-use-disclaimer) above.
