import React from "react";
import { render, screen } from "@testing-library/react";
import { Protected } from "../../Context/Protected";
import { Context } from "../../Context/UserAuthContext";

// Fix: Simplify the mock to avoid referencing out-of-scope variables
jest.mock("react-router-dom", () => ({
  Navigate: (props) => (
    <div data-testid="navigate-mock">Redirecting to {props.to}</div>
  )
}));

describe("Protected component", () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects to Login when user is not authenticated", () => {
    // Render with no user (unauthenticated)
    render(
      <Context.Provider value={{ user: null }}>
        <Protected>
          <div data-testid="protected-content">Protected Content</div>
        </Protected>
      </Context.Provider>
    );

    // Check that Navigate component rendered with redirect text
    expect(screen.getByText("Redirecting to /Login")).toBeInTheDocument();
    
    // Verify protected content is NOT rendered
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("renders children when user is authenticated", () => {
    // Render with a user (authenticated)
    render(
      <Context.Provider value={{ user: { uid: "123", email: "test@example.com" } }}>
        <Protected>
          <div data-testid="protected-content">Protected Content</div>
        </Protected>
      </Context.Provider>
    );
    
    // Verify Navigate is NOT rendered (no redirect text)
    expect(screen.queryByText(/Redirecting to/)).not.toBeInTheDocument();
    
    // Verify protected content IS rendered
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});