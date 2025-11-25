import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/authconfig';
import { prisma } from '../../../lib/prisma';

// Disable static generation for this page since it accesses the database
export const dynamic = 'force-dynamic';
import ExportDropdown from '../../../components/finance/ExportDropdown';
import PaymentList from '../../../components/finance/PaymentList';

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PaymentTransaction {
  id: string;
  payoutRef: string;
  date: Date;
  amount: number;
  bank: string;
  status: string;
  employees: number;
}

async function getPaymentTransactions(): Promise<PaymentTransaction[]> {
  // Get recent payslips with payout references to show as payment transactions
  const payslips = await prisma.payslip.findMany({
    where: {
      payoutRef: { not: null } // Only include payslips that have been paid out
    },
    select: {
      id: true,
      payoutRef: true,
      createdAt: true,
      netPay: true,
      employee: {
        select: {
          bank: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50 // Limit to last 50 transactions
  });

  // Group payslips by payout reference and date
  const groupedPayslips = payslips.reduce((acc, payslip) => {
    const ref = payslip.payoutRef || 'unknown';

    if (!acc[ref]) {
      acc[ref] = {
        id: payslip.id,
        payoutRef: ref,
        date: payslip.createdAt,
        amount: 0,
        bank: payslip.employee?.bank?.name || 'Unknown',
        status: 'completed', // Assuming all with payoutRef are completed
        employees: 0
      };
    }

    acc[ref].amount += payslip.netPay;
    acc[ref].employees += 1;

    return acc;
  }, {} as Record<string, PaymentTransaction>);

  return Object.values(groupedPayslips).sort((a, b) => b.date.getTime() - a.date.getTime());
}

interface FinancePaymentsProps {
  searchParams?: {
    [key: string]: string | string[] | undefined;
  };
}

export default async function FinancePayments({ searchParams }: FinancePaymentsProps) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== 'FINANCE' && session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
    redirect('/auth/login');
  }

  const payments = await getPaymentTransactions();

  // Server-side export functions that return downloadable links
  const exportToPdfUrl = `/api/finance/payments/export?format=pdf`;
  const exportToExcelUrl = `/api/finance/payments/export?format=excel`;
  const exportToDocUrl = `/api/finance/payments/export?format=doc`;

  // For server components, we'll use client components or API endpoints for exports
  // This is a more appropriate approach since we can't run export functions here

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
            <div>
              {exportToPdfUrl && exportToExcelUrl && exportToDocUrl && (
                <ExportDropdown
                  exportToPdfUrl={exportToPdfUrl}
                  exportToExcelUrl={exportToExcelUrl}
                  exportToDocUrl={exportToDocUrl}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
            <div className="flex-1">
              <div className="max-w-lg">
                <p className="text-gray-500 text-sm">Search functionality coming soon</p>
              </div>
            </div>

            <div className="flex space-x-2">
              <p className="text-gray-500 text-sm">Filters: All</p>
            </div>
          </div>

          <PaymentList payments={payments} />
        </div>
      </div>
    </div>
  );
}