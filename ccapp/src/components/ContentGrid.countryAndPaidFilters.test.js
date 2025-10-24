import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ContentGrid from './ContentGrid'

function makeItem(overrides) {
  return {
    Timestamp: '2025/10/21',
    'What is your name?': overrides.creator || 'Tester',
    'What country are located in?': overrides.country || 'US',
    'What is the name of your channel?': overrides.channel || 'Chan',
    'What is the link to your channel(s)? (If you have multiple channels, add them all using commas to separate them.)': overrides.link || '',
    // Use non-YouTube platform to avoid async subscriber prefetch noise in these tests
    'What platform is your channel on?': overrides.platform || 'Website',
    'How can a dev contact you?': overrides.contact || 'Email',
    'Do you charge for content?': overrides.paid || 'No',
    'What are your top 10 favorite games?': overrides.games || '',
    'How long do you need with a prototype to produce certain content?': overrides.proto || '',
    'What type of content do you prefer to cover?': overrides.type || ''
  }
}

describe('ContentGrid country canonicalization and paid content radios', () => {
  test('deduplicates country synonyms into one checkbox and filters correctly', () => {
    const items = [
      makeItem({ channel: 'A', country: 'USA' }),
      makeItem({ channel: 'B', country: 'United States' }),
      makeItem({ channel: 'C', country: 'Canada' })
    ]

    render(<ContentGrid items={items} />)

    // Only one United States checkbox should be present
    const usCheckboxes = screen.getAllByRole('checkbox', { name: 'United States' })
    expect(usCheckboxes.length).toBe(1)

    // Selecting United States should leave 2 cards visible
    fireEvent.click(usCheckboxes[0])
  // Only A and B should remain; C should not be in the grid
  expect(screen.getByRole('heading', { level: 3, name: 'A' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'B' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { level: 3, name: 'C' })).not.toBeInTheDocument()
  })

  test('content type radios filter paid/free correctly', () => {
    const items = [
      makeItem({ channel: 'FreeChan', paid: 'No' }),
      makeItem({ channel: 'PaidChan', paid: 'Yes' })
    ]

    render(<ContentGrid items={items} />)

  // Turn on Designer View to reveal Content Type radios
  const designerSwitch = screen.getByRole('switch', { name: 'Designer view' })
  fireEvent.click(designerSwitch)

  // Initially both are shown
  expect(screen.getByRole('heading', { level: 3, name: 'FreeChan' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 3, name: 'PaidChan' })).toBeInTheDocument()

    // Choose Free Content Only
    const freeRadio = screen.getByRole('radio', { name: 'Free Content Only' })
    fireEvent.click(freeRadio)
  expect(screen.getByRole('heading', { level: 3, name: 'FreeChan' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { level: 3, name: 'PaidChan' })).not.toBeInTheDocument()

    // Choose Paid Content Available
    const paidRadio = screen.getByRole('radio', { name: 'Paid Content Available' })
    fireEvent.click(paidRadio)
  expect(screen.getByRole('heading', { level: 3, name: 'PaidChan' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { level: 3, name: 'FreeChan' })).not.toBeInTheDocument()
  })
})
