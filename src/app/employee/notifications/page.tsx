'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns'; // Assuming date-fns is installed

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  details?: {
    module?: string;
    action?: string;
    changes?: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
    targetEmployeeName?: string;
    targetEmployeeId?: string;
  };
}

export default function EmployeeNotificationsPage() {
  const { data: session, status } = useSession();

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
      <div className="min-h-screen flex items-center justify-center bg-[#FCF8E3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006837] mx-auto"></div>
          <p className="mt-4 text-[#080808]">Loading notifications...</p>
        </div>
      </div>
    );
  }

  // Check if user has employee or higher role
  if (session?.user?.role !== 'EMPLOYEE' && session?.user?.role !== 'ADMIN' && session?.user?.role !== 'HR') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCF8E3]">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center border border-[#E5E5E5]">
          <h1 className="text-2xl font-bold text-[#004B2E] mb-2">Access Denied</h1>
          <p className="text-[#080808] mb-6">
            You don't have permission to access notifications.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-[#006837] text-sm font-medium rounded-md shadow-sm text-[#006837] bg-white hover:bg-[#006837] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006837]"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data: Notification[] = await res.json();
      setNotifications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      // Update the notification in the state
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to mark notification as read');
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      // Update all unread notifications in the state
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err: any) {
      setError(err.message || 'Failed to mark all notifications as read');
      console.error('Error marking all as read:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCF8E3]">
        <p className="text-xl text-[#004B2E]">Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCF8E3]">
        <p className="text-xl text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-[#FCF8E3]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-[#004B2E] mb-6 flex items-center gap-3">
          <Bell className="w-8 h-8" /> Notifications
        </h1>

        <div className="flex justify-end mb-4">
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-[#006837] text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            Mark All as Read
          </button>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <p className="text-center text-gray-600 text-lg">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`p-5 rounded-lg shadow-md cursor-pointer transition-all hover:shadow-lg ${
                  n.isRead ? 'bg-white text-gray-700' : 'bg-[#E6F7F0] text-[#004B2E] border border-[#006837]'
                }`}
                onClick={() => {
                  markAsRead(n.id);
                  // Additional details could be revealed here if needed
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-lg mb-1">{n.title}</h2>
                      {n.details?.changes && n.details.changes.length > 0 && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {n.details.changes.length} change{n.details.changes.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mb-2">{n.message}</p>

                    {n.details?.changes && n.details.changes.length > 0 && (
                      <div className="mt-2 text-xs bg-gray-50 p-2 rounded border">
                        {n.details.changes.map((change, idx) => (
                          <div key={idx} className="flex flex-wrap justify-between py-1">
                            <span className="font-medium text-gray-700">{change.field}:</span>
                            <span className="text-gray-500 line-through">{change.oldValue ?? 'N/A'}</span>
                            <span className="mr-2">→</span>
                            <span className="text-green-600">{change.newValue ?? 'N/A'}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                      {n.details?.targetEmployeeName && (
                        <span className="text-xs text-gray-500">
                          {n.details.targetEmployeeName}
                        </span>
                      )}
                    </div>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the parent click event
                        markAsRead(n.id);
                      }}
                      className="ml-4 px-3 py-1 bg-[#D4AF37] text-white rounded-md hover:bg-yellow-600 transition-colors text-xs flex-shrink-0"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}