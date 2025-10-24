import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ContentGrid from './ContentGrid'

jest.mock('../utils/channel', () => ({
  extractChannelIdFromUrl: (url) => {
    if (!url) return null
    const m = String(url).match(/\/channel\/(UC_[A-Z]+)/)
    return m ? m[1] : null
  },
  fetchChannelLogo: async (id) => {
    if (id === 'UC_HIGH') return { subscriberCount: 2000, hiddenSubscriberCount: false }
    if (id === 'UC_LOW') return { subscriberCount: 50, hiddenSubscriberCount: false }
    if (id === 'UC_HIDDEN') return { subscriberCount: 12345, hiddenSubscriberCount: true }
    return { subscriberCount: null, hiddenSubscriberCount: false }
  },
  resolveHandleOrQuery: async () => ({ subscriberCount: null, hiddenSubscriberCount: false })
}))

function item(name, id) {
  return {
    Timestamp: '2025/10/21',
    'What is your name?': 'Tester',
    'What country are located in?': 'US',
    'What is the name of your channel?': name,
    'What is the link to your channel(s)? (If you have multiple channels, add them all using commas to separate them.)': `https://youtube.com/channel/${id}`,
    'What platform is your channel on?': 'YouTube',
    'How can a dev contact you?': 'Email',
    'Do you charge for content?': 'No',
    'What are your top 10 favorite games?': '',
    'How long do you need with a prototype to produce certain content?': '',
    'What type of content do you prefer to cover?': ''
  }
}

describe('ContentGrid subscriber sorting with hidden counts', () => {
  test('hidden subscriber counts sort after visible counts', async () => {
    const items = [
      item('HiddenChan', 'UC_HIDDEN'),
      item('LowChan', 'UC_LOW'),
      item('HighChan', 'UC_HIGH'),
    ]

    render(<ContentGrid items={items} />)

    const sortSelect = await screen.findByRole('combobox')
    fireEvent.change(sortSelect, { target: { value: 'subscribersDesc' } })

    await waitFor(() => {
      const titles = screen.getAllByRole('heading', { level: 3, name: /Chan$/ }).map(h => h.textContent)
      expect(titles).toEqual(['HighChan', 'LowChan', 'HiddenChan'])
    })
  })
})
