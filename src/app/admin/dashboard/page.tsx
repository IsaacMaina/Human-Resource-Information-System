'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface Activity {
  id: string;
  actionType: string;
  description: string;
  module: string;
  timestamp: string;
  employeeName: string;
  employeeId: string;
  details?: any;
}

interface Stats {
  totalEmployees: number;
  pendingLeaves: number;
  thisMonthPayroll: string;
  activeContracts: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role && (session.user.role === 'ADMIN' || session.user.role === 'HR')) {
      // Fetch activities
      fetch('/api/admin/activities')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setActivities(data);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch admin activities:", error);
        });

      // Fetch stats
      fetch('/api/admin/stats')
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            console.error("Error fetching stats:", data.error);
          } else {
            setStats(data);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch admin stats:", error);
        })
        .finally(() => {
          setLoadingStats(false);
        });
    }
  }, [status, session]);

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + " years ago";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + " months ago";
    }
    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + " days ago";
    }
    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + " hours ago";
    }
    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + " minutes ago";
    }
    return "Just now";
  };

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

  // Check if user has admin role
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'HR') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCF8E3]">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center border border-[#E5E5E5]">
          <h1 className="text-2xl font-bold text-[#004B2E] mb-2">Access Denied</h1>
          <p className="text-[#080808] mb-6">
            You don't have permission to access the admin dashboard.
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
    <div className="min-h-screen bg-[#FCF8E3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6 border border-[#E5E5E5]">
          <h1 className="text-2xl font-bold text-[#004B2E] mb-6">Admin Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Human Resources */}
            <Link href="/admin/employees" className="bg-[#FCF8E3] border border-[#E5E5E5] rounded-lg p-6 text-center hover:bg-[#D4AF37] hover:text-white transition-colors">
              <div className="text-[#006837] mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-[#004B2E]">Employees</h3>
              <p className="text-sm text-[#777777] mt-1">Manage employee records</p>
            </Link>

            <Link href="/admin/leaves" className="bg-blue-50 border border-blue-100 rounded-lg p-6 text-center hover:bg-blue-400 hover:text-white transition-colors">
              <div className="text-blue-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Leaves</h3>
              <p className="text-sm text-gray-500 mt-1">Approve/reject requests</p>
            </Link>

            <Link href="/admin/documents" className="bg-green-50 border border-green-100 rounded-lg p-6 text-center hover:bg-green-400 hover:text-white transition-colors">
              <div className="text-green-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Documents</h3>
              <p className="text-sm text-gray-500 mt-1">Company forms</p>
            </Link>

            {/* Financial Management */}
            <Link href="/admin/payroll" className="bg-yellow-50 border border-yellow-100 rounded-lg p-6 text-center hover:bg-yellow-400 hover:text-white transition-colors">
              <div className="text-yellow-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Payroll</h3>
              <p className="text-sm text-gray-500 mt-1">Process salaries</p>
            </Link>

            <Link href="/admin/payouts" className="bg-purple-50 border border-purple-100 rounded-lg p-6 text-center hover:bg-purple-400 hover:text-white transition-colors">
              <div className="text-purple-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m4-6h6m0 0v6m0-6l-4 4-4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Payouts</h3>
              <p className="text-sm text-gray-500 mt-1">Make payments</p>
            </Link>

            <Link href="/analytics/dashboard" className="bg-pink-50 border border-pink-100 rounded-lg p-6 text-center hover:bg-pink-400 hover:text-white transition-colors">
              <div className="text-pink-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-2m0-7V7a2 2 0 012-2h6a2 2 0 012 2v3m-6 7h6m-6 2v2m6-2v-2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
              <p className="text-sm text-gray-500 mt-1">View reports & analytics</p>
            </Link>

            {/* System Management */}
            <Link href="/admin/audit" className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 text-center hover:bg-indigo-400 hover:text-white transition-colors">
              <div className="text-indigo-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Audit Logs</h3>
              <p className="text-sm text-gray-500 mt-1">System activity logs</p>
            </Link>

            <Link href="/admin/settings" className="bg-teal-50 border border-teal-100 rounded-lg p-6 text-center hover:bg-teal-400 hover:text-white transition-colors">
              <div className="text-teal-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Settings</h3>
              <p className="text-sm text-gray-500 mt-1">System configuration</p>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-6">
              <h2 className="text-lg font-medium text-[#004B2E] mb-4">Recent Activity</h2>
              <div className="max-h-80 overflow-y-auto pr-2 space-y-4">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <Link href={`/admin/activities/${activity.id}`} key={activity.id} className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                      <div className="flex-shrink-0">
                        {activity.module === 'EMPLOYEE' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#006837]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : activity.module === 'LEAVE' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#006837]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        ) : activity.module === 'PAYROLL' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#006837]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : activity.module === 'DOCUMENT' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#006837]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        ) : activity.module === 'NOTIFICATION' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#006837]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        ) : activity.module === 'SETTINGS' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#006837]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#006837]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-[#004B2E]">{activity.module} - {activity.actionType}</h3>
                        <p className="text-sm text-[#080808]">{activity.description}</p>
                        <p className="text-xs text-[#777777] mt-1">{activity.employeeName} - {timeAgo(activity.timestamp)}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-[#777777]">No recent activity.</p>
                )}
              </div>
            </div>
            
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-6">
              <h2 className="text-lg font-medium text-[#004B2E] mb-4">Quick Stats</h2>
              <div className="space-y-4">
                {loadingStats ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#006837]"></div>
                  </div>
                ) : stats ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#080808]">Total Employees</span>
                      <span className="font-medium">{stats.totalEmployees}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#080808]">Pending Leaves</span>
                      <span className="font-medium">{stats.pendingLeaves}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#080808]">This Month Payroll</span>
                      <span className="font-medium">{stats.thisMonthPayroll}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#080808]">Active Contracts</span>
                      <span className="font-medium">{stats.activeContracts}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#777777]">Failed to load stats.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}