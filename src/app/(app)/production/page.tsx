// src/app/(app)/production/page.tsx
import { redirect } from 'next/navigation';

export default function ProductionBasePage() {
  // Redirect to the "Log Production" page by default
  redirect('/production/log');
}
