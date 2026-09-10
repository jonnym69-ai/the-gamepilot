import React from 'react';

/**
 * Compact, in-page error boundary for individual route elements.
 *
 * Unlike the top-level ErrorBoundary (which takes over the full screen),
 * this renders a contained error card inside the page content area so the
 * navigation bar and route switching remain usable — the user can navigate
 * to another page without reloading the app.
 *
 * Usage:
 *   <Route path="/library" element={
 *     <RouteErrorBoundary>
 *       <Library ... />
 *     </RouteErrorBoundary>
 *   } />
 */
class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RouteErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDevelopment = process.env.NODE_ENV === 'development';

    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '32px 20px',
          color: 'var(--text, #ffffff)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            backgroundColor: 'var(--surface-elevated, #2a2a2a)',
            padding: '32px',
            borderRadius: '12px',
            border: '1px solid var(--border, #333333)',
          }}
        >
          <h2
            style={{
              fontSize: '1.4rem',
              marginBottom: '12px',
              color: 'var(--accent, #4fc3f7)',
              fontWeight: 600,
            }}
          >
            This page hit a snag
          </h2>

          <p
            style={{
              fontSize: '0.95rem',
              marginBottom: '24px',
              lineHeight: 1.6,
              color: 'var(--text-secondary, #b0b0b0)',
            }}
          >
            Something went wrong loading this section. Your library and settings are safe — try again or navigate to
            another page.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={this.handleRetry}
              style={{
                backgroundColor: 'var(--accent, #4fc3f7)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: 'var(--surface, #3a3a3a)',
                color: 'var(--text, #ffffff)',
                border: '1px solid var(--border, #555555)',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Reload App
            </button>
          </div>

          {isDevelopment && this.state.error && (
            <details
              style={{
                textAlign: 'left',
                marginTop: '20px',
                backgroundColor: 'var(--surface, #1a1a1a)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border, #333333)',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'var(--accent, #4fc3f7)',
                  fontSize: '0.85rem',
                }}
              >
                Error details (dev)
              </summary>
              <pre
                style={{
                  marginTop: '12px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary, #b0b0b0)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}
              >
                {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default RouteErrorBoundary;
