import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import ItinerarySelector from "../../components/search/ItinerarySelector";
import { Itinerary } from "../../types/Itinerary";

describe("ItinerarySelector - Loading State", () => {
  const mockOnSelect = jest.fn();
  const mockOnOpenModal = jest.fn();
  const mockUserId = "test-user-123";

  const mockItineraries: Itinerary[] = [
    {
      id: "1",
      destination: "Paris",
      startDate: "2026-06-01",
      endDate: "2026-06-10",
      description: "Paris trip",
      activities: ["Sightseeing"],
      gender: "Female",
      status: "single",
      sexualOrientation: "heterosexual",
      startDay: new Date("2026-06-01").getTime(),
      endDay: new Date("2026-06-10").getTime(),
      lowerRange: 25,
      upperRange: 40,
      likes: [],
      userInfo: {
        uid: mockUserId,
        username: "Test User",
        dob: "1995-01-01",
        status: "single",
        gender: "Female",
        email: "test@example.com",
        sexualOrientation: "heterosexual",
      },
    },
    {
      id: "2",
      destination: "Tokyo",
      startDate: "2026-07-01",
      endDate: "2026-07-10",
      description: "Tokyo trip",
      activities: ["Shopping"],
      gender: "Male",
      status: "single",
      sexualOrientation: "heterosexual",
      startDay: new Date("2026-07-01").getTime(),
      endDay: new Date("2026-07-10").getTime(),
      lowerRange: 25,
      upperRange: 40,
      likes: [],
      userInfo: {
        uid: mockUserId,
        username: "Test User",
        dob: "1995-01-01",
        status: "single",
        gender: "Male",
        email: "test@example.com",
        sexualOrientation: "heterosexual",
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading Indicator", () => {
    test("should show CircularProgress when isLoading is true", async () => {
      render(
        <ItinerarySelector
          sortedItineraries={[]}
          selectedItineraryId=""
          onSelect={mockOnSelect}
          onOpenModal={mockOnOpenModal}
          isLoading={true}
        />
      );

      // Should show loading spinner
      await waitFor(() => {
        const progressElements = screen.getAllByRole("progressbar");
        expect(progressElements.length).toBeGreaterThan(0);
      });
    });

    test("should NOT show CircularProgress when isLoading is false", async () => {
      render(
        <ItinerarySelector
          sortedItineraries={mockItineraries}
          selectedItineraryId=""
          onSelect={mockOnSelect}
          onOpenModal={mockOnOpenModal}
          isLoading={false}
        />
      );

      // Should not show loading spinner
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    test("should disable select when isLoading is true", () => {
      render(
        <ItinerarySelector
          sortedItineraries={[]}
          selectedItineraryId=""
          onSelect={mockOnSelect}
          onOpenModal={mockOnOpenModal}
          isLoading={true}
        />
      );

      // Select should be disabled
      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("aria-disabled", "true");
    });

    test("should NOT disable select when isLoading is false", () => {
      render(
        <ItinerarySelector
          sortedItineraries={mockItineraries}
          selectedItineraryId=""
          onSelect={mockOnSelect}
          onOpenModal={mockOnOpenModal}
          isLoading={false}
        />
      );

      // Select should not be disabled
      const select = screen.getByRole("combobox");
      expect(select).not.toHaveAttribute("aria-disabled", "true");
    });

    test("should show 'Loading itineraries...' text when isLoading is true", () => {
      render(
        <ItinerarySelector
          sortedItineraries={[]}
          selectedItineraryId=""
          onSelect={mockOnSelect}
          onOpenModal={mockOnOpenModal}
          isLoading={true}
        />
      );

      // Should show loading text
      expect(screen.getByText("Loading itineraries...")).toBeInTheDocument();
    });

    test("should show 'Select an itinerary' text when isLoading is false", () => {
      render(
        <ItinerarySelector
          sortedItineraries={mockItineraries}
          selectedItineraryId=""
          onSelect={mockOnSelect}
          onOpenModal={mockOnOpenModal}
          isLoading={false}
        />
      );

      // Should show default placeholder text
      expect(screen.getByText("Select an itinerary")).toBeInTheDocument();
    });

    test("should NOT render itinerary options when isLoading is true", () => {
      render(
        <ItinerarySelector
          sortedItineraries={mockItineraries}
          selectedItineraryId=""
          onSelect={mockOnSelect}
          onOpenModal={mockOnOpenModal}
          isLoading={true}
        />
      );

      // Options should not be rendered when loading
      expect(screen.queryByText(/Paris/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Tokyo/)).not.toBeInTheDocument();
    });

    test("should default to isLoading=false when prop is not provided", () => {
      render(
        <ItinerarySelector
          sortedItineraries={mockItineraries}
          selectedItineraryId=""
          onSelect={mockOnSelect}
          onOpenModal={mockOnOpenModal}
          // isLoading prop not provided - should default to false
        />
      );

      // Should not show loading spinner
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      
      // Should show default placeholder
      expect(screen.getByText("Select an itinerary")).toBeInTheDocument();
      
      // Select should not be disabled
      const select = screen.getByRole("combobox");
      expect(select).not.toHaveAttribute("aria-disabled", "true");
    });

    test("should transition from loading to loaded state", async () => {
      const { rerender } = render(
        <ItinerarySelector
          sortedItineraries={[]}
          selectedItineraryId=""
          onSelect={mockOnSelect}
          onOpenModal={mockOnOpenModal}
          isLoading={true}
        />
      );

      // Initially loading
      expect(screen.getByText("Loading itineraries...")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      const select = screen.getByRole("combobox");
      expect(select).toHaveAttribute("aria-disabled", "true");

      // Rerender with loaded state
      rerender(
        <ItinerarySelector
          sortedItineraries={mockItineraries}
          selectedItineraryId=""
          onSelect={mockOnSelect}
          onOpenModal={mockOnOpenModal}
          isLoading={false}
        />
      );

      // Should now show normal state
      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        expect(screen.getByText("Select an itinerary")).toBeInTheDocument();
        expect(select).not.toHaveAttribute("aria-disabled", "true");
      });
    });

    test("should have proper accessibility attributes on loading spinner", () => {
      render(
        <ItinerarySelector
          sortedItineraries={[]}
          selectedItineraryId=""
          onSelect={mockOnSelect}
          onOpenModal={mockOnOpenModal}
          isLoading={true}
        />
      );

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toBeInTheDocument();
      // MUI CircularProgress has proper ARIA attributes
      expect(progressBar).toHaveAttribute("role", "progressbar");
    });

    test("should show loading state even when sortedItineraries array is not empty", () => {
      render(
        <ItinerarySelector
          sortedItineraries={mockItineraries}
          selectedItineraryId=""
          onSelect={mockOnSelect}
          onOpenModal={mockOnOpenModal}
          isLoading={true}
        />
      );

      // Should still show loading state
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      expect(screen.getByText("Loading itineraries...")).toBeInTheDocument();
      
      // Should not render the itinerary options
      expect(screen.queryByText(/Paris/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Tokyo/)).not.toBeInTheDocument();
    });

    test("should have CircularProgress with correct size", () => {
      render(
        <ItinerarySelector
          sortedItineraries={[]}
          selectedItineraryId=""
          onSelect={mockOnSelect}
          onOpenModal={mockOnOpenModal}
          isLoading={true}
        />
      );

      const progressBar = screen.getByRole("progressbar");
      // The CircularProgress is rendered with size={16}
      expect(progressBar).toBeInTheDocument();
    });
  });
});
