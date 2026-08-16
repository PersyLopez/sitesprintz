import React, { Component } from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const isNetworkError = error?.message?.includes('fetch') || 
                           error?.message?.includes('network') ||
                           error?.message?.includes('Failed to fetch');
      const isAuthError = error?.message?.includes('Unauthorized') ||
                         error?.message?.includes('401');

      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h2>Something went wrong</h2>
            
            {isNetworkError && (
              <div className="error-context">
                <p><strong>Connection Issue</strong></p>
                <p>We couldn't reach our servers. This might be a temporary network problem.</p>
                <div className="error-actions">
                  <button 
                    className="btn btn-primary" 
                    onClick={this.handleRetry}
                    aria-label="Retry the operation"
                  >
                    🔄 Retry
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={this.handleReload}
                    aria-label="Reload the page"
                  >
                    🔄 Reload Page
                  </button>
                </div>
              </div>
            )}

            {isAuthError && (
              <div className="error-context">
                <p><strong>Authentication Required</strong></p>
                <p>Your session may have expired. Please log in again to continue.</p>
                <div className="error-actions">
                  <button 
                    className="btn btn-primary" 
                    onClick={() => window.location.href = '/login'}
                    aria-label="Go to login page"
                  >
                    🔐 Go to Login
                  </button>
                </div>
              </div>
            )}

            {!isNetworkError && !isAuthError && (
              <div className="error-context">
                <p>{error?.message || 'An unexpected error occurred'}</p>
                <div className="error-actions">
                  <button 
                    className="btn btn-primary" 
                    onClick={this.handleRetry}
                    aria-label="Try again"
                  >
                    🔄 Try Again
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={this.handleReload}
                    aria-label="Reload the page"
                  >
                    🔄 Reload Page
                  </button>
                </div>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="error-details">
                <summary>Technical Details (Development Only)</summary>
                <pre>{this.state.error?.toString()}</pre>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

