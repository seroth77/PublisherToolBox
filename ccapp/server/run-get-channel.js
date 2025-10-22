const { getChannelInfo } = require('./lib/youtube');

async function main() {
  const channelId = process.argv[2] || 'UC_x5XG1OV2P6uZZ5FSM9Ttw';
  try {
    console.log('Fetching channel info for', channelId);
    const info = await getChannelInfo(channelId);
    console.log('Result:');
    console.log('Title:', info.title);
    console.log('Logo:', info.logo);
    // Print small raw summary
    console.log('Raw items:', Array.isArray(info.raw.items) ? info.raw.items.length : 0);
  } catch (err) {
    console.error('Error:', err.message || err);
    if (err.status) console.error('Status:', err.status);
    process.exitCode = 2;
  }
}

main();
