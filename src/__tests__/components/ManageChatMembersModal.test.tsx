import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ManageChatMembersModal from "../../components/modals/ManageChatMembersModal";

describe("ManageChatMembersModal", () => {
  it("renders with an empty users array and shows no members message", () => {
    render(
      <ManageChatMembersModal
        open={true}
        onClose={() => {}}
        users={[]}
        currentUserId={currentUserId}
        onRemove={onRemove}
        onAddClick={onAddClick}
        removeUserLoading={null}
      />
    );
    expect(screen.getByText("No members in this chat yet.")).toBeInTheDocument();
  });

  it("renders with all users added by someone else and shows no remove buttons", () => {
    const otherUsers = [
      { uid: "1", username: "Alice", avatarUrl: "", addedBy: "1" },
      { uid: "2", username: "Bob", avatarUrl: "", addedBy: "3" },
      { uid: "3", username: "Charlie", avatarUrl: "", addedBy: "2" },
    ];
    render(
      <ManageChatMembersModal
        open={true}
        onClose={() => {}}
        users={otherUsers}
        currentUserId={currentUserId}
        onRemove={onRemove}
        onAddClick={onAddClick}
        removeUserLoading={null}
      />
    );
    expect(screen.queryByLabelText("Remove Bob")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Remove Charlie")).not.toBeInTheDocument();
  });

  it("renders default avatar if avatarUrl is empty", () => {
    render(
      <ManageChatMembersModal
        open={true}
        onClose={() => {}}
        users={users}
        currentUserId={currentUserId}
        onRemove={onRemove}
        onAddClick={onAddClick}
        removeUserLoading={null}
      />
    );
    const avatars = screen.getAllByRole("img");
    avatars.forEach((avatar, idx) => {
      expect(avatar).toHaveAttribute("alt", users[idx].username);
    });
  });

  it("applies aria attributes and roles for accessibility", () => {
    render(
      <ManageChatMembersModal
        open={true}
        onClose={() => {}}
        users={users}
        currentUserId={currentUserId}
        onRemove={onRemove}
        onAddClick={onAddClick}
        removeUserLoading={null}
      />
    );
    expect(screen.getByRole("list")).toBeInTheDocument();
    // Check that each user row is present by aria-label (listitem)
    users.forEach((user) => {
      expect(screen.getByRole("listitem", { name: new RegExp(user.username) })).toBeInTheDocument();
    });
    // Only the user added by current user has a remove button
    expect(screen.getByLabelText("Remove Bob")).toHaveAttribute("title", expect.stringContaining("You added them"));
  });

  it("does not disable any remove button if removeUserLoading is not a matching uid", () => {
    render(
      <ManageChatMembersModal
        open={true}
        onClose={() => {}}
        users={users}
        currentUserId={currentUserId}
        onRemove={onRemove}
        onAddClick={onAddClick}
        removeUserLoading={"not-a-uid"}
      />
    );
    expect(screen.getByLabelText("Remove Bob")).not.toBeDisabled();
  });
  // Only users added by the current user should be removable
  const users = [
    { uid: "1", username: "Alice", avatarUrl: "", addedBy: "1" }, // current user
    { uid: "2", username: "Bob", avatarUrl: "", addedBy: "1" },   // added by Alice
    { uid: "3", username: "Charlie", avatarUrl: "", addedBy: "2" }, // added by Bob
  ];
  const currentUserId = "1";
  const onRemove = jest.fn(() => Promise.resolve());
  const onAddClick = jest.fn();

  it("renders all users and disables remove for self, and only shows remove for users added by current user", () => {
    render(
      <ManageChatMembersModal
        open={true}
        onClose={() => {}}
        users={users}
        currentUserId={currentUserId}
        onRemove={onRemove}
        onAddClick={onAddClick}
        removeUserLoading={null}
      />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    // Remove button for self should not be in the document
    expect(screen.queryByLabelText("Remove Alice")).not.toBeInTheDocument();
    // Remove button for Bob (added by Alice/current user) should be present
    expect(screen.getByLabelText("Remove Bob")).toBeInTheDocument();
    // Remove button for Charlie (added by Bob) should NOT be present
    expect(screen.queryByLabelText("Remove Charlie")).not.toBeInTheDocument();
  });

  it("calls onRemove when remove button is clicked", () => {
    render(
      <ManageChatMembersModal
        open={true}
        onClose={() => {}}
        users={users}
        currentUserId={currentUserId}
        onRemove={onRemove}
        onAddClick={onAddClick}
        removeUserLoading={null}
      />
    );
    fireEvent.click(screen.getByLabelText("Remove Bob"));
    expect(onRemove).toHaveBeenCalledWith("2");
  });

  it("calls onAddClick when add button is clicked", () => {
    render(
      <ManageChatMembersModal
        open={true}
        onClose={() => {}}
        users={users}
        currentUserId={currentUserId}
        onRemove={onRemove}
        onAddClick={onAddClick}
        removeUserLoading={null}
      />
    );
    fireEvent.click(screen.getByText(/Add Existing Connections/i));
    expect(onAddClick).toHaveBeenCalled();
  });

  it("shows loading spinner on remove button when removeUserLoading matches", () => {
    render(
      <ManageChatMembersModal
        open={true}
        onClose={() => {}}
        users={users}
        currentUserId={currentUserId}
        onRemove={onRemove}
        onAddClick={onAddClick}
        removeUserLoading={"2"}
      />
    );
    expect(screen.getByLabelText("Remove Bob")).toBeDisabled();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("calls onViewProfile when avatar is clicked or activated with keyboard", () => {
    const onViewProfile = jest.fn();
    render(
      <ManageChatMembersModal
        open={true}
        onClose={() => {}}
        users={users}
        currentUserId={currentUserId}
        onRemove={onRemove}
        onAddClick={onAddClick}
        removeUserLoading={null}
        onViewProfile={onViewProfile}
      />
    );
    // Find the profile button for Bob
    const profileBtn = screen.getByLabelText("View profile of Bob");
    fireEvent.click(profileBtn);
    expect(onViewProfile).toHaveBeenCalledWith("2");
    // Keyboard: Space
    onViewProfile.mockClear();
    fireEvent.keyDown(profileBtn, { key: " ", code: "Space" });
    expect(onViewProfile).toHaveBeenCalledWith("2");
    // Keyboard: Enter
    onViewProfile.mockClear();
    fireEvent.keyDown(profileBtn, { key: "Enter", code: "Enter" });
    expect(onViewProfile).toHaveBeenCalledWith("2");
    // Accessibility: has correct tabIndex and title
    expect(profileBtn).toHaveAttribute("tabIndex", "0");
    expect(profileBtn).toHaveAttribute("title", expect.stringContaining("View profile of Bob"));
  });
});
