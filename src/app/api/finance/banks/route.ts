import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authconfig';

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

export async function POST(request: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || !session.user.id || (session.user.role !== 'ADMIN' && session.user.role !== 'FINANCE')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { name, code } = body;

    // Validate inputs
    if (!name || !code) {
      return new Response(JSON.stringify({ error: 'Bank name and code are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if a bank with this code already exists
    const existingBank = await prisma.bank.findUnique({
      where: { code: code },
    });

    if (existingBank) {
      return new Response(JSON.stringify({ error: 'A bank with this code already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create the new bank
    const newBank = await prisma.bank.create({
      data: {
        name: name.trim(),
        code: code.trim(),
      },
    });

    // Log the activity
    const sessionEmployee = await prisma.employee.findFirst({
      where: { userId: session.user?.id }
    });

    if (sessionEmployee) {
      await prisma.activity.create({
        data: {
          employeeId: sessionEmployee.id,
          actionType: 'CREATE',
          description: `Added new bank: ${name}`,
          module: 'BANKS',
          details: {
            action: 'ADD_BANK',
            bankId: newBank.id,
            bankName: newBank.name,
            bankCode: newBank.code
          }
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      bank: {
        id: newBank.id,
        name: newBank.name,
        code: newBank.code,
        createdAt: newBank.createdAt
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error adding bank:', error);
    return new Response(JSON.stringify({ error: 'Failed to add bank' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}