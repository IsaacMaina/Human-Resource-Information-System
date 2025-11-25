import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/authconfig';
import { prisma } from '../../../lib/prisma';

// Disable static generation for this page since it accesses the database
export const dynamic = 'force-dynamic';

interface TaxDeduction {
  id: string;
  employeeId: string;
  month: Date;
  paye: number;
  nhif: number;
  nssf: number;
  period: string; // "YYYY-MM"
}

interface TaxSummary {
  totalPaye: number;
  totalNhif: number;
  totalNssf: number;
}

interface MonthlyTaxBreakdown {
  period: string;
  paye: number;
  nhif: number;
  nssf: number;
  total: number;
  status: 'Submitted' | 'Pending' | 'Overdue';
}

async function getTaxData(): Promise<{
  summary: TaxSummary;
  monthlyBreakdown: MonthlyTaxBreakdown[]
}> {
  // Get tax data for the current year
  const currentYear = new Date().getFullYear();

  // Get all payslips for the current year to calculate tax totals
  const payslips = await prisma.payslip.findMany({
    where: {
      month: {
        gte: new Date(currentYear, 0, 1),  // Start of current year
        lt: new Date(currentYear + 1, 0, 1), // Start of next year
      }
    },
    include: {
      employee: {
        select: {
          nhifRate: true,
          nssfRate: true,
        }
      }
    }
  });

  // Calculate tax totals from payslip data
  let totalPaye = 0;
  let totalNhif = 0;
  let totalNssf = 0;

  for (const payslip of payslips) {
    // Calculate PAYE as a percentage of salary (simplified calculation)
    // In a real app, this would come from actual tax calculations
    const paye = payslip.grossSalary * 0.3; // Simplified 30% tax rate

    // Calculate NHIF as stored in employee record or default calculation
    const nhif = payslip.employee?.nhifRate || 0;

    // Calculate NSSF as stored in employee record or default calculation
    const nssf = payslip.employee?.nssfRate || 0;

    totalPaye += paye;
    totalNhif += nhif;
    totalNssf += nssf;
  }

  // Get monthly tax breakdown for the last few months
  const monthlyBreakdown: MonthlyTaxBreakdown[] = [];

  // Calculate for the last 3 months
  const monthsToCalculate = 3;
  for (let i = monthsToCalculate - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);

    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const monthlyPayslips = await prisma.payslip.findMany({
      where: {
        month: {
          gte: monthStart,
          lt: new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate() + 1),
        }
      },
      include: {
        employee: {
          select: {
            nhifRate: true,
            nssfRate: true,
          }
        }
      }
    });

    let monthlyPaye = 0;
    let monthlyNhif = 0;
    let monthlyNssf = 0;

    for (const payslip of monthlyPayslips) {
      const paye = payslip.grossSalary * 0.3;
      const nhif = payslip.employee?.nhifRate || 0;
      const nssf = payslip.employee?.nssfRate || 0;

      monthlyPaye += paye;
      monthlyNhif += nhif;
      monthlyNssf += nssf;
    }

    const total = monthlyPaye + monthlyNhif + monthlyNssf;

    // Determine status based on submission date (simplified)
    const status = new Date() > new Date(date.getFullYear(), date.getMonth() + 1, 10)
      ? 'Pending'
      : 'Submitted';

    monthlyBreakdown.push({
      period: `${monthStart.toLocaleString('default', { month: 'long' })} ${monthStart.getFullYear()}`,
      paye: monthlyPaye,
      nhif: monthlyNhif,
      nssf: monthlyNssf,
      total: total,
      status: status as 'Submitted' | 'Pending' | 'Overdue'
    });
  }

  return {
    summary: {
      totalPaye,
      totalNhif,
      totalNssf
    },
    monthlyBreakdown
  };
}

export default async function TaxSummaryReport() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR' && session.user.role !== 'FINANCE')) {
    redirect('/auth/login');
  }

  const { summary, monthlyBreakdown } = await getTaxData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Tax Summary Report</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900">PAYE</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">KSH {summary.totalPaye.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-sm text-gray-500 mt-1">Year to Date</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900">NHIF</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">KSH {summary.totalNhif.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-sm text-gray-500 mt-1">Year to Date</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900">NSSF</h3>
              <p className="text-3xl font-bold text-purple-600 mt-2">KSH {summary.totalNssf.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-sm text-gray-500 mt-1">Year to Date</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Monthly Tax Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PAYE
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NHIF
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NSSF
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthlyBreakdown.map((month, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {month.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        KSH {month.paye.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        KSH {month.nhif.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        KSH {month.nssf.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        KSH {month.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          month.status === 'Submitted'
                            ? 'bg-green-100 text-green-800'
                            : month.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {month.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {monthlyBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        No tax data available for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Tax Compliance Status</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">PAYE Filing Status</span>
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {summary.totalPaye > 0 ? 'Up to date' : 'No data'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">NHIF Remittance</span>
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {summary.totalNhif > 0 ? 'Current' : 'No data'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">NSSF Remittance</span>
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {summary.totalNssf > 0 ? 'Current' : 'No data'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">KRA Compliance</span>
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Compliant
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