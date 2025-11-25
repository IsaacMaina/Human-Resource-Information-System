import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authconfig';
import { prisma } from '../../../lib/prisma';

// Disable static generation for this page since it accesses the database
export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Finance Dashboard - University HRIS",
  description: "Financial management dashboard for processing payroll, payments, and managing financial records",
};

interface RecentTransaction {
  id: string;
  month: Date;
  netPayroll: number;
  status: string;
}

interface FinancialSummary {
  totalPayrollYTD: number;
  averageMonthlyPayroll: number;
  totalDeductionsYTD: number;
  netSalaryYTD: number;
}

async function getFinanceDashboardData(): Promise<{
  recentTransactions: RecentTransaction[],
  financialSummary: FinancialSummary
}> {
  // Get recent payrolls (last 3 months)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const recentPayrolls = await prisma.payslip.findMany({
    where: {
      month: {
        gte: new Date(currentYear, Math.max(0, currentMonth - 2), 1), // Last 3 months
      }
    },
    select: {
      month: true,
      netPay: true,
    },
    orderBy: { month: 'desc' },
    take: 3
  });

  // Group by month and calculate totals
  const groupedPayrolls = recentPayrolls.reduce((acc, payslip) => {
    const monthKey = payslip.month.toISOString().substring(0, 7); // YYYY-MM
    if (!acc[monthKey]) {
      acc[monthKey] = { month: payslip.month, total: 0 };
    }
    acc[monthKey].total += payslip.netPay;
    return acc;
  }, {} as Record<string, { month: Date; total: number }>);

  const recentTransactions = Object.entries(groupedPayrolls)
    .map(([month, data]) => ({
      id: month,
      month: data.month,
      netPayroll: data.total,
      status: 'Completed' // Assuming all past payrolls are completed
    }))
    .sort((a, b) => b.month.getTime() - a.month.getTime());

  // Calculate financial summary
  const yearToDatePayrolls = await prisma.payslip.aggregate({
    where: {
      month: {
        gte: new Date(currentYear, 0, 1), // Start of current year
      }
    },
    _sum: {
      netPay: true,
      grossSalary: true,
    }
  });

  // Calculate average monthly payroll
  const monthsCount = Math.min(currentMonth + 1, 12); // How many months have passed this year
  const averageMonthlyPayroll = yearToDatePayrolls._sum.netPay
    ? yearToDatePayrolls._sum.netPay / monthsCount
    : 0;

  // Calculate total deductions as the difference between gross and net
  const totalDeductionsYTD = (yearToDatePayrolls._sum.grossSalary || 0) - (yearToDatePayrolls._sum.netPay || 0);

  const financialSummary: FinancialSummary = {
    totalPayrollYTD: yearToDatePayrolls._sum.netPay || 0,
    averageMonthlyPayroll: averageMonthlyPayroll,
    totalDeductionsYTD: totalDeductionsYTD,
    netSalaryYTD: yearToDatePayrolls._sum.netPay || 0
  };

  return { recentTransactions, financialSummary };
}

export default async function FinanceDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== 'FINANCE' && session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
    redirect('/auth/login');
  }

  const { recentTransactions, financialSummary } = await getFinanceDashboardData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Finance Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/finance/payroll/new" className="bg-blue-50 border border-blue-100 rounded-lg p-6 text-center hover:bg-blue-400 hover:text-white transition-colors">
              <div className="text-blue-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Process Payroll</h3>
              <p className="text-sm text-gray-500 mt-1">Run monthly payroll</p>
            </Link>

            <Link href="/finance/reconciliation" className="bg-green-50 border border-green-100 rounded-lg p-6 text-center hover:bg-green-400 hover:text-white transition-colors">
              <div className="text-green-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Reconciliation</h3>
              <p className="text-sm text-gray-500 mt-1">Reconcile transactions</p>
            </Link>

            <Link href="/finance/banks" className="bg-yellow-50 border border-yellow-100 rounded-lg p-6 text-center hover:bg-yellow-400 hover:text-white transition-colors">
              <div className="text-yellow-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Bank Integration</h3>
              <p className="text-sm text-gray-500 mt-1">Manage bank accounts</p>
            </Link>

            <Link href="/finance/payments" className="bg-purple-50 border border-purple-100 rounded-lg p-6 text-center hover:bg-purple-400 hover:text-white transition-colors">
              <div className="text-purple-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m4-6h6m0 0v6m0-6l-4 4-4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
              <p className="text-sm text-gray-500 mt-1">Track transactions</p>
            </Link>

            {/* Employee Functions card for Finance users to access employee features */}
            <Link href="/employee/functions" className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 text-center hover:bg-indigo-400 hover:text-white transition-colors">
              <div className="text-indigo-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Employee Functions</h3>
              <p className="text-sm text-gray-500 mt-1">Access employee features</p>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h2>
              <div className="space-y-4">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex justify-between items-center border-b pb-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {transaction.month.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {transaction.month.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          KSH {transaction.netPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-green-600">{transaction.status}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No recent transactions</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Payroll (YTD)</span>
                  <span className="font-medium">
                    KSH {financialSummary.totalPayrollYTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Monthly Payroll</span>
                  <span className="font-medium">
                    KSH {financialSummary.averageMonthlyPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Deductions (YTD)</span>
                  <span className="font-medium">
                    KSH {financialSummary.totalDeductionsYTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Salary (YTD)</span>
                  <span className="font-medium">
                    KSH {financialSummary.netSalaryYTD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}