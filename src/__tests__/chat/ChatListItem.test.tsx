
import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { ChatListItem } from "../../components/Chat/ChatListItem";
import { Connection } from "../types/Connection";
import * as removeHook from "../../hooks/useRemoveConnection";

const mockConn: Connection = {
  id: "conn1",
  users: ["user1", "user2"],
  itineraryIds: ["it1", "it2"],
  itineraries: [
    {
      id: "it1",
      userInfo: { uid: "user1", username: "User One", photoURL: "" },
      destination: "Paris",
      startDate: "2025-07-01",
      endDate: "2025-07-10",
      description: "Trip to Paris",
      activities: ["Eiffel Tower"],
    },
    {
      id: "it2",
      userInfo: { uid: "user2", username: "User Two", photoURL: "" },
      destination: "London",
      startDate: "2025-08-01",
      endDate: "2025-08-10",
      description: "Trip to London",
      activities: ["Big Ben"],
    },
  ],
  createdAt: { seconds: 0, nanoseconds: 0 } as any,
  unreadCounts: { user1: 1, user2: 0 },
};

describe("ChatListItem", () => {
  it("renders connection info and calls onClick", () => {
    const onClick = jest.fn();
    const { getByText } = render(
      <ChatListItem conn={mockConn} userId="user1" onClick={onClick} unread={true} />
    );
    expect(getByText("User Two")).toBeInTheDocument();
    fireEvent.click(getByText("User Two"));
    expect(onClick).toHaveBeenCalled();
  });

  it("calls removeConnection when unconnect button is clicked", () => {
    const onClick = jest.fn();
    const removeConnectionMock = jest.fn().mockResolvedValue({ success: true });
    jest.spyOn(removeHook, "useRemoveConnection").mockReturnValue(removeConnectionMock);
    window.confirm = jest.fn(() => true);
    const { getByLabelText } = render(
      <ChatListItem conn={mockConn} userId="user1" onClick={onClick} unread={true} />
    );
    fireEvent.click(getByLabelText("unconnect"));
    expect(removeConnectionMock).toHaveBeenCalledWith("conn1");
  });
});
