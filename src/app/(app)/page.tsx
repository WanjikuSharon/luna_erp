
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/data';

export default function AppPage() {
  switch (currentUser.role) {
    case 'admin':
      redirect('/admin');
      break;
    case 'operations_manager':
      redirect('/operations');
      break;
    case 'production_personnel':
      redirect('/production');
      break;
    default:
      redirect('/login');
  }
}

    