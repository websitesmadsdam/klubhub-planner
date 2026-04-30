import { useMemo, useState } from 'react';
import { usePersons, useCreatePerson, useUpdatePerson, useDeletePerson } from '@/hooks/usePersons';
import { useTeams } from '@/hooks/useTeams';
import { usePersonTeamRoles, useCreatePersonTeamRole, useDeletePersonTeamRole } from '@/hooks/usePersonTeamRoles';
import type { Person, TeamPersonRole } from '@/types/training';
import { TEAM_PERSON_ROLE_LABELS, TEAM_PERSON_ROLE_OPTIONS } from '@/types/training';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Link2, X } from 'lucide-react';

export default function PersonsPage() {
  const { data: persons = [], isLoading } = usePersons();
  const { data: teams = [] } = useTeams();
  const { data: roles = [] } = usePersonTeamRoles();
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();
  const createRole = useCreatePersonTeamRole();
  const deleteRole = useDeletePersonTeamRole();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [name, setName] = useState('');
  const [roleDialogPerson, setRoleDialogPerson] = useState<Person | null>(null);
  const [roleForm, setRoleForm] = useState<{ team_id: string; role: TeamPersonRole }>({ team_id: '', role: 'traener' });

  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);
  const rolesByPerson = useMemo(() => {
    const map = new Map<string, typeof roles>();
    roles.forEach(role => {
      if (!map.has(role.person_id)) map.set(role.person_id, []);
      map.get(role.person_id)!.push(role);
    });
    return map;
  }, [roles]);

  const openNew = () => { setEditing(null); setName(''); setDialogOpen(true); };
  const openEdit = (person: Person) => { setEditing(person); setName(person.name); setDialogOpen(true); };

  const handleSave = async () => {
    const payload = { name: name.trim() };
    if (editing) {
      await updatePerson.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createPerson.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const openRoleDialog = (person: Person) => {
    setRoleDialogPerson(person);
    setRoleForm({ team_id: teams[0]?.id ?? '', role: 'traener' });
  };

  const handleAddRole = async () => {
    if (!roleDialogPerson || !roleForm.team_id) return;
    await createRole.mutateAsync({ person_id: roleDialogPerson.id, team_id: roleForm.team_id, role: roleForm.role });
    setRoleForm(f => ({ ...f, team_id: '' }));
  };

  if (isLoading) return <div className="text-muted-foreground">Indlæser personer…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Personer</h2>
          <p className="text-sm text-muted-foreground">Trænere, holdledere og andre personer, som kan kobles til hold.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Ny person</Button>
      </div>

      {persons.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Ingen personer oprettet endnu.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Navn</TableHead>
                <TableHead>Hold/roller</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {persons.map(person => {
                const personRoles = rolesByPerson.get(person.id) ?? [];
                return (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {personRoles.length === 0 ? <span className="text-sm text-muted-foreground">Ingen koblinger</span> : personRoles.map(role => {
                          const team = teamMap.get(role.team_id);
                          return <Badge key={role.id} variant="secondary">{team?.abbreviation ?? 'Hold'} · {TEAM_PERSON_ROLE_LABELS[role.role]}</Badge>;
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openRoleDialog(person)}><Link2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(person)}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Slet person?</AlertDialogTitle>
                              <AlertDialogDescription>Personen slettes fra stamdata. Eksisterende træningspas bevarer deres tekstvisning.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Annullér</AlertDialogCancel><AlertDialogAction onClick={() => deletePerson.mutate(person.id)}>Slet</AlertDialogAction></AlertDialogFooter>
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
          <DialogHeader><DialogTitle>{editing ? 'Rediger person' : 'Ny person'}</DialogTitle></DialogHeader>
          <div><Label>Navn *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Navn" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annullér</Button>
            <Button onClick={handleSave} disabled={!name.trim() || createPerson.isPending || updatePerson.isPending}>{(createPerson.isPending || updatePerson.isPending) ? 'Gemmer…' : 'Gem'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!roleDialogPerson} onOpenChange={open => !open && setRoleDialogPerson(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kobl {roleDialogPerson?.name} til hold</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <div>
                <Label>Hold</Label>
                <Select value={roleForm.team_id} onValueChange={v => setRoleForm(f => ({ ...f, team_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Vælg hold" /></SelectTrigger>
                  <SelectContent>{teams.map(team => <SelectItem key={team.id} value={team.id}>{team.abbreviation} · {team.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rolle</Label>
                <Select value={roleForm.role} onValueChange={v => setRoleForm(f => ({ ...f, role: v as TeamPersonRole }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TEAM_PERSON_ROLE_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddRole} disabled={!roleForm.team_id || createRole.isPending}>Tilføj</Button>
            </div>
            <div className="space-y-2">
              {(roleDialogPerson ? rolesByPerson.get(roleDialogPerson.id) ?? [] : []).map(role => {
                const team = teamMap.get(role.team_id);
                return (
                  <div key={role.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span>{team?.abbreviation ?? 'Hold'} · {TEAM_PERSON_ROLE_LABELS[role.role]}</span>
                    <Button variant="ghost" size="icon" onClick={() => deleteRole.mutate(role.id)}><X className="h-4 w-4" /></Button>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRoleDialogPerson(null)}>Luk</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
