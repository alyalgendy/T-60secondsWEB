import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface SceneErrorBoundaryProps {
  children: ReactNode;
  /** Render a recoverable fallback instead of letting the whole app go blank. */
  fallback: (error: Error, reset: () => void) => ReactNode;
}

interface SceneErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time crashes in a scene so a single bad value cannot blank the
 * entire game. Keying this boundary by flow step resets it on navigation.
 */
export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  override state: SceneErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): SceneErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Scene crashed:', error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (error) return this.props.fallback(error, this.reset);
    return this.props.children;
  }
}
