import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authconfig';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

// Disable static generation for this page since it accesses the database
export const dynamic = 'force-dynamic';

interface Activity {
  id: string;
  actionType: string;
  description: string;
  module: string;
  timestamp: string;
  details?: any;
}

export const metadata: Metadata = {
  title: "Employee Dashboard - University HRIS",
  description: "Access your personal employee information, payslips, leave requests, and HR resources",
};

export default async function EmployeeDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  // Get employee details
  const employee = await prisma.employee.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true
    }
  });

  if (!employee) {
    // If no employee record is found, redirect to a page explaining the issue
    // or create a basic employee profile if needed
    console.error(`No employee record found for user ID: ${session.user.id}`);
    // Instead of redirecting to login, we should redirect to a page that explains the issue
    // or allow them to create an employee profile
    redirect('/auth/login'); // This is appropriate for now
  }

  // Fetch recent activities for the employee
  let activities = [];
  try {
    activities = await prisma.activity.findMany({
      where: { employeeId: employee.id },
      orderBy: { timestamp: 'desc' },
      take: 5 // Take only 5 most recent activities
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    activities = []; // Default to empty array if there's an error
  }

  // Fetch current year's leave allocation
  const currentYear = new Date().getFullYear();
  let leaveAllocation = null;
  try {
    leaveAllocation = await prisma.leaveAllocation.findUnique({
      where: {
        employeeId_year: {
          employeeId: employee.id,
          year: currentYear
        }
      }
    });
  } catch (error) {
    console.error('Error fetching leave allocation:', error);
    // If there's an error fetching leave allocation, continue without it
    leaveAllocation = null;
  }

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return Math.floor(seconds) + " seconds ago";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Welcome, {employee.user.name || 'Employee'}!
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/employee/profile" className="bg-blue-50 border border-blue-100 rounded-lg p-6 text-center hover:bg-blue-400 hover:text-white transition-colors">
              <div className="text-blue-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Profile</h3>
              <p className="text-sm text-gray-500 mt-1">Manage personal info</p>
            </Link>

            <Link href="/employee/payslips" className="bg-green-50 border border-green-100 rounded-lg p-6 text-center hover:bg-green-400 hover:text-white transition-colors">
              <div className="text-green-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Payslips</h3>
              <p className="text-sm text-gray-500 mt-1">View salary slips</p>
            </Link>

            <Link href="/employee/leaves" className="bg-yellow-50 border border-yellow-100 rounded-lg p-6 text-center hover:bg-yellow-400 hover:text-white transition-colors">
              <div className="text-yellow-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Leave Requests</h3>
              <p className="text-sm text-gray-500 mt-1">Apply & view leaves</p>
            </Link>

            {/* Leave Allocation Card */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 text-center">
              <div className="text-indigo-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Leave Balance</h3>
              <p className="text-sm text-gray-500 mt-1">{currentYear} Annual Leave</p>
              <p className="text-2xl font-bold text-indigo-600 mt-2">{leaveAllocation?.remainingDays ?? 30} days</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex items-start">
                      <div className="flex-shrink-0">
                        {activity.module === 'EMPLOYEE' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : activity.module === 'LEAVE' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        ) : activity.module === 'PAYROLL' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-900">{activity.module} - {activity.actionType}</h3>
                        <p className="text-sm text-gray-500">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No recent activity.</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Employee Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="text-lg font-medium">{employee.user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Staff Number</p>
                  <p className="text-lg font-medium">{employee.staffNo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Position</p>
                  <p className="text-lg font-medium">{employee.position}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Department</p>
                  <p className="text-lg font-medium">{employee.department}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-lg font-medium">{employee.user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}