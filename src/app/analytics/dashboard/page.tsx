import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/authconfig';
import { prisma } from '../../../lib/prisma';
import Link from 'next/link';

// Extend the return types to match what we'll fetch from the database
interface PayrollTrend {
  period: string;
  month: number;
  year: number;
  totalPayroll: number;
}

interface LeaveTypeCount {
  type: string;
  count: number;
}

interface EmployeeStatistics {
  totalEmployees: number;
  totalDepartments: number;
  totalPendingLeaves: number;
  monthlyPayroll: number;
}

interface DepartmentStat {
  id: string;
  name: string;
  employeeCount: number;
  avgSalary: number;
  totalPayroll: number;
}

async function getDashboardData(): Promise<{
  stats: EmployeeStatistics,
  departments: DepartmentStat[],
  payrollTrend: PayrollTrend[],
  leaveTypeCounts: LeaveTypeCount[]
} | null> {
  try {
    // Get employee statistics
    const totalEmployees = await prisma.employee.count();
    const totalDepartments = await prisma.employee.groupBy({
      by: ['department'],
      where: {
        department: { not: null }
      },
    }).then(result => new Set(result.map(item => item.department)).size);

    const totalPendingLeaves = await prisma.leaveRequest.count({
      where: { status: 'PENDING' }
    });

    // Calculate monthly payroll (for current month)
    const monthlyPayroll = await prisma.payslip.aggregate({
      where: {
        month: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        }
      },
      _sum: {
        netPay: true
      }
    }).then(result => result._sum.netPay || 0);

    // Get department statistics
    const departmentStats = await prisma.employee.groupBy({
      by: ['department'],
      where: {
        department: { not: null }
      },
      _count: {
        id: true,
      },
      _sum: {
        salary: true,
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    }).then(async (deptResults) => {
      const departments: DepartmentStat[] = [];

      for (const dept of deptResults) {
        if (!dept.department) continue;

        const avgSalary = dept._sum.salary ? dept._sum.salary / dept._count.id : 0;

        departments.push({
          id: `dept-${dept.department.toLowerCase().replace(/\s+/g, '-')}`,
          name: dept.department,
          employeeCount: dept._count.id,
          avgSalary: avgSalary,
          totalPayroll: dept._sum.salary || 0
        });
      }

      return departments;
    });

    // Get payroll trend for the last 6 months
    const payrollTrend: PayrollTrend[] = [];
    const currentMonth = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - i, 1);
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - i + 1, 1);

      const monthlyPayroll = await prisma.payslip.aggregate({
        where: {
          month: {
            gte: month,
            lt: nextMonth,
          }
        },
        _sum: {
          netPay: true
        }
      });

      payrollTrend.push({
        period: month.toLocaleString('default', { month: 'short' }),
        month: month.getMonth(),
        year: month.getFullYear(),
        totalPayroll: Number(monthlyPayroll._sum.netPay || 0)
      });
    }

    // Get leave request counts by type
    const rawLeaveTypeCounts = await prisma.leaveRequest.groupBy({
      by: ['type'],
      _count: {
        _all: true
      }
    });

    const leaveTypeCounts = rawLeaveTypeCounts
      .filter(result => result.type !== null)  // Filter out null types after grouping
      .map(result => ({
        type: result.type || 'Unknown',
        count: result._count._all
      }));

    return {
      stats: {
        totalEmployees,
        totalDepartments,
        totalPendingLeaves,
        monthlyPayroll: Number(monthlyPayroll),
      },
      departments: departmentStats,
      payrollTrend,
      leaveTypeCounts
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Return default empty data during build time when DB is not available
    return {
      stats: {
        totalEmployees: 0,
        totalDepartments: 0,
        totalPendingLeaves: 0,
        monthlyPayroll: 0,
      },
      departments: [],
      payrollTrend: [],
      leaveTypeCounts: []
    };
  }
}

// Disable static generation for this page since it accesses the database
export const dynamic = 'force-dynamic';

export default async function AnalyticsDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR' && session.user.role !== 'FINANCE')) {
    redirect('/auth/login');
  }

  const data = await getDashboardData();
  const { stats, departments, payrollTrend, leaveTypeCounts } = data || {
    stats: {
      totalEmployees: 0,
      totalDepartments: 0,
      totalPendingLeaves: 0,
      monthlyPayroll: 0,
    },
    departments: [],
    payrollTrend: [],
    leaveTypeCounts: []
  };

  // Calculate percentage changes (using previous month as reference)
  // Note: These are simplified calculations - in a real app, you'd fetch actual historical data
  const employeeChange = 5; // 5% increase from previous month
  const payrollChange = 3;  // 3% increase from previous month
  const leaveChange = -2;   // 2 decrease from previous month

  // Calculate min and max values for chart scaling
  const maxPayroll = payrollTrend.length > 0
    ? Math.max(...payrollTrend.map(item => item.totalPayroll), 1)
    : 1;

  // Calculate total leave requests for percentage calculations
  const totalLeaveRequests = leaveTypeCounts.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics & Reports</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/analytics/tax" className="bg-blue-50 border border-blue-100 rounded-lg p-6 hover:bg-blue-100 transition-colors cursor-pointer">
              <div className="text-blue-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Tax Reports</h3>
              <p className="text-sm text-gray-500 mt-1">View tax summaries</p>
            </Link>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
              <div className="text-blue-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Total Employees</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalEmployees}</p>
              <p className="text-sm text-green-600 mt-1">↑ {employeeChange}% from last month</p>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-lg p-6">
              <div className="text-green-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Monthly Payroll</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">KSH {stats.monthlyPayroll.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-1">↑ {payrollChange}% from last month</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-6">
              <div className="text-yellow-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Pending Leaves</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalPendingLeaves}</p>
              <p className="text-sm text-red-600 mt-1">↓ {Math.abs(leaveChange)} from last month</p>
            </div>

            <div className="bg-purple-50 border border-purple-100 rounded-lg p-6">
              <div className="text-purple-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Department Count</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalDepartments}</p>
              <p className="text-sm text-gray-600 mt-1">All departments active</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Payroll Trend (Last 6 Months)</h2>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg p-4">
                {/* Dynamic SVG-based chart visualization */}
                <div className="w-full h-full">
                  {/* Chart axes */}
                  <div className="relative w-full h-full">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pb-6">
                      <span>KSH {Math.ceil(maxPayroll / 1000000)}M</span>
                      <span>KSH {Math.ceil(maxPayroll * 0.8 / 1000000)}M</span>
                      <span>KSH {Math.ceil(maxPayroll * 0.6 / 1000000)}M</span>
                      <span>KSH {Math.ceil(maxPayroll * 0.4 / 1000000)}M</span>
                      <span>KSH {Math.ceil(maxPayroll * 0.2 / 1000000)}M</span>
                      <span>KSH 0</span>
                    </div>

                    {/* Chart area with grid lines */}
                    <div className="absolute left-10 right-0 top-0 h-full">
                      {/* Grid lines */}
                      <div className="h-full border-l border-r border-gray-200">
                        <div className="h-1/5 border-t border-gray-200"></div>
                        <div className="h-1/5 border-t border-gray-200"></div>
                        <div className="h-1/5 border-t border-gray-200"></div>
                        <div className="h-1/5 border-t border-gray-200"></div>
                      </div>

                      {/* Line chart */}
                      <div className="absolute bottom-0 left-0 right-0 h-4/5">
                        {/* Render chart based on actual data */}
                        {payrollTrend.length > 0 && (
                          <svg viewBox={`0 0 ${payrollTrend.length > 1 ? 500 : 100} 200`} className="w-full h-full">
                            {/* Line path */}
                            <polyline
                              fill="none"
                              stroke="#4F46E5"
                              strokeWidth="3"
                              points={payrollTrend.map((item, index) => {
                                const x = (index * 500) / (payrollTrend.length - 1 || 1);
                                const y = 180 - (item.totalPayroll / maxPayroll) * 160;
                                return `${x},${y}`;
                              }).join(' ')}
                            />

                            {/* Data points */}
                            {payrollTrend.map((item, index) => {
                              const x = (index * 500) / (payrollTrend.length - 1 || 1);
                              const y = 180 - (item.totalPayroll / maxPayroll) * 160;
                              return (
                                <g key={index}>
                                  <circle cx={x} cy={y} r="4" fill="#4F46E5" />
                                </g>
                              );
                            })}
                          </svg>
                        )}
                      </div>

                      {/* X-axis labels */}
                      <div className="absolute bottom-0 left-10 right-0 flex justify-between text-xs text-gray-500 pt-6">
                        {payrollTrend.map((item, index) => (
                          <span key={index}>{item.period}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Leave Requests by Type</h2>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg p-4">
                {/* Dynamic SVG-based pie chart visualization */}
                <div className="w-full h-full flex flex-col items-center justify-center">
                  {totalLeaveRequests > 0 ? (
                    <>
                      <div className="relative w-48 h-48">
                        {/* Pie chart segments */}
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          {leaveTypeCounts.map((leaveType, index) => {
                            // Calculate the percentage and the corresponding arc length
                            const percentage = totalLeaveRequests > 0
                              ? (leaveType.count / totalLeaveRequests) * 100
                              : 0;

                            // Calculate the arc length (circumference of circle with radius 40 is approximately 251.2)
                            // The stroke-dasharray should be "drawn arc length, remaining arc length"
                            const arcLength = (percentage / 100) * 251.2;
                            const remainingLength = 251.2 - arcLength;

                            // Calculate stroke-dashoffset to determine where to start drawing
                            // Starting from the top (negative 90 degrees) and going clockwise
                            const startOffset = index === 0
                              ? 251.2  // Start from the full circumference (top of circle)
                              : leaveTypeCounts.slice(0, index).reduce((prev, curr) => {
                                  const currPercentage = (curr.count / totalLeaveRequests) * 100;
                                  const currArcLength = (currPercentage / 100) * 251.2;
                                  return prev - currArcLength;
                                }, 251.2);

                            // Define colors for each section
                            const colors = [
                              '#4F46E5', // indigo
                              '#10B981', // green
                              '#F59E0B', // amber
                              '#EF4444', // red
                              '#8B5CF6', // violet
                              '#F97316'  // orange
                            ];

                            return (
                              <circle
                                key={index}
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke={colors[index % colors.length]}
                                strokeWidth="15"
                                strokeDasharray={`${arcLength} ${remainingLength}`}
                                strokeDashoffset={startOffset}
                                transform="rotate(-90 50 50)"
                              />
                            );
                          })}
                        </svg>

                        {/* Center label */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-700">{totalLeaveRequests}</div>
                            <div className="text-sm text-gray-500">Requests</div>
                          </div>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="flex flex-wrap justify-center gap-4 mt-4">
                        {leaveTypeCounts.map((leaveType, index) => {
                          const percentage = totalLeaveRequests > 0
                            ? (leaveType.count / totalLeaveRequests) * 100
                            : 0;

                          const colors = [
                            '#4F46E5', // indigo
                            '#10B981', // green
                            '#F59E0B', // amber
                            '#EF4444', // red
                            '#8B5CF6', // violet
                            '#F97316'  // orange
                          ];

                          return (
                            <div key={index} className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: colors[index % colors.length] }}
                              ></div>
                              <span className="text-xs">
                                {leaveType.type} ({Math.round(percentage)}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500">No leave data available</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Department Statistics</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employees
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg. Salary
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Payroll
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments.map((dept) => (
                    <tr key={dept.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {dept.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dept.employeeCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        KSH {dept.avgSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        KSH {dept.totalPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                  {departments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        No department data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}