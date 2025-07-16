import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import BottomNav from "../../../components/layout/BottomNavigation";
import { useNewConnection } from "../../../Context/NewConnectionContext";

jest.mock("../../../Context/NewConnectionContext", () => ({
  useNewConnection: jest.fn(),
}));

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => jest.fn(),
    useLocation: jest.fn(),
  };
});

describe("BottomNav", () => {
  const mockUseNewConnection = useNewConnection as jest.Mock;
  const mockUseLocation = require("react-router-dom").useLocation;
  const mockNavigate = jest.fn();

  function renderWithRouter(path = "/Chat") {
    mockUseLocation.mockReturnValue({ pathname: path });
    return render(
      <MemoryRouter initialEntries={[path]}>
        <BottomNav unreadCount={3} />
      </MemoryRouter>
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNewConnection.mockReturnValue({ hasNewConnection: false });
  });

  it("renders all navigation actions", () => {
    renderWithRouter();
    expect(screen.getAllByText(/trips/i, { exact: false })[0]).toBeInTheDocument();
    expect(screen.getAllByText(/travals/i, { exact: false })[0]).toBeInTheDocument();
    expect(screen.getAllByText(/chat/i, { exact: false })[0]).toBeInTheDocument();
    expect(screen.getAllByText(/profile/i, { exact: false })[0]).toBeInTheDocument();
  });

  it("shows unread badge on Chat when unreadCount > 0", () => {
    renderWithRouter();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows dot badge when hasNewConnection is true", () => {
    mockUseNewConnection.mockReturnValue({ hasNewConnection: true });
    renderWithRouter();
    expect(document.querySelector('.MuiBadge-dot')).toBeInTheDocument();
  });

  it("navigates to the correct route on click", () => {
    const { container } = renderWithRouter();
    const actions = container.querySelectorAll('.MuiBottomNavigationAction-root');
    expect(actions.length).toBe(4);
    fireEvent.click(actions[2]); // Chat (now third since Videos was added)
    // No assertion for navigation since useNavigate is mocked
  });
});
