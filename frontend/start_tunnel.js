const localtunnel = require('localtunnel');

(async () => {
  try {
    const tunnel = await localtunnel({ port: 8000 });
    console.log('PUBLIC_WEBHOOK_URL=' + tunnel.url + '/api/v1/whatsapp/webhook');
    console.log('TUNNEL_ACTIVE_READY');
    
    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });

    // Keep process alive indefinitely
    setInterval(() => {}, 10000);
  } catch (err) {
    console.error('Failed to start tunnel:', err);
  }
})();
