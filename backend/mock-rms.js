const http = require('http');

const PORT = 3001;
const FAIL_RATE = parseFloat(process.env.FAIL_RATE || '0');
const DELAY_MS = parseInt(process.env.DELAY_MS || '0');

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    const eventId = req.headers['x-webhook-event-id'] || 'unknown';
    const timestamp = new Date().toISOString();

    const shouldFail = Math.random() < FAIL_RATE;

    const respond = () => {
      if (shouldFail) {
        console.log(`[${timestamp}] ❌ REJECTED event: ${eventId}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Simulated RMS failure' }));
      } else {
        console.log(`[${timestamp}] ✅ ACCEPTED event: ${eventId}`);
        try {
          const payload = JSON.parse(body);
          console.log(
            `   Resident: ${payload.residentId} | Property: ${payload.propertyId}`,
          );
          console.log(
            `   Risk: ${payload.data?.riskScore} (${payload.data?.riskTier})`,
          );
        } catch {}
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true, eventId }));
      }
    };

    if (DELAY_MS > 0) {
      setTimeout(respond, DELAY_MS);
    } else {
      respond();
    }
  });
});

server.listen(PORT, () => {
  console.log(`🎯 Mock RMS server listening on port ${PORT}`);
  console.log(`   FAIL_RATE: ${FAIL_RATE * 100}%`);
  console.log(`   DELAY_MS: ${DELAY_MS}ms`);
});
