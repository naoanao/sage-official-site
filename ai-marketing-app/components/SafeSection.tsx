"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class SafeSection extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error?.message ?? "unknown" };
  }

  componentDidCatch(error: Error) {
    console.error("SafeSection caught:", error.message);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      // Show a small debug indicator so we can identify which section crashed
      return (
        <div className="my-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-700 font-mono break-all">
            ⚠️ Section error: {this.state.errorMsg}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
