import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import { useFacilities } from '@/hooks/useFacilities';
import { useFacilityAvailability, useCreateFacilityAvailability, useUpdateFacilityAvailability, useDeleteFacilityAvailability } from '@/hooks/useFacilityAvailability';
import type { FacilityAvailability } from '@/types/training';
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
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';

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

  const openNew = (facilityId?: string) => {
    setEditing(null);
    setForm({ ...emptyForm, facility_id: facilityId || facilities[0]?.id || '' });
    setDialogOpen(true);
  };

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

  // Calculate total hours for a facility
  const getTotalHours = (facilityId: string) => {
    const items = availability.filter(a => a.facility_id === facilityId);
    let minutes = 0;
    for (const item of items) {
      const [sh, sm] = item.start_time.split(':').map(Number);
      const [eh, em] = item.end_time.split(':').map(Number);
      minutes += (eh * 60 + em) - (sh * 60 + sm);
    }
    return Math.round(minutes / 60 * 10) / 10;
  };

  if (isLoading) return <div className="text-muted-foreground">Indlæser tilgængelighed…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Haltilgængelighed</h2>
          <p className="text-sm text-muted-foreground">Hvornår råder klubben over faciliteterne</p>
        </div>
        <Button onClick={() => openNew()} disabled={facilities.length === 0}><Plus className="mr-2 h-4 w-4" />Ny tilgængelighed</Button>
      </div>

      {facilities.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Opret faciliteter først under fanen "Faciliteter"</CardContent></Card>
      ) : (
        <div className="grid gap-6">
          {facilities.map(fac => {
            const items = availability
              .filter(a => a.facility_id === fac.id)
              .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
            const totalHours = getTotalHours(fac.id);

            // Group items by weekday
            const byWeekday = new Map<number, FacilityAvailability[]>();
            for (const item of items) {
              if (!byWeekday.has(item.weekday)) byWeekday.set(item.weekday, []);
              byWeekday.get(item.weekday)!.push(item);
            }

            return (
              <Card key={fac.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {fac.location} · {fac.name}
                      {totalHours > 0 && (
                        <Badge variant="outline" className="font-normal gap-1">
                          <Clock className="h-3 w-3" />{totalHours} t/uge
                        </Badge>
                      )}
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => openNew(fac.id)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />Tilføj
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Ingen tilgængelighed registreret – klik "Tilføj" for at starte</p>
                  ) : (
                    <div className="space-y-1">
                      {[1, 2, 3, 4, 5, 6, 7].map(day => {
                        const dayItems = byWeekday.get(day);
                        if (!dayItems) return null;
                        return (
                          <div key={day} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                            <span className="w-20 text-sm font-medium text-muted-foreground shrink-0">{WEEKDAYS[day]}</span>
                            <div className="flex flex-wrap gap-2 flex-1">
                              {dayItems.map(av => (
                                <div key={av.id} className="flex items-center gap-1.5 group">
                                  <Badge variant="secondary" className="font-mono text-xs">
                                    {av.start_time.slice(0, 5)} – {av.end_time.slice(0, 5)}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(av.valid_from)}{av.valid_to ? ` → ${formatDate(av.valid_to)}` : ''}
                                  </span>
                                  {av.notes && <span className="text-xs text-muted-foreground italic">({av.notes})</span>}
                                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(av)}><Pencil className="h-3 w-3" /></Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><Trash2 className="h-3 w-3 text-destructive" /></Button></AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Slet tilgængelighed?</AlertDialogTitle><AlertDialogDescription>Sletter denne tidsblok for {fac.location} · {fac.name}.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Annullér</AlertDialogCancel><AlertDialogAction onClick={() => deleteAv.mutate(av.id)}>Slet</AlertDialogAction></AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
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
              <Label>Facilitet *</Label>
              <Select value={form.facility_id} onValueChange={v => setForm(f => ({ ...f, facility_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Vælg facilitet" /></SelectTrigger>
                <SelectContent>{facilities.map(f => <SelectItem key={f.id} value={f.id}>{f.location} · {f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ugedag *</Label>
              <Select value={String(form.weekday)} onValueChange={v => setForm(f => ({ ...f, weekday: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WEEKDAY_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start *</Label><Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
              <div><Label>Slut *</Label><Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
            </div>
            {form.start_time && form.end_time && form.end_time <= form.start_time && (
              <p className="text-xs text-destructive">Sluttid skal være efter starttid</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Gyldig fra *</Label><Input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} /></div>
              <div><Label>Gyldig til</Label><Input type="date" value={form.valid_to} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))} /></div>
            </div>
            <div><Label>Noter</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Valgfri noter" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annullér</Button>
            <Button
              onClick={handleSave}
              disabled={!form.facility_id || !form.valid_from || !form.start_time || !form.end_time || form.end_time <= form.start_time || createAv.isPending || updateAv.isPending}
            >
              {(createAv.isPending || updateAv.isPending) ? 'Gemmer…' : 'Gem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
