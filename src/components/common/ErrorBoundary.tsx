import React from "react";

/**
 * A reusable error boundary component for catching React errors.
 * @component
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // You can log the error to an error reporting service here
    console.error("ErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: "center" }}>
          <h2>Something went wrong.</h2>
          <p>Please refresh the page or contact support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}