const http = require('http');

// Test SSE streaming with token in query parameter
async function testSSEStreaming() {
  try {
    // First, get a token
    console.log('🔐 Getting superadmin token...');
    const loginRes = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify({ username: 'lucky', password: '#ebuka5788' }));
      req.end();
    });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }

    const token = loginRes.data.token;
    console.log(`✅ Got token: ${token.substring(0, 50)}...`);
    console.log(`   Role: ${loginRes.data.user.role}`);

    // Now connect to SSE stream
    console.log('\n🔌 Connecting to SSE stream...');
    const streamUrl = `/api/admin/logs/stream?type=app&token=${token}`;
    
    const streamRes = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: streamUrl,
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream'
        }
      };

      const req = http.request(options, (res) => {
        console.log(`✅ SSE Response Status: ${res.statusCode}`);
        console.log(`   Content-Type: ${res.headers['content-type']}`);
        console.log(`   Connection: ${res.headers['connection']}`);
        
        if (res.statusCode !== 200) {
          let errData = '';
          res.on('data', chunk => errData += chunk);
          res.on('end', () => reject(new Error(`SSE failed: ${res.statusCode} - ${errData}`)));
          return;
        }

        resolve(res);
      });

      req.on('error', reject);
      req.end();
    });

    // Listen for events
    console.log('\n📡 Listening for SSE events (10 seconds)...');
    let eventCount = 0;
    let buffer = '';

    streamRes.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          eventCount++;
          try {
            const data = JSON.parse(line.substring(6));
            console.log(`  [Event ${eventCount}] ${data.level} - ${data.message?.substring(0, 60)}`);
          } catch (e) {
            console.log(`  [Event ${eventCount}] ${line.substring(6, 80)}`);
          }
        } else if (line.startsWith(':')) {
          console.log('  [Keep-Alive] Connection active');
        }
      }
    });

    streamRes.on('end', () => {
      console.log(`\n✅ Stream closed. Received ${eventCount} events.`);
    });

    streamRes.on('error', (err) => {
      console.error(`❌ Stream error: ${err.message}`);
    });

    // Close after 10 seconds
    setTimeout(() => {
      streamRes.destroy();
      process.exit(0);
    }, 10000);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

testSSEStreaming();
