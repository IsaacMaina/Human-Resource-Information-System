import { PrismaClient } from '@prisma/client';
import { processBankTransfer, verifyPayment } from './flutterwave';
import { initiateMpesaPayment, verifyMpesaPayment } from './daraja';

// In a library that could be used by multiple API routes,
// it's better to accept prisma instance as a parameter or create a simple instance
// For this implementation, we'll create a new instance (in a real app you'd want a singleton)
const prisma = new PrismaClient();

interface EmployeePayment {
  employeeId: string;
  amount: number;
  bankId?: string;
  bankAccNo?: string;
  phone?: string;
  paymentMethod: 'bank' | 'mpesa';
}

interface ProcessPayrollResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  payoutRef?: string;
}

/**
 * Process payroll payment for an employee
 * @param employeePayment - Payment details for the employee
 * @param month - The month for which payroll is being processed
 * @param description - Payment description
 * @returns Result of the payment processing
 */
export async function processPayrollPayment(
  employeePayment: EmployeePayment,
  month: Date,
  description: string
): Promise<ProcessPayrollResult> {
  try {
    // Get employee details
    const employee = await prisma.employee.findUnique({
      where: { id: employeePayment.employeeId },
      include: {
        user: true,
        bank: true
      }
    });

    if (!employee) {
      throw new Error(`Employee with ID ${employeePayment.employeeId} not found`);
    }

    let transactionId: string | undefined;
    let payoutRef: string | undefined;

    if (employeePayment.paymentMethod === 'bank') {
      if (!employeePayment.bankAccNo) {
        throw new Error(`Bank account number required for bank transfer`);
      }

      // Get bank code from bank details
      let bankCode = employeePayment.bankId;
      if (employee?.bank) {
        bankCode = employee.bank.code || employee.bank.name; // Use name as fallback if code not available
      }

      if (!bankCode) {
        throw new Error(`Bank code not found for employee ${employeePayment.employeeId}`);
      }

      // Validate amount before processing
      const paymentAmount = employeePayment.amount;
      if (typeof paymentAmount !== 'number' || paymentAmount <= 0) {
        throw new Error(`Invalid payment amount for employee ${employeePayment.employeeId}: ${paymentAmount}. Amount must be a positive number.`);
      }

      // Process bank transfer via Flutterwave
      const response = await processBankTransfer(
        paymentAmount,
        employeePayment.bankAccNo!,
        bankCode,
        `${description} for ${month.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        employee.user?.name || employee.staffNo || 'Employee'
      );

      // Handle different possible response structures from Flutterwave SDK
      const responseData = response.data || response.body?.data || response;
      transactionId = responseData?.id;
      payoutRef = responseData?.reference || responseData?.id || responseData?.flwRef; // Use reference if available, otherwise transaction ID
    } else if (employeePayment.paymentMethod === 'mpesa') {
      if (!employeePayment.phone) {
        throw new Error(`Phone number required for M-Pesa payment`);
      }

      // Clean the phone number before sending to M-Pesa API
      const cleanPhone = employeePayment.phone
        .replace(/\s+/g, '')           // Remove spaces
        .replace(/\D/g, '')            // Remove non-digits
        .replace(/^(\+?254)/, '254');  // Ensure correct format

      // Process M-Pesa payment via Daraja
      const response = await initiateMpesaPayment(
        employeePayment.amount,
        cleanPhone,
        `${description} for ${month.toLocaleString('default', { month: 'long', year: 'numeric' })}`
      );

      // Handle Daraja API response
      transactionId = response.ConversationID;
      payoutRef = response.ConversationID;
    } else {
      throw new Error(`Invalid payment method: ${employeePayment.paymentMethod}`);
    }

    // Find or create a payslip record for the employee and month
    let payslip = await prisma.payslip.findFirst({
      where: {
        employeeId: employeePayment.employeeId,
        month: {
          gte: new Date(month.getFullYear(), month.getMonth(), 1),
          lt: new Date(month.getFullYear(), month.getMonth() + 1, 1),
        },
      },
    });

    if (payslip) {
      // If a payslip already exists, update it
      await prisma.payslip.update({
        where: { id: payslip.id },
        data: {
          paid: true,
          payoutRef: payoutRef,
        },
      });
    } else {
      // If no payslip exists, create a new one with default values
      // We'll get the employee's basic salary and calculate net pay based on the amount paid
      const employeeDetails = await prisma.employee.findUnique({
        where: { id: employeePayment.employeeId }
      });

      if (employeeDetails) {
        await prisma.payslip.create({
          data: {
            employeeId: employeePayment.employeeId,
            month: new Date(month.getFullYear(), month.getMonth(), 1),
            grossSalary: employeeDetails.salary,
            deductions: employeeDetails.salary - employeePayment.amount, // Deductions = gross - net paid
            netPay: employeePayment.amount,
            paid: true,
            payoutRef: payoutRef,
          }
        });
      }
    }

    // Create a payout record to track the transaction
    await prisma.payout.create({
      data: {
        ref: payoutRef || `PAYOUT_${Date.now()}`,
        employeeId: employeePayment.employeeId,
        amount: employeePayment.amount,
        status: 'PROCESSING', // Will be updated based on verification
        type: 'SALARY',
        bank: employeePayment.paymentMethod === 'bank' ? (employeePayment.bankId || employee.bank?.name) : 'M-Pesa',
        transactionId: transactionId,
      },
    });

    // Send notification to employee about payment
    try {
      await prisma.notification.create({
        data: {
          title: 'Salary Payment Processed',
          message: `Your salary for ${month.toLocaleString('default', { month: 'long', year: 'numeric' })} has been processed.`,
          type: 'PAYMENT',
          recipientId: employee.userId,
        },
      });
    } catch (notificationError) {
      console.error('Error creating employee notification:', notificationError);
    }

    return {
      success: true,
      transactionId,
      payoutRef,
    };
  } catch (error) {
    console.error('Error processing payroll payment:', error);
    
    // Log error for admin notification
    // Find admin user to send notification to
    try {
      const adminUser = await prisma.user.findFirst({
        where: {
          role: 'ADMIN'
        },
        select: {
          id: true
        }
      });

      if (adminUser) {
        await prisma.notification.create({
          data: {
            title: 'Payroll Payment Failed',
            message: `Payment failed for employee ${employeePayment.employeeId}: ${(error as Error).message}`,
            type: 'ERROR',
            recipientId: adminUser.id,
          },
        });
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
    }
    
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Process bulk payroll payments for multiple employees
 * @param employeesPayments - Array of employee payment details
 * @param month - The month for which payroll is being processed
 * @param description - Payment description
 * @returns Results of all payment processing attempts
 */
export async function processBulkPayroll(
  employeesPayments: EmployeePayment[],
  month: Date,
  description: string
): Promise<ProcessPayrollResult[]> {
  const results: ProcessPayrollResult[] = [];

  // Process each payment individually
  for (const employeePayment of employeesPayments) {
    // Ensure amount is properly converted to number
    const validatedPayment = {
      ...employeePayment,
      amount: typeof employeePayment.amount === 'string'
        ? parseFloat(employeePayment.amount)
        : Number(employeePayment.amount)
    };

    const result = await processPayrollPayment(validatedPayment, month, description);
    results.push(result);
  }

  return results;
}

/**
 * Verify the status of a processed payment
 * @param payoutRef - The payout reference to verify
 * @returns Verification result
 */
export async function verifyPayrollPayment(payoutRef: string) {
  try {
    const payout = await prisma.payout.findUnique({
      where: { ref: payoutRef },
    });

    if (!payout) {
      throw new Error(`Payout with reference ${payoutRef} not found`);
    }

    let verification;
    let status = payout.status;

    if (payout.bank === 'M-Pesa') {
      verification = await verifyMpesaPayment(payout.transactionId!);
      if (verification.Result.ResultCode === 0) {
        status = 'SUCCESS';
      } else {
        status = 'FAILED';
      }
    } else {
      try {
        verification = await verifyPayment(payout.transactionId!);
        const verificationData = verification.data || verification.body?.data || verification;
        if (verificationData?.status === 'success') {
          status = 'SUCCESS';
        } else if (verificationData?.status === 'failed') {
          status = 'FAILED';
        } else {
          status = 'PENDING'; // Default to pending if status is unclear
        }
      } catch (error) {
        console.error('Error verifying Flutterwave payment:', error);
        status = 'FAILED'; // Mark as failed if verification fails
      }
    }

    await prisma.payout.update({
      where: { ref: payoutRef },
      data: { status },
    });

    // Update payslip status if payment was successful
    if (status === 'SUCCESS') {
      const payslip = await prisma.payslip.findFirst({
        where: {
          payoutRef: payoutRef,
        },
      });

      if (payslip) {
        await prisma.payslip.update({
          where: { id: payslip.id },
          data: { paid: true },
        });
      }
    }

    return {
      success: true,
      status: status,
      ...verification,
    };
  } catch (error) {
    console.error('Error verifying payroll payment:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Process payroll reconciliation
 * @param month - The month to reconcile
 */
export async function reconcilePayroll(month: Date) {
  try {
    // Find all payouts for the specified month that are still processing
    const payouts = await prisma.payout.findMany({
      where: {
        type: 'SALARY',
        createdAt: {
          gte: new Date(month.getFullYear(), month.getMonth(), 1),
          lt: new Date(month.getFullYear(), month.getMonth() + 1, 1),
        },
        status: 'PROCESSING',
      },
    });

    // Verify each pending payout
    for (const payout of payouts) {
      await verifyPayrollPayment(payout.ref);
    }
  } catch (error) {
    console.error('Error reconciling payroll:', error);
    throw error;
  }
}