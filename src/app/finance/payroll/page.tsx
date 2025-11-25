'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface PayrollSummary {
  id: string;
  month: Date;
  totalEmployees: number;
  grossPayroll: number;
  deductions: number;
  netPayroll: number;
  status: string;
}

export default function FinancePayroll() {
  const { data: session, status } = useSession();
  const [payrolls, setPayrolls] = useState<PayrollSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);

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
          <p className="mt-4 text-gray-600">Loading payroll data...</p>
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

  // Pagination state
  const [paginatedPayrolls, setPaginatedPayrolls] = useState<PayrollSummary[]>([]);

  // Fetch payroll data
  useEffect(() => {
    const fetchPayrollData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/finance/payroll');
        if (response.ok) {
          let allPayrolls: PayrollSummary[] = await response.json();

          // Format dates
          allPayrolls = allPayrolls.map(payroll => ({
            ...payroll,
            month: new Date(payroll.month)
          }));

          setPayrolls(allPayrolls);
        } else {
          console.error('Failed to fetch payroll data');
        }
      } catch (error) {
        console.error('Error fetching payroll data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollData();
  }, []);

  // Update pagination whenever payrolls, current page, or rows per page change
  useEffect(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentPayrolls = payrolls.slice(startIndex, endIndex);
    setPaginatedPayrolls(currentPayrolls);
    setTotalPages(Math.ceil(payrolls.length / rowsPerPage));
  }, [payrolls, currentPage, rowsPerPage]);

  // Get the most recent payroll for the summary card
  const currentPayroll = payrolls.length > 0 ? payrolls[0] : null;

  // Pagination functions
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const changeRowsPerPage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRowsPerPage = parseInt(e.target.value);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page when changing rows per page
  };

  // Client component for export functionality
  const ExportDropdown = ({ payroll }: { payroll: PayrollSummary }) => (
    <div className="relative inline-block text-left">
      <button
        type="button"
        className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        id={`export-menu-button-${payroll.id}`}
        aria-expanded="true"
        aria-haspopup="true"
      >
        Export
        <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      <div
        className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby={`export-menu-button-${payroll.id}`}
        tabIndex={-1}
      >
        <div className="py-1" role="none">
          <a
            href={`/api/finance/export/payroll/${payroll.id}/pdf`}
            className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
            role="menuitem"
            tabIndex={-1}
          >
            Export as PDF
          </a>
          <a
            href={`/api/finance/export/payroll/${payroll.id}/doc`}
            className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
            role="menuitem"
            tabIndex={-1}
          >
            Export as DOC
          </a>
          <a
            href={`/api/finance/export/payroll/${payroll.id}/excel`}
            className="text-gray-700 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
            role="menuitem"
            tabIndex={-1}
          >
            Export as Excel
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Payroll Summary</h1>
            <Link href="/finance/payroll/new">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Process New Payroll
              </button>
            </Link>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h2 className="text-lg font-medium text-blue-900 mb-2">
              {currentPayroll
                ? `${currentPayroll.month.toLocaleString('default', { month: 'long', year: 'numeric' })} Payroll Summary`
                : 'Current Month Payroll Summary'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">
                  {currentPayroll ? currentPayroll.totalEmployees : 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Gross Payroll</p>
                <p className="text-2xl font-bold">
                  KSH {currentPayroll ? currentPayroll.grossPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Deductions</p>
                <p className="text-2xl font-bold">
                  KSH {currentPayroll ? currentPayroll.deductions.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Net Payroll</p>
                <p className="text-2xl font-bold">
                  KSH {currentPayroll ? currentPayroll.netPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
                </p>
              </div>
            </div>
          </div>

          {/* Responsive table container */}
          <div className="overflow-x-auto">
            {/* Desktop: Table view */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employees
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gross Payroll
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deductions
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Payroll
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
                  {paginatedPayrolls.length > 0 ? (
                    paginatedPayrolls.map((payroll) => (
                      <tr key={payroll.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payroll.month.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payroll.totalEmployees}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          KSH {payroll.grossPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          KSH {payroll.deductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          KSH {payroll.netPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            payroll.status === 'processed' ? 'bg-green-100 text-green-800' :
                            payroll.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Link href={`/finance/payroll/${payroll.id}`}>
                            <button className="text-indigo-600 hover:text-indigo-900">View</button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        No payroll data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile: Card view */}
            <div className="md:hidden space-y-4">
              {paginatedPayrolls.length > 0 ? (
                paginatedPayrolls.map((payroll) => (
                  <div key={payroll.id} className="bg-white border rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {payroll.month.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {payroll.totalEmployees} employees
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        payroll.status === 'processed' ? 'bg-green-100 text-green-800' :
                        payroll.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Gross Payroll</p>
                        <p className="font-medium">KSH {payroll.grossPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Net Payroll</p>
                        <p className="font-medium">KSH {payroll.netPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Deductions</p>
                        <p className="font-medium">KSH {payroll.deductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Link href={`/finance/payroll/${payroll.id}`}>
                        <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                          View Details
                        </button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No payroll data found.
                </div>
              )}
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="rowsPerPage" className="text-sm text-gray-700">Rows per page:</label>
              <select
                id="rowsPerPage"
                value={rowsPerPage}
                onChange={changeRowsPerPage}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * rowsPerPage, payrolls.length)}
              </span> of{' '}
              <span className="font-medium">{payrolls.length}</span> results
            </div>

            <div className="flex space-x-2">
              <button
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                  currentPage === 1
                    ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
                disabled={currentPage === 1}
                onClick={goToPrevPage}
              >
                Previous
              </button>
              <button
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                  currentPage === totalPages || totalPages === 0
                    ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={goToNextPage}
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