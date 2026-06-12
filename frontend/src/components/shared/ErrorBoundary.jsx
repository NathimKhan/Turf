import { Component } from "react";
import { Button } from "../ui/button.jsx";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="max-w-md rounded-2xl border border-surface-border bg-white p-8 text-center shadow-soft">
            <p className="muted-label text-primary">TURFX</p>
            <h1 className="mt-3 text-3xl font-black">Something needs attention</h1>
            <p className="mt-3 text-ink-muted">
              The screen could not render. Refresh the app or return to the landing experience.
            </p>
            <Button className="mt-6" onClick={() => window.location.assign("/")}>
              Go home
            </Button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
