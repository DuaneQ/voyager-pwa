import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AlertPopup from "../../components/utilities/Alerts";

describe("AlertPopup", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render the alert with the correct message and severity", () => {
    render(
      <AlertPopup
        open={true}
        severity="error"
        message="This is an error message"
        onClose={mockOnClose}
      />
    );

    // Assert that the alert message is displayed
    expect(screen.getByText("This is an error message")).toBeInTheDocument();

    // Assert that the alert has the correct severity
    const alertElement = screen.getByRole("alert");
    expect(alertElement).toHaveClass("MuiAlert-standardError");
  });

  test("should call onClose when the alert is closed", () => {
    render(
      <AlertPopup
        open={true}
        severity="success"
        message="This is a success message"
        onClose={mockOnClose}
      />
    );

    // Simulate closing the alert
    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    // Assert that the onClose function is called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("should automatically close after the autoHideDuration", () => {
    jest.useFakeTimers();

    render(
      <AlertPopup
        open={true}
        severity="info"
        message="This is an info message"
        onClose={mockOnClose}
      />
    );

    // Fast-forward the timer to simulate auto-hide
    jest.advanceTimersByTime(6000);

    // Assert that the onClose function is called
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  test("should not render the alert when open is false", () => {
    render(
      <AlertPopup
        open={false}
        severity="warning"
        message="This is a warning message"
        onClose={mockOnClose}
      />
    );

    // Assert that the alert is not in the document
    expect(screen.queryByText("This is a warning message")).not.toBeInTheDocument();
  });
});