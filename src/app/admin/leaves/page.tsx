'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import DataTable from '@/components/admin/common/DataTable';
import { toast } from 'sonner';
import { getUserInitials, getInitialsColor } from '@/lib/utils';

interface LeaveRequest {
  id: string;
  employeeName: string;
  staffNo: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  appliedAt: string;
  reason: string;
}

export default function AdminLeaves() {
  const { data: session, status } = useSession();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState(''); // For debounced search
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [requestsPerPage, setRequestsPerPage] = useState(10);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({
    key: 'appliedAt', // Sort by applied date by default
    direction: 'desc', // Newest first
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
  }, [status]);

  if (status === 'unauthenticated') {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    return null;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leave requests...</p>
        </div>
      </div>
    );
  }

  // Check if user has admin or HR role
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'HR') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        const response = await fetch('/api/admin/leaves', {
          credentials: 'include',
        });

        // Check if the response is ok and has json content
        if (!response.ok) {
          console.error('Failed to fetch leave requests:', response.status, response.statusText);
          // Try to get error response as text to see what's returned
          const errorText = await response.text();
          console.error('Error response:', errorText);
          return;
        }

        // Check the content type header
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Response is not JSON:', contentType);
          const textResponse = await response.text();
          console.error('Actual response content:', textResponse);
          return;
        }

        const data = await response.json();
        setLeaveRequests(data);
      } catch (error) {
        console.error('Error fetching leave requests:', error);
        // Try to fetch again or handle the error appropriately
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveRequests();
  }, []);

  // Apply filters and sorting
  const filteredAndSortedRequests = useMemo(() => {
    return [...leaveRequests].filter(request => {
      const matchesSearch =
        request.employeeName.toLowerCase().includes(searchInput.toLowerCase()) ||
        request.staffNo.toLowerCase().includes(searchInput.toLowerCase()) ||
        request.type.toLowerCase().includes(searchInput.toLowerCase()) ||
        request.reason.toLowerCase().includes(searchInput.toLowerCase());

      const matchesStatus = statusFilter === 'All' || request.status === statusFilter;
      const matchesType = typeFilter === 'All' || request.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    }).sort((a, b) => {
      // If no sort key is specified, default to appliedAt descending (newest first)
      const sortKey = sortConfig.key || 'appliedAt';
      const direction = sortConfig.key ? sortConfig.direction : 'desc';

      let aValue = a[sortKey as keyof LeaveRequest];
      let bValue = b[sortKey as keyof LeaveRequest];

      if (sortKey === 'startDate' || sortKey === 'endDate' || sortKey === 'appliedAt') {
        // Handle date comparison
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();

        const comparison = (aValue as number) - (bValue as number);
        return direction === 'asc' ? comparison : -comparison;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        // Handle string comparison
        const comparison = aValue.localeCompare(bValue as string);
        return direction === 'asc' ? comparison : -comparison;
      } else {
        // Handle other types
        if (aValue < bValue) {
          return direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return direction === 'asc' ? 1 : -1;
        }
        return 0;
      }
    });
  }, [leaveRequests, searchInput, statusFilter, typeFilter, sortConfig]);

  // Get unique types and statuses for filters
  const types = Array.from(new Set(leaveRequests.map(req => req.type)));
  const statuses = Array.from(new Set(leaveRequests.map(req => req.status)));

  // Pagination
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = filteredAndSortedRequests.slice(indexOfFirstRequest, indexOfLastRequest);
  const totalPages = Math.ceil(filteredAndSortedRequests.length / requestsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = useCallback((key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleViewLeave = (id: string) => {
    window.location.href = `/admin/leaves/${id}`;
  };

  const handleDeleteLeave = async (id: string) => {
    if (confirm('Are you sure you want to delete this leave request?')) {
      try {
        const response = await fetch(`/api/admin/leaves/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Delete response:', result);
          // Remove the deleted leave request from the local state
          setLeaveRequests(prevRequests => prevRequests.filter(request => request.id !== id));
          toast.success(result.message || 'Leave request deleted successfully!');
        } else {
          const errorData = await response.json();
          console.error('Failed to delete leave request:', errorData);
          toast.error(`Failed to delete leave request: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error deleting leave request:', error);
        toast.error(`Error deleting leave request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  // Effect to handle changes in items per page
  useEffect(() => {
    // When items per page changes, check if the current page is still valid
    const totalPages = Math.ceil(filteredAndSortedRequests.length / requestsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      // If current page is greater than total pages, go to the last page
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage !== 1) {
      // If there are no items but current page is not 1, reset to page 1
      setCurrentPage(1);
    }
  }, [requestsPerPage, filteredAndSortedRequests, currentPage, searchInput, statusFilter, typeFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leave requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
            <Link href="/admin/leaves/new">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Add New Leave Request
              </button>
            </Link>
          </div>

          <DataTable
            columns={[
              {
                key: 'employeeName',
                label: 'Employee',
                render: (value, row) => {
                  const initials = getUserInitials(row.employeeName);
                  const bgColor = getInitialsColor(row.employeeName);
                  return (
                    <div key={`employee-${row.id}`} className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${bgColor}`}
                        >
                          {initials}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{row.employeeName}</div>
                        <div className="text-sm text-gray-500">{row.staffNo}</div>
                      </div>
                    </div>
                  );
                }
              },
              { 
                key: 'type', 
                label: 'Type',
                render: (value) => (
                  <span key={`type-${value}`} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {value}
                  </span>
                )
              },
              {
                key: 'dates',
                label: 'Dates',
                render: (value, row) => (
                  <div key={`dates-${row.id}`}>
                    <div className="text-sm text-gray-900">
                      {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {Math.ceil((new Date(row.endDate).getTime() - new Date(row.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                    </div>
                  </div>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (value, row) => (
                  <span key={`status-${row.id}`} className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    row.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    row.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {row.status}
                  </span>
                ),
              },
              {
                key: 'reason',
                label: 'Reason',
                render: (value) => <span key={`reason-${value}`} className="text-sm text-gray-900">{value}</span>,
              },
              {
                key: 'appliedAt',
                label: 'Applied At',
                render: (value) => <span key={`date-${value}`}>{new Date(value as string).toLocaleDateString()}</span>,
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (_, row) => (
                  <div key={`actions-${row.id}`} className="flex space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewLeave(row.id);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLeave(row.id);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                    {/* Add more actions as needed */}
                  </div>
                )
              }
            ]}
            data={currentRequests} // Use paginated data instead of all filtered data
            onRowClick={(request) => handleViewLeave(request.id)}
            selectedRow={selectedRow}
            onRowSelect={setSelectedRow}
            rowIdKey="id"
            searchPlaceholder="Search leave requests..."
            onSearchChange={setSearchInput}
            filters={[
              {
                key: 'status',
                label: 'Status',
                options: [
                  { value: 'All', label: 'All Statuses', key: 'status-all' },
                  ...statuses.map((status, idx) => ({ value: status, label: status.toUpperCase(), key: `status-${idx}` })),
                ],
                value: statusFilter,
                onChange: setStatusFilter,
              },
              {
                key: 'type',
                label: 'Type',
                options: [
                  { value: 'All', label: 'All Types', key: 'type-all' },
                  ...types.map((type, idx) => ({ value: type, label: type.toUpperCase(), key: `type-${idx}` })),
                ],
                value: typeFilter,
                onChange: setTypeFilter,
              }
            ]}
            pagination={{
              currentPage: currentPage,
              totalPages: totalPages,
              onPageChange: handlePageChange,
            }}
            itemsPerPage={{
              value: requestsPerPage,
              onChange: setRequestsPerPage,
            }}
            onDelete={handleDeleteLeave}
            totalFilteredCount={filteredAndSortedRequests.length}
            sortConfig={sortConfig}
            onSort={handleSort}
            emptyMessage="No leave requests found"
          />

          {/* Pagination Info */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-700">
            <div>
              Showing <span className="font-medium">{indexOfFirstRequest + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(indexOfLastRequest, filteredAndSortedRequests.length)}
              </span>{' '}
              of <span className="font-medium">{filteredAndSortedRequests.length}</span> results
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}