'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function EmployeeFunctions() {
  const { data: session, status } = useSession();

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
      <div className="min-h-screen flex items-center justify-center bg-[#FCF8E3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006837] mx-auto"></div>
          <p className="mt-4 text-[#080808]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if user has employee or higher role including finance for employee-related functions
  if (session?.user?.role !== 'EMPLOYEE' && session?.user?.role !== 'ADMIN' && session?.user?.role !== 'HR' && session?.user?.role !== 'FINANCE') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCF8E3]">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center border border-[#E5E5E5]">
          <h1 className="text-2xl font-bold text-[#004B2E] mb-2">Access Denied</h1>
          <p className="text-[#080808] mb-6">
            You don't have permission to access employee functions.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-[#006837] text-sm font-medium rounded-md shadow-sm text-[#006837] bg-white hover:bg-[#006837] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006837]"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Employee Functions</h1>
          <p className="text-gray-600 mb-8">Access self-service functions available to all employees</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Leave Requests */}
            <Link href="/employee/leaves" className="bg-blue-50 border border-blue-100 rounded-lg p-6 text-center hover:bg-blue-400 hover:text-white transition-colors">
              <div className="text-blue-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Leave Requests</h3>
              <p className="text-sm text-gray-500 mt-1">Apply or view leave requests</p>
            </Link>

            {/* Payslips */}
            <Link href="/employee/payslips" className="bg-green-50 border border-green-100 rounded-lg p-6 text-center hover:bg-green-400 hover:text-white transition-colors">
              <div className="text-green-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Payslips</h3>
              <p className="text-sm text-gray-500 mt-1">View and download salary slips</p>
            </Link>

            {/* Profile */}
            <Link href="/employee/profile" className="bg-yellow-50 border border-yellow-100 rounded-lg p-6 text-center hover:bg-yellow-400 hover:text-white transition-colors">
              <div className="text-yellow-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Profile</h3>
              <p className="text-sm text-gray-500 mt-1">Manage personal information</p>
            </Link>

            {/* Documents */}
            <Link href="/employee/documents" className="bg-purple-50 border border-purple-100 rounded-lg p-6 text-center hover:bg-purple-400 hover:text-white transition-colors">
              <div className="text-purple-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Documents</h3>
              <p className="text-sm text-gray-500 mt-1">Upload and manage files</p>
            </Link>

            {/* Settings */}
            <Link href="/employee/settings" className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 text-center hover:bg-indigo-400 hover:text-white transition-colors">
              <div className="text-indigo-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Settings</h3>
              <p className="text-sm text-gray-500 mt-1">Account preferences</p>
            </Link>

            {/* Notifications */}
            <Link href="/employee/notifications" className="bg-pink-50 border border-pink-100 rounded-lg p-6 text-center hover:bg-pink-400 hover:text-white transition-colors">
              <div className="text-pink-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m4-6h6m0 0v6m0-6l-4 4-4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
              <p className="text-sm text-gray-500 mt-1">View alerts and updates</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}