const { getChannelInfo } = require('../lib/youtube');

jest.mock('node-fetch');
const fetch = require('node-fetch');

describe('getChannelInfo', () => {
  beforeEach(() => {
    fetch.mockReset();
    delete process.env.YT_API_KEY;
    delete process.env.YOUTUBE_API_KEY;
  });

  test('throws when API key missing', async () => {
    await expect(getChannelInfo('UC_x5XG1OV2P6uZZ5FSM9Ttw')).rejects.toThrow(/API key/);
  });

  test('returns data on happy path', async () => {
    process.env.YT_API_KEY = 'fake-key';

    const fakeResponse = {
      items: [
        {
          snippet: {
            title: 'Test Channel',
            thumbnails: { default: { url: 'http://example.com/img.jpg' } }
          }
        }
      ]
    };

    fetch.mockResolvedValue({ ok: true, json: async () => fakeResponse });

    const res = await getChannelInfo('UC_testchannel');
    expect(res.title).toBe('Test Channel');
    expect(res.logo).toBe('http://example.com/img.jpg');
    expect(res.raw).toBeTruthy();
  });

  test('throws 404 when channel not found', async () => {
    process.env.YT_API_KEY = 'fake-key';
    const fakeResponse = { items: [] };
    fetch.mockResolvedValue({ ok: true, json: async () => fakeResponse });

    await expect(getChannelInfo('UC_missing')).rejects.toThrow(/Channel not found/);
  });
});
