import React, { JSX } from "react";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../../components/common/ErrorBoundary";


function ProblemChild(): JSX.Element | null {
  throw new Error("Error thrown from problem child");
  return null;
}

test("ErrorBoundary catches errors and displays fallback UI", () => {
  render(
    <ErrorBoundary>
      <ProblemChild />
    </ErrorBoundary>
  );
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});