'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { prisma } from '../../../lib/prisma';
import ReconciliationDetails from '../../../components/finance/ReconciliationDetails';

interface ReconciliationData {
  id: string;
  ref: string;
  date: Date;
  internalAmount: number;
  bankAmount: number;
  difference: number;
  status: string;
}

interface ReconciliationSummary {
  totalTransactions: number;
  reconciled: number;
  pending: number;
  discrepancies: number;
}

// Client component for reconciliation page
export default function FinanceReconciliation() {
  const { data: session, status } = useSession();
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary>({
    totalTransactions: 0,
    reconciled: 0,
    pending: 0,
    discrepancies: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [reconciliationResults, setReconciliationResults] = useState<{ payoutRef: string; status: string }[]>([]);
  const [issues, setIssues] = useState<{ payoutRef: string; reason: string }[]>([]);
  const [pendingResults, setPendingResults] = useState<{ payoutRef: string; reason: string }[]>([]);
  const [discrepancies, setDiscrepancies] = useState<{ payoutRef: string; reason: string }[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
  }, [status]);

  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    return null;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reconciliation data...</p>
        </div>
      </div>
    );
  }

  // Check if user has finance, admin or HR role
  if (session?.user?.role !== 'FINANCE' && session?.user?.role !== 'ADMIN' && session?.user?.role !== 'HR') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchReconciliationData();
  }, []);

  const fetchReconciliationData = async () => {
    setIsLoading(true);
    try {
      // In a real application, you would fetch this from an API
      // For now, we'll simulate it since we're converting to a client component
      const response = await fetch('/api/finance/reconciliation/data');
      if (!response.ok) {
        throw new Error('Failed to fetch reconciliation data');
      }
      const data = await response.json();
      setReconciliationData(data.reconciliationData);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
      setMessage('Error loading reconciliation data');
    } finally {
      setIsLoading(false);
    }
  };

  const runReconciliation = async () => {
    setIsReconciling(true);
    setShowProgress(true);
    setProgress(0);
    setMessage('Starting reconciliation process...');

    try {
      // Make the actual API call
      const response = await fetch('/api/finance/reconciliation/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run reconciliation');
      }

      const result = await response.json();
      setProgress(100);
      setMessage(`${result.message}`);

      // Store detailed results for management
      setReconciliationResults(result.results || []);
      setIssues(result.issues || []);

      // Categorize pending results separately
      const pending = result.results?.filter(r => r.status === 'PENDING') || [];
      setPendingResults(pending.map(r => ({ payoutRef: r.payoutRef, reason: 'Awaiting bank confirmation' })));

      // Store discrepancies separately (these come from the reconciliation data)
      // We need to refresh reconciliation data to get current discrepancies

      // Refresh the data after reconciliation
      await fetchReconciliationData();
    } catch (error: any) {
      console.error('Error running reconciliation:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsReconciling(false);
      setTimeout(() => {
        setShowProgress(false);
        setProgress(0);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Payment Reconciliation</h1>
            <button
              onClick={runReconciliation}
              disabled={isReconciling}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-75"
            >
              {isReconciling ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Reconciling...
                </>
              ) : 'Run Reconciliation'}
            </button>
          </div>

          {showProgress && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="mt-2 text-sm text-gray-600 text-center">
                {progress}% complete
              </div>
            </div>
          )}

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('Error')
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              {message}
            </div>
          )}

          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-medium text-blue-900">Reconciliation Summary</h2>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-700 hover:text-blue-900 font-medium"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold">{summary.totalTransactions}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Reconciled</p>
                <p className="text-2xl font-bold">{summary.reconciled}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{summary.pending}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Discrepancies</p>
                <p className="text-2xl font-bold">{summary.discrepancies}</p>
              </div>
            </div>
          </div>

          {showDetails && (
            <div className="mb-6 space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <ReconciliationDetails
                  items={issues}
                  type="issues"
                  onResolve={async (ref) => {
                    // Handle issue resolution
                    console.log(`Retrying payment for ${ref}`);
                    // In a real app, this would call an API to retry the failed payment
                  }}
                />
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <ReconciliationDetails
                  items={pendingResults}
                  type="pending"
                  onResolve={async (ref) => {
                    // Handle pending transaction check
                    console.log(`Checking status for pending transaction ${ref}`);
                    // In a real app, this would call an API to check the status of pending payments
                  }}
                />
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <ReconciliationDetails
                  items={reconciliationData.filter(r => r.status === 'discrepancy').map(r => ({ payoutRef: r.ref, reason: `Difference: KSH ${(r.difference || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}` }))}
                  type="discrepancies"
                  onResolve={async (ref) => {
                    // Handle discrepancy resolution
                    console.log(`Resolving discrepancy for ${ref}`);
                    // In a real app, this would open a form to investigate and resolve discrepancies
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
            <div className="flex-1">
              <div className="max-w-lg flex rounded-md shadow-sm">
                <input
                  type="text"
                  placeholder="Search reconciliations..."
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md rounded-r-none border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Search
                </button>
              </div>
            </div>

            <div className="flex space-x-2">
              <select className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                <option>All Statuses</option>
                <option>Reconciled</option>
                <option>Pending</option>
                <option>Discrepancy</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading reconciliation data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Internal Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bank Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difference
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reconciliationData.length > 0 ? (
                    reconciliationData.map((recon) => (
                      <tr key={recon.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {recon.ref}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(recon.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          KSH {recon.internalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          KSH {recon.bankAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          Math.abs(recon.difference) === 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.abs(recon.difference) === 0 ? '0' : `KSH ${recon.difference.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            recon.status === 'reconciled' ? 'bg-green-100 text-green-800' :
                            recon.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {recon.status.charAt(0).toUpperCase() + recon.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              View Details
                            </button>
                            <button className="text-gray-600 hover:text-gray-600">
                              Resolve
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        No reconciliation data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to <span className="font-medium">{reconciliationData.length}</span> of{' '}
              <span className="font-medium">{reconciliationData.length}</span> results
            </div>
            <div className="flex space-x-2">
              <button
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                  reconciliationData.length === 0
                    ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
                disabled={reconciliationData.length === 0}
              >
                Previous
              </button>
              <button
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                  reconciliationData.length === 0
                    ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
                disabled={reconciliationData.length === 0}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}