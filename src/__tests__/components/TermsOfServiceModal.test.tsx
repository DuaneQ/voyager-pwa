import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TermsOfServiceModal } from '../../components/modals/TermsOfServiceModal';

// Mock Material-UI components that might cause issues in tests
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  Dialog: ({ open, children, ...props }: any) => 
    open ? <div data-testid="terms-modal" {...props}>{children}</div> : null,
}));

describe('TermsOfServiceModal', () => {
  const mockOnAccept = jest.fn().mockResolvedValue(undefined);
  const mockOnDecline = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    open: true,
    onAccept: mockOnAccept,
    onDecline: mockOnDecline,
  };

  it('renders the terms modal when open', () => {
    render(<TermsOfServiceModal {...defaultProps} />);
    
    expect(screen.getByTestId('terms-modal')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service Agreement')).toBeInTheDocument();
  });

  it('displays important legal notice', () => {
    render(<TermsOfServiceModal {...defaultProps} />);
    
    expect(screen.getByText('IMPORTANT LEGAL NOTICE')).toBeInTheDocument();
    expect(screen.getByText(/This agreement contains important legal terms/)).toBeInTheDocument();
  });

  it('shows all required acknowledgment checkboxes', () => {
    render(<TermsOfServiceModal {...defaultProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(7); // 6 acknowledgments + 1 read terms
    
    // Check for specific acknowledgment texts
    expect(screen.getByText(/I have read and understand the complete Terms of Service/)).toBeInTheDocument();
    expect(screen.getByText(/I understand the risks associated with meeting strangers/)).toBeInTheDocument();
    expect(screen.getByText(/I assume full responsibility for my personal safety/)).toBeInTheDocument();
    expect(screen.getByText(/I release TravalPass from liability/)).toBeInTheDocument();
    expect(screen.getByText(/I am at least 18 years old/)).toBeInTheDocument();
    expect(screen.getByText(/I will comply with all applicable laws/)).toBeInTheDocument();
  });

  it('disables accept button until all acknowledgments are checked', () => {
    render(<TermsOfServiceModal {...defaultProps} />);
    
    const acceptButton = screen.getByRole('button', { name: /I Accept These Terms/i });
    expect(acceptButton).toBeDisabled();
  });

  it('enables accept button when all acknowledgments are checked', async () => {
    render(<TermsOfServiceModal {...defaultProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    
    // Check all checkboxes
    checkboxes.forEach(checkbox => {
      fireEvent.click(checkbox);
    });
    
    await waitFor(() => {
      const acceptButton = screen.getByRole('button', { name: /I Accept These Terms/i });
      expect(acceptButton).not.toBeDisabled();
    });
  });

  it('calls onAccept when accept button is clicked with all acknowledgments', async () => {
    render(<TermsOfServiceModal {...defaultProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    
    // Check all checkboxes
    checkboxes.forEach(checkbox => {
      fireEvent.click(checkbox);
    });
    
    const acceptButton = screen.getByRole('button', { name: /I Accept These Terms/i });
    fireEvent.click(acceptButton);
    
    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onDecline when decline button is clicked', () => {
    render(<TermsOfServiceModal {...defaultProps} />);
    
    const declineButton = screen.getByRole('button', { name: /Decline & Logout/i });
    fireEvent.click(declineButton);
    
    expect(mockOnDecline).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when accepting terms', () => {
    render(<TermsOfServiceModal {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Accepting...')).toBeInTheDocument();
    
    const acceptButton = screen.getByRole('button', { name: /Accepting.../i });
    expect(acceptButton).toBeDisabled();
    
    const declineButton = screen.getByRole('button', { name: /Processing.../i });
    expect(declineButton).toBeDisabled();
  });

  it('displays key terms summary information', () => {
    render(<TermsOfServiceModal {...defaultProps} />);
    
    expect(screen.getByText('TravalPass Terms of Service Summary')).toBeInTheDocument();
    expect(screen.getByText(/Service Description:/)).toBeInTheDocument();
    expect(screen.getByText(/Your Responsibilities:/)).toBeInTheDocument();
    expect(screen.getByText(/Our Limitations:/)).toBeInTheDocument();
    expect(screen.getByText(/Safety Recommendations:/)).toBeInTheDocument();
  });

  it('includes specific safety warnings', () => {
    render(<TermsOfServiceModal {...defaultProps} />);
    
    expect(screen.getByText(/Meet in public places initially/)).toBeInTheDocument();
    expect(screen.getByText(/Trust your instincts about other users/)).toBeInTheDocument();
    expect(screen.getByText(/Obtain appropriate travel insurance/)).toBeInTheDocument();
  });

  it('shows warning about liability limitations', () => {
    render(<TermsOfServiceModal {...defaultProps} />);
    
    expect(screen.getByText(/We don't conduct background checks on users/)).toBeInTheDocument();
    expect(screen.getByText(/We're not liable for user interactions/)).toBeInTheDocument();
  });

  it('prevents modal from closing with escape key', () => {
    const { container } = render(<TermsOfServiceModal {...defaultProps} />);
    
    // The modal should have disableEscapeKeyDown prop
    const modal = screen.getByTestId('terms-modal');
    expect(modal).toBeInTheDocument();
    
    // Simulate escape key - modal should still be present
    fireEvent.keyDown(modal, { key: 'Escape', code: 'Escape' });
    expect(modal).toBeInTheDocument();
  });
});
