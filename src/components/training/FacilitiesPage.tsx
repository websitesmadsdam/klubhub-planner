import { useState } from 'react';
import { useFacilities, useCreateFacility, useUpdateFacility, useDeleteFacility } from '@/hooks/useFacilities';
import type { Facility, FacilityAvailability } from '@/types/training';
import { WEEKDAYS } from '@/types/training';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';

interface FacilityForm {
  name: string;
  description: string;
  simultaneous_capacity: number;
}

export default function FacilitiesPage({ availability = [] }: { availability?: FacilityAvailability[] }) {
  const { data: facilities = [], isLoading } = useFacilities();
  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();
  const deleteFacility = useDeleteFacility();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [form, setForm] = useState<FacilityForm>({ name: '', description: '', simultaneous_capacity: 1 });

  const openNew = () => { setEditing(null); setForm({ name: '', description: '', simultaneous_capacity: 1 }); setDialogOpen(true); };
  const openEdit = (f: Facility) => { setEditing(f); setForm({ name: f.name, description: f.description ?? '', simultaneous_capacity: f.simultaneous_capacity }); setDialogOpen(true); };

  const handleSave = async () => {
    const payload = { name: form.name, description: form.description || null, simultaneous_capacity: form.simultaneous_capacity };
    if (editing) {
      await updateFacility.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createFacility.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  // Get availability summary for a facility
  const getAvailSummary = (facilityId: string) => {
    const items = availability.filter(a => a.facility_id === facilityId);
    if (items.length === 0) return null;
    const days = [...new Set(items.map(a => a.weekday))].sort();
    return days.map(d => WEEKDAYS[d]?.slice(0, 3)).join(', ');
  };

  if (isLoading) return <div className="text-muted-foreground">Indlæser faciliteter…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Faciliteter</h2>
          <p className="text-sm text-muted-foreground">Haller og lokaler til rådighed for klubben</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Ny facilitet</Button>
      </div>

      {facilities.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Ingen faciliteter oprettet endnu. Klik "Ny facilitet" for at starte.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Navn</TableHead>
                <TableHead>Beskrivelse</TableHead>
                <TableHead className="text-center">Samtidige hold</TableHead>
                <TableHead>Tilgængelighed</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.map(f => {
                const availSummary = getAvailSummary(f.id);
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">{f.description ?? '–'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />{f.simultaneous_capacity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {availSummary ? (
                        <span className="text-xs text-muted-foreground">{availSummary}</span>
                      ) : (
                        <span className="text-xs text-destructive/70">Ingen sat</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Slet facilitet?</AlertDialogTitle><AlertDialogDescription>Faciliteten og al tilhørende data slettes permanent.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Annullér</AlertDialogCancel><AlertDialogAction onClick={() => deleteFacility.mutate(f.id)}>Slet</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Rediger facilitet' : 'Ny facilitet'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Navn *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Fx Hal 1, Gymnastiksalen" /></div>
            <div><Label>Beskrivelse</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Valgfri beskrivelse af faciliteten" /></div>
            <div>
              <Label>Samtidige hold (kapacitet) *</Label>
              <p className="text-xs text-muted-foreground mb-1.5">Hvor mange hold kan træne samtidig i denne facilitet?</p>
              <Input type="number" min={1} value={form.simultaneous_capacity} onChange={e => setForm(f => ({ ...f, simultaneous_capacity: Math.max(1, Number(e.target.value)) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annullér</Button>
            <Button onClick={handleSave} disabled={!form.name || createFacility.isPending || updateFacility.isPending}>
              {(createFacility.isPending || updateFacility.isPending) ? 'Gemmer…' : 'Gem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
