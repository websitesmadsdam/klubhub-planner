import { useState } from 'react';
import { useTeams, useCreateTeam, useUpdateTeam, useDeleteTeam } from '@/hooks/useTeams';
import type { Team, TeamGender } from '@/types/training';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface TeamForm {
  abbreviation: string;
  name: string;
  gender: TeamGender;
  birth_year_from: number;
  birth_year_to: number;
}

const currentYear = new Date().getFullYear();

export default function TeamsPage() {
  const { data: teams = [], isLoading } = useTeams();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState<TeamForm>({ abbreviation: '', name: '', gender: 'M', birth_year_from: currentYear - 15, birth_year_to: currentYear - 14 });

  const openNew = () => {
    setEditing(null);
    setForm({ abbreviation: '', name: '', gender: 'M', birth_year_from: currentYear - 15, birth_year_to: currentYear - 14 });
    setDialogOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditing(team);
    setForm({
      abbreviation: team.abbreviation,
      name: team.name,
      gender: team.gender,
      birth_year_from: team.birth_year_from,
      birth_year_to: team.birth_year_to,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      abbreviation: form.abbreviation.trim(),
      name: form.name.trim(),
      gender: form.gender,
      birth_year_from: form.birth_year_from,
      birth_year_to: form.birth_year_to,
    };
    if (editing) {
      await updateTeam.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createTeam.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  if (isLoading) return <div className="text-muted-foreground">Indlæser hold…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Hold</h2>
          <p className="text-sm text-muted-foreground">Faste hold, som kan vælges på træningspas.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nyt hold</Button>
      </div>

      {teams.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Ingen hold oprettet endnu.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Forkortelse</TableHead>
                <TableHead>Holdnavn</TableHead>
                <TableHead>Køn</TableHead>
                <TableHead>Årgang</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map(team => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.abbreviation}</TableCell>
                  <TableCell>{team.name}</TableCell>
                  <TableCell><Badge variant="outline">{team.gender}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{team.birth_year_from}–{team.birth_year_to}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(team)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Slet hold?</AlertDialogTitle>
                            <AlertDialogDescription>Holdet slettes fra stamdata. Eksisterende træningspas bevarer deres tekstvisning.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Annullér</AlertDialogCancel><AlertDialogAction onClick={() => deleteTeam.mutate(team.id)}>Slet</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Rediger hold' : 'Nyt hold'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Forkortelse *</Label><Input value={form.abbreviation} onChange={e => setForm(f => ({ ...f, abbreviation: e.target.value }))} placeholder="U15D" /></div>
              <div>
                <Label>Køn *</Label>
                <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v as TeamGender }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="K">K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Holdnavn *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="U-15 Drenge" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Årgang fra *</Label><Input type="number" value={form.birth_year_from} onChange={e => setForm(f => ({ ...f, birth_year_from: Number(e.target.value) }))} /></div>
              <div><Label>Årgang til *</Label><Input type="number" value={form.birth_year_to} onChange={e => setForm(f => ({ ...f, birth_year_to: Number(e.target.value) }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annullér</Button>
            <Button onClick={handleSave} disabled={!form.abbreviation || !form.name || createTeam.isPending || updateTeam.isPending}>
              {(createTeam.isPending || updateTeam.isPending) ? 'Gemmer…' : 'Gem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
