import React from "react";
import ChatModal from "../../src/components/modals/ChatModal";
import { mount } from "cypress/react";
import { mockConnection, mockMessages } from "../mockData/chatModalMockData";

describe("ChatModal Component", () => {
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
    const onClose = cy.stub();
    mount(<ChatModal {...baseProps} onClose={onClose} />);
    cy.contains(mockConnection.itineraries[1].userInfo.username).should(
      "exist"
    );
    cy.contains(mockConnection.itineraries[1].destination).should("exist");
    cy.get('input[placeholder="Type a message"]').should("exist");
    cy.contains(mockMessages[0].text).should("exist");
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
