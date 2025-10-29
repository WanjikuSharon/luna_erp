// src/app/(app)/operations/page.tsx
import { redirect } from 'next/navigation';

export default function OperationsBasePage() {
  // Redirect to the overview page by default when '/operations' is visited
  redirect('/operations/overview');
}
