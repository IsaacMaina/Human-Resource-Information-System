'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { prisma } from '../../../lib/prisma';

// Disable static generation for this page since it accesses the database
export const dynamic = 'force-dynamic';
import AddNewBankModal from '../../../components/finance/AddNewBankModal';

interface BankWithEmployeeCount {
  id: string;
  name: string;
  code: string;
  status: string;
  employeeCount: number;
}

// We'll fetch the banks using a client-side fetch since we need dynamic behavior
export default function FinanceBanks() {
  const { data: session, status } = useSession();
  const [banks, setBanks] = useState<BankWithEmployeeCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

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
          <p className="mt-4 text-gray-600">Loading banks...</p>
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
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch('/api/finance/banks/list');
        if (!response.ok) {
          throw new Error('Failed to fetch banks');
        }
        const data = await response.json();
        setBanks(data.banks);
      } catch (err) {
        setError('Error loading banks: ' + (err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanks();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <AddNewBankModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Bank Integration</h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Add New Bank
            </button>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h2 className="text-lg font-medium text-blue-900 mb-2">Supported Banks</h2>
            <p className="text-sm text-blue-700">Configure bank accounts for payroll processing and salary disbursement</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading banks...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {banks.length > 0 ? (
                banks.map((bank) => (
                  <div key={bank.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{bank.name}</h3>
                        <p className="text-sm text-gray-500">{bank.code}</p>
                      </div>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        bank.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {bank.status.charAt(0).toUpperCase() + bank.status.slice(1)}
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{bank.employeeCount}</span> employee accounts mapped
                      </p>
                    </div>

                    <div className="mt-6 flex space-x-3">
                      <Link
                        href={`/finance/banks/${bank.id}`}
                        className="flex-1 text-center text-sm font-medium text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/finance/banks/${bank.id}`}
                        className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900"
                      >
                        Configure
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500">No banks configured yet.</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">Bank Configuration</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="default-bank" className="block text-sm font-medium text-gray-700 mb-1">
                    Default Bank for Payroll
                  </label>
                  <select
                    id="default-bank"
                    className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-1">
                    Bank API Key
                  </label>
                  <input
                    type="password"
                    id="api-key"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter API key"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700 mb-1">
                    Webhook URL
                  </label>
                  <input
                    type="text"
                    id="webhook-url"
                    readOnly
                    value="https://your-domain.com/api/webhooks/bank"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Bank Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}