// ERROR HANDLING EXAMPLES - LUNA ERP
// This file demonstrates how to use the centralized error handling utilities

import { handleError, getErrorMessage, isAuthError, isPermissionError, isNetworkError, retryOperation } from '@/lib/error-handler';
import { useToast } from '@/hooks/use-toast';

// ============================================
// Example 1: Basic Error Handling in Forms
// ============================================

async function handleFormSubmit(data: FormData) {
  const { toast } = useToast();
  
  try {
    // Your operation here
    await someFirestoreOperation(data);
    
    toast({
      title: 'Success',
      description: 'Data saved successfully',
    });
  } catch (error) {
    // Use handleError for detailed error info
    const appError = handleError(error, 'handleFormSubmit');
    
    toast({
      variant: 'destructive',
      title: 'Operation Failed',
      description: appError.message, // User-friendly message
    });
    
    // Optional: Log for debugging
    console.error('Form submission error:', appError);
  }
}

// ============================================
// Example 2: Simple Error Message Extraction
// ============================================

async function quickErrorHandling() {
  const { toast } = useToast();
  
  try {
    await someOperation();
  } catch (error) {
    // Quick way to get user-friendly message
    toast({
      variant: 'destructive',
      title: 'Error',
      description: getErrorMessage(error),
    });
  }
}

// ============================================
// Example 3: Handling Specific Error Types
// ============================================

async function handleSpecificErrors(data: any) {
  const { toast } = useToast();
  
  try {
    await firestore.collection('items').add(data);
  } catch (error) {
    if (isAuthError(error)) {
      // Handle authentication errors
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'Please log in to continue',
      });
      router.push('/login');
      return;
    }
    
    if (isPermissionError(error)) {
      // Handle permission errors
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You don\'t have permission to perform this action',
      });
      return;
    }
    
    if (isNetworkError(error)) {
      // Handle network errors - show retry option
      toast({
        variant: 'destructive',
        title: 'Network Error',
        description: 'Please check your connection and try again',
        action: (
          <Button onClick={() => handleSpecificErrors(data)}>
            Retry
          </Button>
        ),
      });
      return;
    }
    
    // Handle all other errors
    const appError = handleError(error, 'handleSpecificErrors');
    toast({
      variant: 'destructive',
      title: 'Error',
      description: appError.message,
    });
  }
}

// ============================================
// Example 4: Automatic Retry with Exponential Backoff
// ============================================

async function saveDataWithRetry(data: any) {
  const { toast } = useToast();
  
  try {
    // Automatically retries up to 3 times with exponential backoff
    // Only retries if error is retryable (network, timeout, etc.)
    await retryOperation(
      async () => {
        return await firestore.collection('items').add(data);
      },
      3, // max retries
      1000 // initial delay in ms
    );
    
    toast({
      title: 'Success',
      description: 'Data saved successfully',
    });
  } catch (error) {
    // Only reaches here if all retries failed
    const appError = handleError(error, 'saveDataWithRetry');
    toast({
      variant: 'destructive',
      title: 'Save Failed',
      description: `${appError.message}. Please try again later.`,
    });
  }
}

// ============================================
// Example 5: Using RetryButton Component
// ============================================

import { RetryButton } from '@/components/RetryButton';

function MyComponent() {
  const [data, setData] = useState(null);
  
  const fetchData = async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Failed to fetch');
    const json = await response.json();
    setData(json);
  };
  
  return (
    <div>
      {data ? (
        <div>{/* Display data */}</div>
      ) : (
        <RetryButton
          operation={fetchData}
          onSuccess={() => console.log('Data loaded!')}
          label="Load Data"
          maxRetries={3}
        />
      )}
    </div>
  );
}

// ============================================
// Example 6: Using ErrorBoundary Component
// ============================================

import { ErrorBoundary } from '@/components/ErrorBoundary';

function ParentComponent() {
  return (
    <ErrorBoundary>
      {/* Any rendering errors in children will be caught */}
      <PotentiallyFailingComponent />
    </ErrorBoundary>
  );
}

// With custom fallback UI
function ParentWithCustomFallback() {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 text-center">
          <h2>Oops! Something went wrong</h2>
          <Button onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      }
    >
      <PotentiallyFailingComponent />
    </ErrorBoundary>
  );
}

// With error callback
function ParentWithCallback() {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Send to error monitoring service
    console.error('Component error:', error, errorInfo);
  };
  
  return (
    <ErrorBoundary onError={handleError}>
      <PotentiallyFailingComponent />
    </ErrorBoundary>
  );
}

// ============================================
// Example 7: File Upload with Error Handling
// ============================================

async function handleFileUpload(file: File) {
  const { toast } = useToast();
  
  try {
    await retryOperation(async () => {
      const storageRef = ref(storage, `uploads/${file.name}`);
      await uploadBytes(storageRef, file);
    }, 3);
    
    toast({
      title: 'Upload Successful',
      description: `${file.name} uploaded successfully`,
    });
  } catch (error) {
    const appError = handleError(error, 'handleFileUpload');
    
    // Show specific error for storage quota
    if (error.code === 'storage/quota-exceeded') {
      toast({
        variant: 'destructive',
        title: 'Storage Full',
        description: 'Storage quota exceeded. Please contact admin.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: appError.message,
      });
    }
  }
}

// ============================================
// Example 8: Batch Operations with Partial Failure Handling
// ============================================

async function batchUpdate(items: any[]) {
  const { toast } = useToast();
  const errors: Array<{ item: any; error: unknown }> = [];
  
  for (const item of items) {
    try {
      await updateItem(item);
    } catch (error) {
      // Log but continue with other items
      errors.push({ item, error });
    }
  }
  
  if (errors.length === 0) {
    toast({
      title: 'Success',
      description: `All ${items.length} items updated successfully`,
    });
  } else if (errors.length < items.length) {
    toast({
      variant: 'default',
      title: 'Partial Success',
      description: `${items.length - errors.length} items updated, ${errors.length} failed`,
    });
  } else {
    toast({
      variant: 'destructive',
      title: 'All Updates Failed',
      description: getErrorMessage(errors[0].error),
    });
  }
}

// ============================================
// Example 9: Transaction with Error Handling
// ============================================

async function transferInventory(fromId: string, toId: string, quantity: number) {
  const { toast } = useToast();
  
  try {
    await retryOperation(async () => {
      await runTransaction(firestore, async (transaction) => {
        const fromRef = doc(firestore, 'inventory', fromId);
        const toRef = doc(firestore, 'inventory', toId);
        
        const fromDoc = await transaction.get(fromRef);
        const toDoc = await transaction.get(toRef);
        
        if (!fromDoc.exists() || !toDoc.exists()) {
          throw new Error('One or more items not found');
        }
        
        const fromQty = fromDoc.data().quantity;
        if (fromQty < quantity) {
          throw new Error('Insufficient quantity');
        }
        
        transaction.update(fromRef, { quantity: fromQty - quantity });
        transaction.update(toRef, { quantity: toDoc.data().quantity + quantity });
      });
    });
    
    toast({
      title: 'Transfer Complete',
      description: `Transferred ${quantity} units successfully`,
    });
  } catch (error) {
    const appError = handleError(error, 'transferInventory');
    toast({
      variant: 'destructive',
      title: 'Transfer Failed',
      description: appError.message,
    });
  }
}

// ============================================
// Example 10: Loading State with Error Recovery
// ============================================

function DataFetchingComponent() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const { toast } = useToast();
  
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await retryOperation(async () => {
        const snapshot = await getDocs(collection(firestore, 'items'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      });
      
      setData(result);
    } catch (err) {
      const appError = handleError(err, 'fetchData');
      setError(appError);
      
      toast({
        variant: 'destructive',
        title: 'Failed to Load Data',
        description: appError.message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  if (isLoading) return <div>Loading...</div>;
  
  if (error) {
    return (
      <div>
        <p>Error: {error.message}</p>
        {error.retryable && (
          <RetryButton
            operation={fetchData}
            label="Try Again"
          />
        )}
      </div>
    );
  }
  
  return <div>{/* Render data */}</div>;
}

// ============================================
// BEST PRACTICES
// ============================================

/*
1. Always use handleError() or getErrorMessage() for user-facing errors
2. Use retryOperation() for network-dependent operations
3. Wrap form components in ErrorBoundary
4. Check error types with is*Error() helpers before taking specific actions
5. Log errors for debugging but show friendly messages to users
6. Use RetryButton for operations that might fail due to network issues
7. Always handle errors - never leave try-catch empty
8. Provide context string to handleError() for better debugging
9. Use toast notifications to inform users of errors
10. For critical operations, use transactions with retry logic
*/
