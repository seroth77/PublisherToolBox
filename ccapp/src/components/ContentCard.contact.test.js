import React from 'react'
import { render, screen } from '@testing-library/react'
import ContentCard from './ContentCard'

function makeData(overrides = {}) {
  return {
    Timestamp: '2025/10/21',
    'What is your name?': overrides.creator || 'Tester',
    'What country are located in?': overrides.country || 'US',
    'What is the name of your channel?': overrides.channel || 'Chan',
    'What is the link to your channel(s)? (If you have multiple channels, add them all using commas to separate them.)': overrides.link || '',
    'What platform is your channel on?': overrides.platform || 'Website',
    'How can a dev contact you?': overrides.contact || 'test@example.com',
    'Do you charge for content?': overrides.paid || 'No',
    'What are your top 10 favorite games?': overrides.games || '',
    'How long do you need with a prototype to produce certain content?': overrides.proto || '',
    'What type of content do you prefer to cover?': overrides.type || ''
  }
}

test('renders single email as mailto link', () => {
  const data = makeData({ contact: 'test@example.com' })
  render(<ContentCard data={data} />)
  const link = screen.getByRole('link', { name: 'Email test@example.com' })
  expect(link).toHaveAttribute('href', 'mailto:test@example.com')
})

test('renders multiple emails inside contact text as links', () => {
  const data = makeData({ contact: 'Email me at foo@bar.com or bar@baz.co.uk' })
  render(<ContentCard data={data} />)
  expect(screen.getByRole('link', { name: 'Email foo@bar.com' })).toHaveAttribute('href', 'mailto:foo@bar.com')
  expect(screen.getByRole('link', { name: 'Email bar@baz.co.uk' })).toHaveAttribute('href', 'mailto:bar@baz.co.uk')
})
