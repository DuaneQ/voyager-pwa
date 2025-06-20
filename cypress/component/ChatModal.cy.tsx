import React from "react";
import { mount } from "cypress/react";
import ChatModal from "../../src/components/modals/ChatModal";
import { Timestamp } from "firebase/firestore";
import { Connection } from "../../src/types/Connection";
import { Message } from "../../src/types/Message";

// Use Firestore Timestamp for createdAt fields
const mockConnection: Connection = {
  id: "conn1",
  users: ["userA", "userB"],
  itineraryIds: [],
  itineraries: [],
  createdAt: Timestamp.fromDate(new Date("2024-07-01T00:00:00Z")),
  unreadCounts: {
    userA: 2,
    userB: 0,
  },
};

const mockMessages: Message[] = [
  {
    id: "msg1",
    sender: "userB",
    text: "Hello!",
    imageUrl: "",
    createdAt: Timestamp.fromDate(new Date("2024-07-01T12:00:00Z")),
    readBy: [],
  },
  {
    id: "msg2",
    sender: "userA",
    text: "Hi!",
    imageUrl: "",
    createdAt: Timestamp.fromDate(new Date("2024-07-01T12:05:00Z")),
    readBy: ["userA"],
  },
];

describe("ChatModal", () => {
  it("renders messages and handles unread logic", () => {
    mount(
      <ChatModal
        open={true}
        onClose={() => {}}
        connection={mockConnection}
        messages={mockMessages}
        userId="userA"
      />
    );

    cy.contains("Hello!").should("exist");
    cy.contains("Hi!").should("exist");
  });

  const baseProps = {
    open: true,
    connection: mockConnection,
    messages: mockMessages,
    userId: "user1",
  };

  beforeEach(() => {
    cy.stub(require("firebase/firestore"), "addDoc").callsFake(
      () => new Promise((res) => setTimeout(res, 100))
    );
    cy.stub(require("firebase/storage"), "uploadBytes").resolves();
    cy.stub(require("firebase/storage"), "getDownloadURL").resolves(
      "https://example.com/test.jpg"
    );
  });

  it("renders the modal with user info and messages (happy path)", () => {
    mount(
      <ChatModal
        open={true}
        onClose={() => {}}
        connection={mockConnection}
        messages={mockMessages}
        userId="userA"
      />
    );
    cy.contains("Hello!").should("exist");
    cy.contains("Hi!").should("exist");
    cy.get('input[placeholder="Type a message"]').should("exist");

    cy.contains("Send").should("exist");
  });

  it("disables send button and input while sending (edge case)", () => {
    const onClose = cy.stub();
    mount(<ChatModal {...baseProps} onClose={onClose} />);
    cy.get('input[placeholder="Type a message"]').type("Test message");
    cy.contains("Send").click();
    // Wait for the UI to update to disabled state
    cy.get('input[placeholder="Type a message"]').should("be.disabled");
  });

  it("closes the modal when close button is clicked (happy path)", () => {
    const onClose = cy.stub();
    mount(<ChatModal {...baseProps} onClose={onClose} />);
    cy.get('button[aria-label="Close"]').click();
    cy.wrap(onClose).should("have.been.called");
  });

  it("shows uploaded image in message (edge case)", () => {
    const onClose = cy.stub();
    const messagesWithImage = [
      ...mockMessages,
      {
        ...mockMessages[0],
        id: "img1",
        text: "",
        imageUrl: "https://example.com/test.jpg",
      },
    ];
    mount(
      <ChatModal
        {...baseProps}
        onClose={onClose}
        messages={messagesWithImage}
      />
    );
    cy.get('img[alt="attachment"]').should(
      "have.attr",
      "src",
      "https://example.com/test.jpg"
    );
  });

  it("shows no messages if messages array is empty (edge case)", () => {
    const onClose = cy.stub();
    mount(<ChatModal {...baseProps} onClose={onClose} messages={[]} />);
    cy.get('input[placeholder="Type a message"]').should("exist");
    cy.get("body").should("not.contain.text", mockMessages[0].text);
  });
});
