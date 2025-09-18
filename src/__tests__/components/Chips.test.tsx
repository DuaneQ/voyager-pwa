import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Chips } from '../../components/Chips/Chips';

describe('Chips component', () => {
  test('renders three chips with expected labels', () => {
    render(<Chips />);
    expect(screen.getByText('Basic Chip')).toBeInTheDocument();
    expect(screen.getByText('Clickable Chip')).toBeInTheDocument();
    expect(screen.getByText('Deletable Chip')).toBeInTheDocument();
  });

  test('clicking clickable chip triggers click handler (console.log)', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    render(<Chips />);
    fireEvent.click(screen.getByText('Clickable Chip'));
    expect(spy).toHaveBeenCalledWith('Clicked!');
    spy.mockRestore();
  });
  test('deletable chip is present', () => {
    render(<Chips />);
    expect(screen.getByText('Deletable Chip')).toBeInTheDocument();
  });
});
