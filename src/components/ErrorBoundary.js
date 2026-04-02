import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        errorInfo: {
          componentStack: errorInfo.componentStack
        },
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingLogs.push(errorLog);
      
      if (existingLogs.length > 10) {
        existingLogs.splice(0, existingLogs.length - 10);
      }
      
      localStorage.setItem('errorLogs', JSON.stringify(existingLogs));
    } catch (logError) {
      console.error('Failed to log error to localStorage:', logError);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '20px',
          backgroundColor: 'var(--surface, #1a1a1a)',
          color: 'var(--text, #ffffff)'
        }}>
          <div style={{
            maxWidth: '600px',
            textAlign: 'center',
            backgroundColor: 'var(--surface-elevated, #2a2a2a)',
            padding: '40px',
            borderRadius: '12px',
            border: '1px solid var(--border, #333333)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{
              fontSize: '2rem',
              marginBottom: '16px',
              color: 'var(--accent, #4fc3f7)',
              fontWeight: '600'
            }}>
              🛡️ GamePilot Hit a Snag
            </h2>
            
            <p style={{
              fontSize: '1.1rem',
              marginBottom: '32px',
              lineHeight: '1.6',
              color: 'var(--text-secondary, #b0b0b0)'
            }}>
              Something unexpected happened, but don't worry - your gaming library is safe!
            </p>
            
            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              marginBottom: '32px'
            }}>
              <button 
                onClick={this.handleRetry}
                style={{
                  backgroundColor: 'var(--accent, #4fc3f7)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
              >
                🔄 Try Again
              </button>
              
              <button 
                onClick={this.handleReload}
                style={{
                  backgroundColor: 'var(--surface, #3a3a3a)',
                  color: 'var(--text, #ffffff)',
                  border: '1px solid var(--border, #555555)',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
              >
                🔄 Reload App
              </button>
            </div>
            
            {isDevelopment && this.state.error && (
              <details style={{
                textAlign: 'left',
                marginTop: '24px',
                backgroundColor: 'var(--surface, #1a1a1a)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--border, #333333)'
              }}>
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: 'var(--accent, #4fc3f7)',
                  marginBottom: '16px'
                }}>
                  🐛 Error Details (Development)
                </summary>
                
                <div style={{ fontSize: '0.9rem' }}>
                  <h4>Error:</h4>
                  <pre style={{
                    backgroundColor: 'var(--surface-elevated, #2a2a2a)',
                    padding: '12px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary, #b0b0b0)',
                    border: '1px solid var(--border, #333333)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {this.state.error.toString()}
                  </pre>
                  
                  <h4>Component Stack:</h4>
                  <pre style={{
                    backgroundColor: 'var(--surface-elevated, #2a2a2a)',
                    padding: '12px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary, #b0b0b0)',
                    border: '1px solid var(--border, #333333)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                  
                  <h4>Stack Trace:</h4>
                  <pre style={{
                    backgroundColor: 'var(--surface-elevated, #2a2a2a)',
                    padding: '12px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary, #b0b0b0)',
                    border: '1px solid var(--border, #333333)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {this.state.error.stack}
                  </pre>
                </div>
              </details>
            )}
            
            <div style={{
              textAlign: 'left',
              marginTop: '32px',
              padding: '20px',
              backgroundColor: 'var(--surface, #1a1a1a)',
              borderRadius: '8px',
              border: '1px solid var(--border, #333333)'
            }}>
              <h4 style={{
                color: 'var(--accent, #4fc3f7)',
                marginBottom: '12px',
                fontSize: '1.1rem'
              }}>
                💡 Quick Tips
              </h4>
              <ul style={{
                margin: '0',
                paddingLeft: '20px',
                color: 'var(--text-secondary, #b0b0b0)',
                lineHeight: '1.6'
              }}>
                <li>Your game library and settings are automatically saved</li>
                <li>Try refreshing the page if the issue persists</li>
                <li>Check the browser console for more technical details</li>
                <li>Recent scans or launches might have triggered this - try again</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
