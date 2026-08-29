/**
 * Error Helpers - Contextual error message generation
 * Provides user-friendly error messages with actionable guidance
 */

/**
 * Detect error type and provide contextual information
 */
export function analyzeError(error) {
  const errorMessage = error?.message || String(error || '');
  const errorString = errorMessage.toLowerCase();

  // Network errors
  if (
    errorString.includes('fetch') ||
    errorString.includes('network') ||
    errorString.includes('failed to fetch') ||
    errorString.includes('networkerror') ||
    error?.isNetworkError
  ) {
    return {
      type: 'network',
      title: 'Connection Problem',
      message: 'We couldn\'t reach our servers. This might be a temporary network issue.',
      suggestions: [
        'Check your internet connection',
        'Try again in a few moments',
        'If the problem persists, check our status page'
      ],
      action: {
        label: 'Retry',
        type: 'retry'
      }
    };
  }

  // Authentication errors
  if (
    errorString.includes('unauthorized') ||
    errorString.includes('401') ||
    errorString.includes('authentication') ||
    errorString.includes('token') ||
    error?.isAuthError
  ) {
    return {
      type: 'auth',
      title: 'Session Expired',
      message: 'Your session has expired. Please log in again to continue.',
      suggestions: [
        'Your changes have been saved',
        'Log in again to continue working'
      ],
      action: {
        label: 'Go to Login',
        type: 'navigate',
        path: '/login'
      }
    };
  }

  // Validation errors
  if (
    errorString.includes('validation') ||
    errorString.includes('invalid') ||
    errorString.includes('required') ||
    errorString.includes('format')
  ) {
    return {
      type: 'validation',
      title: 'Invalid Input',
      message: errorMessage || 'Please check your input and try again.',
      suggestions: [
        'Review the highlighted fields',
        'Check for required fields',
        'Ensure all formats are correct'
      ],
      action: {
        label: 'Fix Fields',
        type: 'focus'
      }
    };
  }

  // Server errors (500, 503, etc.)
  if (
    errorString.includes('500') ||
    errorString.includes('503') ||
    errorString.includes('server error') ||
    errorString.includes('internal server')
  ) {
    return {
      type: 'server',
      title: 'Server Error',
      message: 'Our servers are experiencing issues. We\'re working on it!',
      suggestions: [
        'Try again in a few moments',
        'Your data is safe and will be saved',
        'Check our status page for updates'
      ],
      action: {
        label: 'Retry',
        type: 'retry'
      }
    };
  }

  // Rate limiting
  if (
    errorString.includes('rate limit') ||
    errorString.includes('429') ||
    errorString.includes('too many requests')
  ) {
    return {
      type: 'rateLimit',
      title: 'Too Many Requests',
      message: 'You\'re making requests too quickly. Please slow down.',
      suggestions: [
        'Wait a moment before trying again',
        'Reduce the frequency of your actions'
      ],
      action: {
        label: 'Wait & Retry',
        type: 'retry',
        delay: 2000
      }
    };
  }

  // Not found errors
  if (
    errorString.includes('404') ||
    errorString.includes('not found') ||
    errorString.includes('does not exist')
  ) {
    return {
      type: 'notFound',
      title: 'Not Found',
      message: 'The resource you\'re looking for doesn\'t exist or has been removed.',
      suggestions: [
        'Check if the URL is correct',
        'The item may have been deleted',
        'Try refreshing the page'
      ],
      action: {
        label: 'Go to Dashboard',
        type: 'navigate',
        path: '/dashboard'
      }
    };
  }

  // Permission errors
  if (
    errorString.includes('403') ||
    errorString.includes('forbidden') ||
    errorString.includes('permission') ||
    errorString.includes('access denied')
  ) {
    return {
      type: 'permission',
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      suggestions: [
        'This feature may require a higher plan',
        'Contact support@sitesprintz.com if you believe this is an error'
      ],
      action: {
        label: 'View Plans',
        type: 'navigate',
        path: '/settings/payments'
      }
    };
  }

  // Generic error
  return {
    type: 'generic',
    title: 'Something Went Wrong',
    message: errorMessage || 'An unexpected error occurred. Please try again.',
    suggestions: [
      'Try refreshing the page',
      'If the problem persists, contact support'
    ],
    action: {
      label: 'Retry',
      type: 'retry'
    }
  };
}

/**
 * Create user-friendly error message for toast
 */
export function createErrorMessage(error, context = '') {
  const analysis = analyzeError(error);
  
  let message = analysis.message;
  if (context) {
    message = `${context}: ${message}`;
  }

  return {
    message,
    type: 'error',
    title: analysis.title,
    suggestions: analysis.suggestions,
    action: analysis.action
  };
}

/**
 * Handle error with toast notification
 */
export function handleErrorWithToast(error, context, showError) {
  const errorInfo = createErrorMessage(error, context);
  
  showError(errorInfo.message, {
    action: errorInfo.action,
    duration: errorInfo.type === 'rateLimit' ? 5000 : 3000
  });

  return errorInfo;
}



