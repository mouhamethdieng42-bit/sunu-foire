import { Suspense } from 'react';
import NewMessageClient from './NewMessageClient';

export default function NewMessagePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
      <NewMessageClient />
    </Suspense>
  );
}