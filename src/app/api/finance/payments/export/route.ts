import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authconfig';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend the session type to include our custom properties
interface CustomSession {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || !session.user.id || (session.user.role !== 'ADMIN' && session.user.role !== 'FINANCE' && session.user.role !== 'HR')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get search and filter parameters from query string
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'excel';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const status = url.searchParams.get('status');
    const department = url.searchParams.get('department');
    const position = url.searchParams.get('position');
    const employeeId = url.searchParams.get('employeeId');

    // Build query conditions
    const whereClause: any = {};
    
    if (startDate || endDate) {
      whereClause.month = {};
      if (startDate) {
        whereClause.month.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.month.lte = new Date(endDate);
      }
    }
    
    if (status) {
      whereClause.paid = status === 'paid';
    }

    // Query payslips with related employee data
    const payslips = await prisma.payslip.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            user: true,
            bank: true,
          },
        },
      },
      orderBy: {
        month: 'desc',
      },
    });

    // Format payslip data for export
    const formattedPayslips = payslips.map(payslip => ({
      id: payslip.id,
      employeeName: payslip.employee?.user?.name || 'N/A',
      employeeId: payslip.employeeId,
      staffNo: payslip.employee?.staffNo || 'N/A',
      position: payslip.employee?.position || 'N/A',
      department: payslip.employee?.department || 'N/A',
      bank: payslip.employee?.bank?.name || 'N/A',
      bankAccNo: payslip.employee?.bankAccNo || 'N/A',
      month: payslip.month.toLocaleString('default', { month: 'long', year: 'numeric' }),
      grossSalary: payslip.grossSalary,
      netPay: payslip.netPay,
      paid: payslip.paid ? 'Yes' : 'No',
      createdAt: payslip.createdAt.toLocaleDateString(),
      ...payslip.deductions // Spread the deductions object properties
    }));

    if (format === 'pdf') {
      // Generate PDF
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Financial Payments Report', 14, 20);
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      
      // Add a table with the data
      const tableColumn = [
        "Employee", "Position", "Department", "Bank", "Gross Salary", "Net Pay", "Status", "Date"
      ];
      const tableRows = formattedPayslips.map(item => [
        item.employeeName,
        item.position,
        item.department,
        item.bank,
        `KSH ${item.grossSalary.toFixed(2)}`,
        `KSH ${item.netPay.toFixed(2)}`,
        item.paid,
        item.createdAt
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
      });

      // Return the PDF as a response
      const pdfBytes = doc.output('blob');
      
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=financial-payments-report-${new Date().toISOString().slice(0, 10)}.pdf`,
        },
      });
    } else if (format === 'excel' || format === 'xlsx') {
      // Generate Excel
      const worksheet = XLSX.utils.json_to_sheet(formattedPayslips);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Financial Payments');
      
      // Generate buffer
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      return new Response(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=financial-payments-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
        },
      });
    } else if (format === 'csv') {
      // Generate CSV
      const csvContent = [
        Object.keys(formattedPayslips[0]),
        ...formattedPayslips.map(row => Object.values(row))
      ]
        .map(row => row.join(','))
        .join('\n');
      
      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=financial-payments-report-${new Date().toISOString().slice(0, 10)}.csv`,
        },
      });
    } else {
      // Default to JSON
      return new Response(JSON.stringify(formattedPayslips), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error exporting financial payments:', error);
    return new Response(JSON.stringify({ error: 'Failed to export financial payments' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}