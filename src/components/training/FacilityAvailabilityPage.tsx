import { useState } from 'react';
import { useFacilities } from '@/hooks/useFacilities';
import { useFacilityAvailability, useCreateFacilityAvailability, useUpdateFacilityAvailability, useDeleteFacilityAvailability } from '@/hooks/useFacilityAvailability';
import type { FacilityAvailability, Facility } from '@/types/training';
import { WEEKDAYS, WEEKDAY_OPTIONS } from '@/types/training';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface AvForm {
  facility_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  valid_from: string;
  valid_to: string;
  notes: string;
}

const emptyForm: AvForm = { facility_id: '', weekday: 1, start_time: '16:00', end_time: '22:00', valid_from: '', valid_to: '', notes: '' };

export default function FacilityAvailabilityPage() {
  const { data: facilities = [] } = useFacilities();
  const { data: availability = [], isLoading } = useFacilityAvailability();
  const createAv = useCreateFacilityAvailability();
  const updateAv = useUpdateFacilityAvailability();
  const deleteAv = useDeleteFacilityAvailability();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FacilityAvailability | null>(null);
  const [form, setForm] = useState<AvForm>(emptyForm);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, facility_id: facilities[0]?.id ?? '' }); setDialogOpen(true); };
  const openEdit = (av: FacilityAvailability) => {
    setEditing(av);
    setForm({
      facility_id: av.facility_id,
      weekday: av.weekday,
      start_time: av.start_time,
      end_time: av.end_time,
      valid_from: av.valid_from,
      valid_to: av.valid_to ?? '',
      notes: av.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      facility_id: form.facility_id,
      weekday: form.weekday,
      start_time: form.start_time,
      end_time: form.end_time,
      valid_from: form.valid_from,
      valid_to: form.valid_to || null,
      notes: form.notes || null,
    };
    if (editing) {
      await updateAv.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createAv.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const facilityName = (id: string) => facilities.find(f => f.id === id)?.name ?? 'Ukendt';

  // Group by facility
  const grouped = facilities.map(fac => ({
    facility: fac,
    items: availability.filter(a => a.facility_id === fac.id),
  })).filter(g => g.items.length > 0 || facilities.length > 0);

  if (isLoading) return <div className="text-muted-foreground">Indlæser tilgængelighed…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Haltilgængelighed</h2>
          <p className="text-sm text-muted-foreground">Hvornår råder klubben over faciliteterne</p>
        </div>
        <Button onClick={openNew} disabled={facilities.length === 0}><Plus className="mr-2 h-4 w-4" />Ny tilgængelighed</Button>
      </div>

      {facilities.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Opret faciliteter først</CardContent></Card>
      ) : (
        <div className="grid gap-6">
          {facilities.map(fac => {
            const items = availability.filter(a => a.facility_id === fac.id);
            return (
              <Card key={fac.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{fac.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Ingen tilgængelighed registreret</p>
                  ) : (
                    <div className="grid gap-2">
                      {items.map(av => (
                        <div key={av.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{WEEKDAYS[av.weekday]}</Badge>
                            <span className="text-sm font-medium">{av.start_time.slice(0,5)} – {av.end_time.slice(0,5)}</span>
                            <span className="text-xs text-muted-foreground">
                              {av.valid_from}{av.valid_to ? ` → ${av.valid_to}` : ' →'}
                            </span>
                            {av.notes && <span className="text-xs text-muted-foreground italic">{av.notes}</span>}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(av)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Slet tilgængelighed?</AlertDialogTitle><AlertDialogDescription>Sletter denne tidsblok.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Annullér</AlertDialogCancel><AlertDialogAction onClick={() => deleteAv.mutate(av.id)}>Slet</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Rediger tilgængelighed' : 'Ny tilgængelighed'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Facilitet</Label>
              <Select value={form.facility_id} onValueChange={v => setForm(f => ({ ...f, facility_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{facilities.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ugedag</Label>
              <Select value={String(form.weekday)} onValueChange={v => setForm(f => ({ ...f, weekday: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WEEKDAY_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start</Label><Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
              <div><Label>Slut</Label><Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Gyldig fra</Label><Input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} /></div>
              <div><Label>Gyldig til</Label><Input type="date" value={form.valid_to} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))} /></div>
            </div>
            <div><Label>Noter</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annullér</Button>
            <Button onClick={handleSave} disabled={!form.facility_id || !form.valid_from}>Gem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
