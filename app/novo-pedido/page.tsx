'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NovoPedidoPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pedidos');
  }, [router]);

  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Redirecionando...</p>
    </div>
  );
}
