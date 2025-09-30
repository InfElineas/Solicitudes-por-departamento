import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';


export default function TrashView({ api }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });

  const [confirmPurgeAll, setConfirmPurgeAll] = useState(false);

  const purgeAll = async () => {
  try {
    await api.delete('/requests/trash');
    toast.success('Papelera vaciada correctamente');
    load();
    setConfirmPurgeAll(false);
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'No se pudo vaciar la papelera');
  }
};

  const load = async () => {
    try {
      const params = new URLSearchParams({ page, page_size: pageSize });
      if (q.trim()) params.set('q', q.trim());
      const { data } = await api.get(`/requests/trash?${params.toString()}`);
      setItems(data.items || []);
      setMeta({ total: data.total, total_pages: data.total_pages });
    } catch (e) {
      console.error(e);
      toast.error('No se pudo cargar la papelera');
    }
  };

  useEffect(() => { load(); }, [page, pageSize]); // eslint-disable-line

  const restore = async (id) => {
    try {
      await api.post(`/requests/${id}/restore`);
      toast.success('Solicitud restaurada');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudo restaurar');
    }
  };

  const purge = async (id) => {
    try {
      await api.delete(`/requests/trash/${id}`);
      toast.success('Solicitud eliminada definitivamente');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudo eliminar definitivamente');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <Label className="text-sm">Buscar</Label>
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Título o descripción..." />
            <Button variant="outline" onClick={() => { setPage(1); load(); }}>Buscar</Button>
          </div>
        </div>
        <div>
          <Label className="text-sm">Por página</Label>
          <Input
            type="number" min="5" max="50"
            value={pageSize}
            onChange={(e) => { setPageSize(parseInt(e.target.value||10,10)); setPage(1); }}
          />
        </div>
      </div>

      <Dialog open={confirmPurgeAll} onOpenChange={setConfirmPurgeAll}>
  <DialogTrigger asChild>
    <Button variant="destructive" className="ml-auto">
      Vaciar Papelera
    </Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>¿Vaciar la papelera?</DialogTitle>
      <DialogDescription>Esto eliminará <strong>permanentemente</strong> todas las solicitudes en la papelera.</DialogDescription>
    </DialogHeader>
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={() => setConfirmPurgeAll(false)}>Cancelar</Button>
      <Button variant="destructive" onClick={purgeAll}>Eliminar todo</Button>
    </div>
  </DialogContent>
</Dialog>


      <div className="grid gap-3">
        {items.map((it) => (
          <Card key={it.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{it.title}</CardTitle>
                <CardDescription>{it.department} • {it.requester_name}</CardDescription>
              </div>
              <div className="text-sm text-gray-500">
                Eliminada: {new Date(it.deleted_at).toLocaleString()}<br/>
                Expira: {new Date(it.expires_at).toLocaleString()}
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button onClick={() => restore(it.id)}>Restaurar</Button>
              <Button variant="destructive" onClick={() => purge(it.id)}>Eliminar definitivamente</Button>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <Card><CardContent className="py-8 text-center text-gray-500">No hay elementos en la papelera.</CardContent></Card>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Total: <span className="font-medium">{meta.total}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>Anterior</Button>
          <span className="text-sm">Página {page}/{meta.total_pages}</span>
          <Button variant="outline" disabled={page>=meta.total_pages} onClick={() => setPage(p => Math.min(meta.total_pages, p+1))}>Siguiente</Button>
        </div>
      </div>
    </div>
  );
}
