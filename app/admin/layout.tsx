/**
 * Admin Layout
 * Version: 2.0.0
 * 
 * Layout for admin pages with sidebar navigation.
 * Only accessible to users with 'admin' or 'super-admin' role.
 * 
 * v2.0.0: Added collapsible sidebar and version display
 */

import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CollapsibleSidebar from '@/components/admin/CollapsibleSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication and authorization
  const session = await getSession();
  
  if (!session) {
    redirect('/api/auth/login');
  }
  
  // Only admins and super-admins can access admin area
  if (session.user.role !== 'admin' && session.user.role !== 'super-admin') {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <CollapsibleSidebar session={session} />
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
