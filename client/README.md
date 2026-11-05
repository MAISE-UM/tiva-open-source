TIVA client, a [Next.js](https://nextjs.org) app. It lives in the `client/` folder of the TIVA repository and talks to the TIVA API in the `api/` folder (see [api/README.md](../api/README.md)). See the [root README](../README.md) for an overview and the **clinical use disclaimer**: TIVA is not a cleared medical device and is not validated for clinical decision-making.

## Getting Started

Copy `.env.example` to `.env` and set the values, then run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Run the tests with `npm test`.

## Configuration

All settings are `NEXT_PUBLIC_*` environment variables, listed in `.env.example`. They are baked in when the app is built, so rebuild after changing them. The API is configured separately, in the IIS `web.config` (see [api/README.md](../api/README.md), "Which config file do I edit?").

EHR settings (display name, data labels) come from the API at runtime (`GET /REST/ehr/client-config`, configured in the API `Ehr` section). See the setup guide, [docs/ehr-setup.html](../docs/ehr-setup.html).

## Deploy on a Windows server (IIS)

The client runs at the IIS site root through iisnode, and the API runs as the `/REST` application of the same site.

1. Set the environment variables (or `.env`) for the target server, then build:
   ```bash
   npm ci
   npm run build
   ```
2. Copy `.next`, `public`, `package.json`, `package-lock.json`, `next.config.ts` and `server.js` to the site folder
3. In the site folder run `npm ci --omit=dev`
4. Use the site web.config from `api/deploy/web.config.example` (it holds secrets: `web.config` is gitignored, keep it out of source control). It sends `/REST` requests to the API and everything else to `server.js`

`server.js` is the iisnode entry point. iisnode passes a named pipe in `PORT`, which the server listens on.

## License

Copyright (C) 2023-2026 The Regents of the University of Michigan.

TIVA is free software, licensed under the [GNU General Public License](../LICENSE), version 3 or (at your option) any later version (GPL-3.0-or-later). It comes with no warranty. See the clinical use disclaimer in the [root README](../README.md).
