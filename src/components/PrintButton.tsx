'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-secondary">
      <Printer size={15} /> Print
    </button>
  );
}
