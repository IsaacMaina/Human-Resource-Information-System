"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from 'next-auth/react';
import DataTable from "@/components/admin/common/DataTable";
import Link from "next/link";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from "xlsx";
import { getUserInitials, getInitialsColor } from '@/lib/utils';

interface Employee {
  id: string;
  name: string;
  staffNo: string;
  position: string;
  department: string;
  email: string;
}

export default function AdminEmployees() {
  const { data: session, status } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState(""); // For debounced search

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
          <p className="mt-4 text-gray-600">Loading employees...</p>
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
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [positionFilter, setPositionFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [employeesPerPage, setEmployeesPerPage] = useState(10);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isExportDropdownOpen) {
        const target = event.target as HTMLElement;
        const exportDropdownContainer = document.getElementById('export-dropdown-container');

        if (exportDropdownContainer && !exportDropdownContainer.contains(target)) {
          setIsExportDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportDropdownOpen]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("/api/admin/employees");
        if (response.ok) {
          const data = await response.json();
          setEmployees(data);
        } else {
          console.error("Failed to fetch employees");
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Apply filters and sorting
  const filteredAndSortedEmployees = [...employees]
    .filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        employee.staffNo.toLowerCase().includes(searchInput.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchInput.toLowerCase());

      const matchesDepartment =
        departmentFilter === "All" || employee.department === departmentFilter;
      const matchesPosition =
        positionFilter === "All" || employee.position === positionFilter;

      return matchesSearch && matchesDepartment && matchesPosition;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;

      const aValue = a[sortConfig.key as keyof Employee];
      const bValue = b[sortConfig.key as keyof Employee];

      // Handle string comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === "asc" ? comparison : -comparison;
      }

      // Handle number comparison
      if (typeof aValue === "number" && typeof bValue === "number") {
        const comparison = (aValue as number) - (bValue as number);
        return sortConfig.direction === "asc" ? comparison : -comparison;
      }

      // Handle other types
      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

  // Get unique departments and positions for filters
  const departments = Array.from(
    new Set(employees.map((emp) => emp.department))
  );
  const positions = Array.from(new Set(employees.map((emp) => emp.position)));

  // Pagination
  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = filteredAndSortedEmployees.slice(
    indexOfFirstEmployee,
    indexOfLastEmployee
  );
  const totalPages = Math.ceil(
    filteredAndSortedEmployees.length / employeesPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = useCallback(
    (key: string) => {
      let direction: "asc" | "desc" = "asc";
      if (sortConfig.key === key && sortConfig.direction === "asc") {
        direction = "desc";
      }
      setSortConfig({ key, direction });
    },
    [sortConfig]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleViewEmployee = (employeeId: string) => {
    window.location.href = `/admin/employees/${employeeId}`;
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        const response = await fetch(`/api/admin/employees/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          // Refresh the employee list to get the updated data
          const refreshResponse = await fetch("/api/admin/employees");
          if (refreshResponse.ok) {
            const updatedEmployees = await refreshResponse.json();
            setEmployees(updatedEmployees);
            toast.success("Employee deleted successfully");

            // Check if current page is still valid after deletion
            const indexOfLastEmployee = currentPage * employeesPerPage;
            const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
            const currentEmployeesAfterRefresh = updatedEmployees.slice(
              indexOfFirstEmployee,
              indexOfLastEmployee
            );
            const totalPagesAfterRefresh = Math.ceil(
              updatedEmployees.length / employeesPerPage
            );

            if (currentEmployeesAfterRefresh.length === 0 && totalPagesAfterRefresh > 0 && currentPage > 1) {
              // If the current page is now empty, go to the previous page
              setCurrentPage(prev => Math.max(1, prev - 1));
            }
          } else {
            // Fallback: remove from local state only
            setEmployees(employees.filter((employee) => employee.id !== id));
            toast.success("Employee deleted successfully");
          }
        } else {
          const errorData = await response.json();
          console.error("Failed to delete employee:", errorData);
          toast.error(errorData.error || "Failed to delete employee");
        }
      } catch (error) {
        console.error("Error deleting employee:", error);
        toast.error("Error deleting employee");
      }
    }
  };

  // Effect to handle changes in items per page
  useEffect(() => {
    // When items per page changes, check if the current page is still valid
    const totalPages = Math.ceil(
      filteredAndSortedEmployees.length / employeesPerPage
    );
    if (currentPage > totalPages && totalPages > 0) {
      // If current page is greater than total pages, go to the last page
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage !== 1) {
      // If there are no items but current page is not 1, reset to page 1
      setCurrentPage(1);
    }
  }, [
    employeesPerPage,
    filteredAndSortedEmployees,
    currentPage,
    searchInput,
    departmentFilter,
    positionFilter,
  ]);

  const exportToPdf = () => {
    const doc = new jsPDF();
    const tableColumn = columns.map((col) => col.label);
    const tableRows = filteredAndSortedEmployees.map((row) => {
      return columns.map((col) => {
        // Special handling for ReactNode in render function
        if (col.render) {
          const renderedValue = col.render(row[col.key], row);
          if (
            typeof renderedValue === "string" ||
            typeof renderedValue === "number"
          ) {
            return String(renderedValue);
          }
          return ""; // Fallback for complex ReactNodes
        }
        return String(row[col.key]);
      });
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
    });

    doc.save("employees.pdf");
    setIsExportDropdownOpen(false);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredAndSortedEmployees.map((row) => {
        const newRow: any = {};
        columns.forEach((col) => {
          if (col.render) {
            const renderedValue = col.render(row[col.key], row);
            if (
              typeof renderedValue === "string" ||
              typeof renderedValue === "number"
            ) {
              newRow[col.label] = renderedValue;
            } else {
              newRow[col.label] = ""; // Fallback
            }
          } else {
            newRow[col.label] = String(row[col.key]);
          }
        });
        return newRow;
      })
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, "employees.xlsx");
    setIsExportDropdownOpen(false);
  };

  const exportToDoc = () => {
    const header =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>Export HTML to Word Document</title></head><body>";
    const footer = "</body></html>";
    let html = header;
    html += "<table>";
    html += "<thead><tr>";
    columns.forEach((col) => {
      html += `<th>${col.label}</th>`;
    });
    html += "</tr></thead>";
    html += "<tbody>";
    filteredAndSortedEmployees.forEach((row) => {
      html += "<tr>";
      columns.forEach((col) => {
        if (col.render) {
          const renderedValue = col.render(row[col.key], row);
          if (
            typeof renderedValue === "string" ||
            typeof renderedValue === "number"
          ) {
            html += `<td>${renderedValue}</td>`;
          } else {
            html += `<td></td>`; // Fallback
          }
        } else {
          html += `<td>${String(row[col.key])}</td>`;
        }
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    html += footer;

    const url =
      "data:application/vnd.ms-word;charset=utf-8," + encodeURIComponent(html);
    const downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    downloadLink.href = url;
    downloadLink.download = "employees.doc";
    downloadLink.click();
    document.body.removeChild(downloadLink);
    setIsExportDropdownOpen(false);
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        render: (value, row) => {
          const initials = getUserInitials(row.name);
          const bgColor = getInitialsColor(row.name);
          return (
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${bgColor}`}
                >
                  {initials}
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">
                  {row.name}
                </div>
              </div>
            </div>
          );
        },
      },
      { key: "staffNo", label: "Staff No." },
      { key: "position", label: "Position" },
      { key: "department", label: "Department" },
      { key: "email", label: "Email" },
      {
        key: "actions",
        label: "Actions",
        render: (_, row) => (
          <div key={`actions-${row.id}`} className="flex space-x-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewEmployee(row.id);
              }}
              className="text-blue-600 hover:text-blue-900"
            >
              View
            </button>
            <Link href={`/admin/employees/${row.id}/edit`}>
              <button
                onClick={(e) => e.stopPropagation()}
                className="text-green-600 hover:text-green-900"
              >
                Edit
              </button>
            </Link>
            <Link href={`/admin/employees/${row.id}/generate-payslip`}>
              <button
                onClick={(e) => e.stopPropagation()}
                className="text-purple-600 hover:text-purple-900"
              >
                Pay Slip
              </button>
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteEmployee(row.id);
              }}
              className="text-red-600 hover:text-red-900"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [handleViewEmployee, handleDeleteEmployee]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Employees Management
            </h1>
            <div className="flex flex-wrap gap-3 relative">
              <Link href="/admin/employees/new">
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Add New Employee
                </button>
              </Link>
              {/* Export Dropdown */}
              <div id="export-dropdown-container" className="relative">
                <button
                  onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Export
                  <svg
                    className={`ml-2 h-4 w-4 transform transition-transform ${
                      isExportDropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isExportDropdownOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div
                      className="py-1"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="options-menu"
                    >
                      <button
                        onClick={() => exportToPdf()}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        role="menuitem"
                      >
                        Export to PDF
                      </button>
                      <button
                        onClick={() => exportToExcel()}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        role="menuitem"
                      >
                        Export to Excel
                      </button>
                      <button
                        onClick={() => exportToDoc()}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        role="menuitem"
                      >
                        Export to Doc
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={currentEmployees} // Use paginated data instead of all filtered data
            onRowClick={(employee) => handleViewEmployee(employee.id)}
            selectedRow={selectedRow}
            onRowSelect={setSelectedRow}
            rowIdKey="id"
            searchPlaceholder="Search employees..."
            onSearchChange={setSearchInput}
            filters={[
              {
                key: "department",
                label: "Department",
                options: [
                  { value: "All", label: "All Departments" },
                  ...departments.map((dept) => ({ value: dept, label: dept })),
                ],
                value: departmentFilter,
                onChange: setDepartmentFilter,
              },
              {
                key: "position",
                label: "Position",
                options: [
                  { value: "All", label: "All Positions" },
                  ...positions.map((position) => ({
                    value: position,
                    label: position,
                  })),
                ],
                value: positionFilter,
                onChange: setPositionFilter,
              },
            ]}
            pagination={{
              currentPage: currentPage,
              totalPages: totalPages,
              onPageChange: handlePageChange,
            }}
            itemsPerPage={{
              value: employeesPerPage,
              onChange: setEmployeesPerPage,
            }}
            onDelete={handleDeleteEmployee}
            totalFilteredCount={filteredAndSortedEmployees.length}
            sortConfig={sortConfig}
            onSort={handleSort}
            emptyMessage="No employees found"
          />
        </div>
      </div>
    </div>
  );
}
