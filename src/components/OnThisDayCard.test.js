import React from 'react';
import { render, screen } from '@testing-library/react';
import OnThisDayCard from './OnThisDayCard';
import { getTodaysEvents } from '../services/OnThisDayService';

jest.mock('../services/OnThisDayService');

describe('OnThisDayCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders today's events with the on-this-day label", () => {
    getTodaysEvents.mockReturnValue({
      exact: true,
      date: new Date(2026, 8, 29),
      events: [
        { year: 1996, event: 'Nintendo 64 launched in North America.' },
        { year: 2017, event: 'Cuphead launched.' },
      ],
    });

    render(<OnThisDayCard />);
    expect(screen.getByText('On this day in gaming')).toBeInTheDocument();
    expect(screen.getByText('1996')).toBeInTheDocument();
    expect(screen.getByText(/Nintendo 64 launched/)).toBeInTheDocument();
    expect(screen.getByText(/Cuphead launched/)).toBeInTheDocument();
  });

  it('labels non-exact fallbacks as this week in gaming', () => {
    getTodaysEvents.mockReturnValue({
      exact: false,
      date: new Date(2026, 11, 23),
      events: [{ year: 1997, event: 'Gran Turismo launched in Japan.' }],
    });

    render(<OnThisDayCard />);
    expect(screen.getByText('This week in gaming')).toBeInTheDocument();
    const expectedDate = new Date(2026, 11, 23).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
    });
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it('renders nothing when the service has no events', () => {
    getTodaysEvents.mockReturnValue(null);
    const { container } = render(<OnThisDayCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
