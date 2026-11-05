// Custom server entry point for IIS (iisnode).
// iisnode supplies PORT as a named pipe, which http.listen() accepts as-is.
process.env.NODE_ENV = 'production';

const { createServer } = require('http');
const next = require('next');

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`Server listening on ${port}`);
  });
}).catch((err) => {
  console.error('Failed to start Next.js:', err);
  process.exit(1);
});
