'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Payslip {
  id: string;
  employeeId: string;
  employeeName: string;
  staffNo: string;
  month: string;
  grossSalary: number;
  deductions: Record<string, number>; // Changed from Json to Record for TypeScript
  netPay: number;
  paid: boolean;
  payoutRef?: string;
  createdAt: string;
  employee: {
    user: {
      name: string;
    };
    staffNo: string;
    position?: string;
    department?: string;
  };
}

export default function PayslipDetailPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (status === 'authenticated' && id) {
      fetchPayslipDetail();
    }
  }, [status, id]);

  const fetchPayslipDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employee/payslips/${id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch payslip');
      }

      const data = await response.json();
      setPayslip(data);
    } catch (err) {
      console.error('Error fetching payslip:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payslip');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payslip...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            onClick={() => window.history.back()}
            className="bg-[#006837] hover:bg-[#004B2E]"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!payslip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Payslip not found</p>
          <Button
            onClick={() => window.history.back()}
            className="mt-4 bg-[#006837] hover:bg-[#004B2E]"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Calculate total deductions
  const totalDeductions = Object.values(payslip.deductions || {}).reduce((sum, value) => sum + value, 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  // Calculate total deductions
  const totalDeductions = Object.values(payslip.deductions || {}).reduce((sum, value) => sum + value, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Payslip Detail</h1>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
          >
            Back to Payslips
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader className="border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Payslip for {new Date(payslip.month).toLocaleString('default', { month: 'long', year: 'numeric' })}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Employee: {payslip.employee.user.name} ({payslip.employee.staffNo})
                </p>
              </div>
              <Badge variant={payslip.paid ? 'default' : 'secondary'}>
                {payslip.paid ? 'Paid' : 'Pending'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Employee Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{payslip.employee.user.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Staff No:</span>
                    <span className="font-medium">{payslip.employee.staffNo}</span>
                  </div>
                  {payslip.employee.position && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Position:</span>
                      <span className="font-medium">{payslip.employee.position}</span>
                    </div>
                  )}
                  {payslip.employee.department && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium">{payslip.employee.department}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payslip Month:</span>
                    <span className="font-medium">{new Date(payslip.month).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Generated:</span>
                    <span className="font-medium">{new Date(payslip.createdAt).toLocaleString()}</span>
                  </div>
                  {payslip.payoutRef && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payout Ref:</span>
                      <span className="font-mono font-medium">{payslip.payoutRef}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Earnings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gross Salary</span>
                  <span className="font-medium">{formatCurrency(payslip.grossSalary)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deductions Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payslip.deductions && Object.entries(payslip.deductions).length > 0 ? (
                  Object.entries(payslip.deductions).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-medium">-{formatCurrency(value)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-center py-4">No deductions</div>
                )}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total Deductions</span>
                  <span>-{formatCurrency(totalDeductions)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Net Pay Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Net Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(payslip.netPay)}
                </div>
                <p className="text-gray-500 mt-2">Net Amount</p>
                <Badge variant={payslip.paid ? 'default' : 'secondary'} className="mt-3">
                  Status: {payslip.paid ? 'PAID' : 'PENDING'}
                </Badge>
              </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={() => window.print()}
          >
            Print Payslip
          </Button>
          <Button
            className="bg-[#006837] hover:bg-[#004B2E]"
            onClick={() => {
              // In a real implementation, you would generate a PDF or DOC file
              window.open(`/api/employee/payslips/${payslip.id}/export?format=pdf`, '_blank');
            }}
          >
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
}