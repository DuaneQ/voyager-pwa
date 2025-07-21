import React from "react";
import { render, screen } from "@testing-library/react";
import ItineraryCard from "../../components/forms/ItineraryCard";
import { Itinerary } from "../../types/Itinerary";

describe("ItineraryCard", () => {
  const mockItinerary: Itinerary = {
    id: "1",
    destination: "Paris",
    startDate: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 10 years from today
    endDate: new Date(Date.now() + 3660 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 10 years + 10 days from today
    description: "A wonderful trip to Europe.",
    activities: ["Visit Eiffel Tower", "Explore Louvre Museum"],
    userInfo: {
      username: "JohnDoe",
      gender: "Male",
      dob: "1990-01-01",
      uid: "12345",
      email: "email@user.com",
    },
  };

  const noop = () => {};

  test("renders the itinerary destination", () => {
    render(
      <ItineraryCard itinerary={mockItinerary} onLike={noop} onDislike={noop} />
    );
    expect(screen.getByText(/paris/i)).toBeInTheDocument();
  });

  test("renders the username", () => {
    render(
      <ItineraryCard itinerary={mockItinerary} onLike={noop} onDislike={noop} />
    );
    expect(screen.getByText(/johndoe/i)).toBeInTheDocument();
  });

  test("renders the description", () => {
    render(
      <ItineraryCard itinerary={mockItinerary} onLike={noop} onDislike={noop} />
    );
    expect(
      screen.getByText(/A wonderful trip to Europe./i)
    ).toBeInTheDocument();
  });

  test("renders the activities if provided", () => {
    render(
      <ItineraryCard itinerary={mockItinerary} onLike={noop} onDislike={noop} />
    );
    expect(screen.getByText(/activities:/i)).toBeInTheDocument();
    expect(screen.getByText(/visit eiffel tower/i)).toBeInTheDocument();
    expect(screen.getByText(/explore louvre museum/i)).toBeInTheDocument();
  });

  test("does not render activities section if activities are not provided", () => {
    const itineraryWithoutActivities = { ...mockItinerary, activities: [] };
    render(
      <ItineraryCard
        itinerary={itineraryWithoutActivities}
        onLike={noop}
        onDislike={noop}
      />
    );
    expect(screen.queryByText(/activities:/i)).not.toBeInTheDocument();
  });
});
