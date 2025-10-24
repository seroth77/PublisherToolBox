import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ContentGrid from './ContentGrid'

jest.mock('../utils/channel', () => ({
  extractChannelIdFromUrl: (url) => {
    if (!url) return null
    const u = String(url)
    const m = u.match(/\/channel\/([A-Za-z0-9_-]+)/)
    if (m) return m[1]
    return null
  },
  fetchChannelLogo: async (id) => {
    if (id === 'UC_1') return { subscriberCount: 1000, hiddenSubscriberCount: false }
    if (id === 'UC_2') return { subscriberCount: 100, hiddenSubscriberCount: false }
    return { subscriberCount: null, hiddenSubscriberCount: false }
  },
  resolveHandleOrQuery: async () => ({ subscriberCount: 500, hiddenSubscriberCount: false })
}))

function makeItem({ name, link, platform }) {
  return {
    Timestamp: '2025/10/21',
    'What is your name?': 'Tester',
    'What country are located in?': 'US',
    'What is the name of your channel?': name,
    'What is the link to your channel(s)? (If you have multiple channels, add them all using commas to separate them.)': link,
    'What platform is your channel on?': platform,
    'How can a dev contact you?': 'Email',
    'Do you charge for content?': 'No',
    'What are your top 10 favorite games?': '',
    'How long do you need with a prototype to produce certain content?': '',
    'What type of content do you prefer to cover?': ''
  }
}

describe('ContentGrid sorting and filters', () => {
  test('deduplicates platforms to canonical YouTube label', async () => {
    const items = [
      makeItem({ name: 'A', link: 'https://youtube.com/channel/UC_1', platform: 'YouTube; yt, you tube' }),
    ]
    render(<ContentGrid items={items} />)

  // Platforms list appears in FilterControls; ensure only one YouTube checkbox is present
  const youtubeCheckboxes = await screen.findAllByRole('checkbox', { name: 'YouTube' })
  expect(youtubeCheckboxes.length).toBe(1)
  })

  test('sorts by subscribers (high to low)', async () => {
    const items = [
      makeItem({ name: 'SmallChannel', link: 'https://youtube.com/channel/UC_2', platform: 'YouTube' }),
      makeItem({ name: 'BigChannel', link: 'https://youtube.com/channel/UC_1', platform: 'YouTube' })
    ]

  render(<ContentGrid items={items} />)

    // Change sort to Subscribers (High to Low)
  const sortSelect = await screen.findByRole('combobox', { name: /sort by/i })
    fireEvent.change(sortSelect, { target: { value: 'subscribersDesc' } })

    // Wait for prefetch and re-sort to occur
    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { level: 3, name: /^(BigChannel|SmallChannel)$/ })
      const titles = headings.map(h => h.textContent)
      expect(titles).toEqual(['BigChannel', 'SmallChannel'])
    })
  })
})
