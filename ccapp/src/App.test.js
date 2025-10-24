import { render, screen } from '@testing-library/react'
import App from './App'

test('renders app header', () => {
  render(<App />)
  const heading = screen.getByRole('heading', { name: /content creator database/i })
  expect(heading).toBeInTheDocument()
})
