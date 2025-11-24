'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Employee {
  id: string;
  name: string;
  staffNo: string;
  position: string;
  department: string;
  email: string;
  salary: number;
  bank: string; // This is the bank name, not ID
  bankAccNo?: string;
  phone?: string;
  paymentStatus?: 'pending' | 'processing' | 'success' | 'failed';
}

export default function NewPayrollPage() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'mpesa'>('bank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [supportedBanks, setSupportedBanks] = useState<{code: string, name: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/admin/employees');
        if (response.ok) {
          const data = await response.json();
          setEmployees(data.map((emp: Employee) => ({ ...emp, paymentStatus: 'pending' })));
        } else {
          toast.error('Failed to fetch employees');
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast.error('Error fetching employees');
      }
    };

    if (session) {
      fetchEmployees();
    }
  }, [session]);

  // Fetch supported banks
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch('/api/admin/banks');
        if (response.ok) {
          const data = await response.json();
          setSupportedBanks(data);
        } else {
          console.error('Failed to fetch banks');
        }
      } catch (error) {
        console.error('Error fetching banks:', error);
      }
    };

    fetchBanks();
  }, []);

  // Handle employee selection
  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId) 
        : [...prev, employeeId]
    );
  };

  // Handle select all employees (only eligible employees based on payment method and search)
  const toggleSelectAll = () => {
    if (selectedEmployees.length === eligibleEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(eligibleEmployees.map(emp => emp.id));
    }
  };

  // Process payroll
  const processPayroll = async (employeeIds: string[]) => {
    if (employeeIds.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    setIsProcessing(true);
    setEmployees(employees.map(e => employeeIds.includes(e.id) ? { ...e, paymentStatus: 'processing' } : e));

    try {
      const selectedEmployeeDetails = employees.filter(emp => employeeIds.includes(emp.id));

      // Filter to only employees that have the required information for the selected payment method
      const validEmployees = selectedEmployeeDetails.filter(emp => {
        if (paymentMethod === 'mpesa') {
          return emp.phone && emp.phone !== 'N/A' && emp.phone !== null && String(emp.phone).trim().length > 0;
        } else { // bank
          return emp.bankAccNo && emp.bankAccNo !== 'N/A' && emp.bank && emp.bank !== 'N/A';
        }
      });

      if (validEmployees.length === 0) {
        toast.error('No valid employees found for the selected payment method');
        setEmployees(employees.map(e => employeeIds.includes(e.id) ? { ...e, paymentStatus: 'failed' } : e));
        setIsProcessing(false);
        return;
      }

      // Report if some employees were skipped
      if (validEmployees.length < selectedEmployeeDetails.length) {
        const skippedCount = selectedEmployeeDetails.length - validEmployees.length;
        toast.warning(`${skippedCount} employee(s) were skipped due to missing payment information`);
      }

      const payments = validEmployees.map(emp => ({
        employeeId: emp.id,
        amount: Number(emp.salary), // Ensure amount is a number
        bankId: emp.bank,
        bankAccNo: emp.bankAccNo,
        phone: emp.phone,
        paymentMethod: paymentMethod,
      }));

      const response = await fetch('/api/admin/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employees: payments,
          month: new Date(selectedMonth),
          description: `Salary for ${new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Payroll processing initiated for ${result.summary.successful} employees`);
        setEmployees(employees.map(e =>
          validEmployees.some(ve => ve.id === e.id) ? { ...e, paymentStatus: 'success' } :
          employeeIds.includes(e.id) ? { ...e, paymentStatus: 'failed' } : e
        ));
        setSelectedEmployees([]);
      } else {
        toast.error(result.error || 'Failed to process payroll');
        setEmployees(employees.map(e => employeeIds.includes(e.id) ? { ...e, paymentStatus: 'failed' } : e));
      }
    } catch (error) {
      console.error('Error processing payroll:', error);
      toast.error('Error processing payroll');
      setEmployees(employees.map(e => employeeIds.includes(e.id) ? { ...e, paymentStatus: 'failed' } : e));
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter employees based on payment method and search query
  const eligibleEmployees = employees.filter(emp => {
    const matchesPaymentMethod = paymentMethod === 'bank'
      ? emp.bank && emp.bank !== 'N/A' && emp.bankAccNo && emp.bankAccNo !== 'N/A'
      : emp.phone && emp.phone !== 'N/A' && emp.phone !== null && String(emp.phone).trim().length > 0;

    if (!matchesPaymentMethod) return false;

    const query = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(query) ||
      emp.staffNo.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query)
    );
  });

  const totalAmount = eligibleEmployees
    .filter(emp => selectedEmployees.includes(emp.id))
    .reduce((sum, emp) => sum + emp.salary, 0);

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle>Process New Payroll</CardTitle>
          <CardDescription>Process salary payments for employees using Safaricom Daraja for M-Pesa and Flutterwave for bank transfers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Panel - Selection Controls */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="month">Select Month</Label>
                <Input
                  type="month"
                  id="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  min="2020-01"
                  max={new Date().toISOString().slice(0, 7)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(value: 'bank' | 'mpesa') => setPaymentMethod(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search">Search Employees</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by name, staff no, or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Selected Employees</Label>
                  <span className="text-sm text-muted-foreground">
                    {selectedEmployees.length} of {eligibleEmployees.length} selected
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedEmployees.length === eligibleEmployees.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label>Summary</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">Selected: {selectedEmployees.length} employees</p>
                  <p className="text-sm">Total Amount: KES {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-sm mt-1">Method: {paymentMethod === 'bank' ? 'Bank Transfer' : 'M-Pesa'}</p>
                </div>
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => processPayroll(selectedEmployees)} 
                disabled={isProcessing || selectedEmployees.length === 0}
              >
                {isProcessing ? 'Processing...' : `Process Payroll for ${selectedEmployees.length} Employees`}
              </Button>
            </div>
            
            {/* Right Panel - Employee List */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium mb-4">
                Employees ({paymentMethod === 'bank' ? 'With Bank Details' : 'With Phone Numbers'})
              </h3>
              {/* Responsive table container */}
              <div className="border rounded-md overflow-x-auto">
                {/* Desktop: Table view */}
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">
                          <input
                            type="checkbox"
                            checked={selectedEmployees.length === eligibleEmployees.length && eligibleEmployees.length > 0}
                            onChange={toggleSelectAll}
                            className="mr-2"
                          />
                          Select
                        </th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Salary</th>
                        {paymentMethod === 'bank' ? <th className="p-2 text-left">Bank Details</th> : <th className="p-2 text-left">Phone</th>}
                        <th className="p-2 text-left">Status</th>
                        <th className="p-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eligibleEmployees.map((employee) => (
                        <tr
                          key={employee.id}
                          className={`border-t ${selectedEmployees.includes(employee.id) ? 'bg-blue-50' : ''}`}
                        >
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={selectedEmployees.includes(employee.id)}
                              onChange={() => toggleEmployeeSelection(employee.id)}
                            />
                          </td>
                          <td className="p-2">
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-muted-foreground">{employee.staffNo}</div>
                          </td>
                          <td className="p-2">KES {employee.salary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="p-2">
                            {paymentMethod === 'bank'
                              ? <>{employee.bankAccNo} ({employee.bank})</>
                              : employee.phone}
                          </td>
                          <td className="p-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              employee.paymentStatus === 'success' ? 'bg-green-100 text-green-800' :
                              employee.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                              employee.paymentStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {employee.paymentStatus}
                            </span>
                          </td>
                          <td className="p-2">
                            <Button
                              size="sm"
                              onClick={() => processPayroll([employee.id])}
                              disabled={isProcessing || employee.paymentStatus === 'success'}
                            >
                              {isProcessing && selectedEmployees.includes(employee.id) ? 'Processing...' : 'Payout'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: Card view */}
                <div className="md:hidden">
                  {eligibleEmployees.length > 0 ? (
                    eligibleEmployees.map((employee) => (
                      <div
                        key={employee.id}
                        className={`border-b p-4 last:border-b-0 ${selectedEmployees.includes(employee.id) ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-start">
                            <input
                              type="checkbox"
                              checked={selectedEmployees.includes(employee.id)}
                              onChange={() => toggleEmployeeSelection(employee.id)}
                              className="mt-1 mr-2"
                            />
                            <div>
                              <div className="font-medium">{employee.name}</div>
                              <div className="text-sm text-muted-foreground">{employee.staffNo}</div>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            employee.paymentStatus === 'success' ? 'bg-green-100 text-green-800' :
                            employee.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                            employee.paymentStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {employee.paymentStatus}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Salary</p>
                            <p className="font-medium">KES {employee.salary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{paymentMethod === 'bank' ? 'Bank Details' : 'Phone'}</p>
                            <p className="font-medium">
                              {paymentMethod === 'bank'
                                ? `${employee.bankAccNo} (${employee.bank})`
                                : employee.phone}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => processPayroll([employee.id])}
                            disabled={isProcessing || employee.paymentStatus === 'success'}
                          >
                            {isProcessing && selectedEmployees.includes(employee.id) ? 'Processing...' : 'Payout'}
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No employees available for {paymentMethod === 'bank' ? 'bank transfers' : 'M-Pesa payments'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
