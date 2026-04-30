Jeg foreslår at vi udvider træningsmodulet med faste stamdata for hold og personer, men gør det på en måde der ikke ødelægger eksisterende træningspas.

Plan:

1. Database
- Opret tabel `teams` til hold:
  - `id`
  - `abbreviation` fx `U15D`
  - `name` fx `U-15 Drenge`
  - `gender` med værdier `M` / `K`
  - `birth_year_from`
  - `birth_year_to`
  - timestamps
- Opret tabel `persons` til personer:
  - `id`
  - `name`
  - timestamps
- Opret tabel `person_team_roles` til koblingen mellem personer og hold:
  - `person_id`
  - `team_id`
  - `role` fx Cheftræner, træner, assistent, holdleder, ungtræner
- Tilføj felter på `training_slots`:
  - `team_id` valgfri reference til `teams`
  - `person_id` valgfri reference til `persons`
- Behold de nuværende tekstfelter `team_group_name`, `subgroup_name` og `responsible_name`, så gamle data stadig virker og nye træningspas kan have fritekst ved behov.

2. RLS og adgang
- Tilføj RLS-politikker på de nye tabeller, samme niveau som resten af træningsmodulet: indloggede brugere kan læse, oprette, rette og slette.
- Undgå roller på `profiles`; rollebetegnelser som Cheftræner/træner er faglige holdroller, ikke system-administratorroller.

3. Hooks og typer
- Udvid `src/types/training.ts` med typer for `Team`, `Person` og `PersonTeamRole`.
- Tilføj hooks til CRUD:
  - `useTeams`, `useCreateTeam`, `useUpdateTeam`, `useDeleteTeam`
  - `usePersons`, `useCreatePerson`, `useUpdatePerson`, `useDeletePerson`
  - hooks til at oprette/slette/rette person-hold-roller

4. Ny UI i Træningstider
- Tilføj nye faner under `Træningstider`:
  - `Hold`
  - `Personer`
- Hold-fanen får tabel + dialog til oprettelse/rettelse/sletning af hold.
- Personer-fanen får tabel + dialog til oprettelse/rettelse/sletning af personer.
- I person-dialogen eller en separat sektion kan man linke en person til et eller flere hold med en rolle.

5. Træningspas-formular
- Tilpas `Træningspas` dialogen:
  - Hold kan vælges fra holdlisten.
  - Ansvarlig kan vælges fra personlisten.
  - Når man vælger et hold, udfyldes visningsnavnet stadig i `team_group_name`, så eksisterende oversigter fortsat virker.
  - Når man vælger en person, udfyldes `responsible_name`, så nuværende advarsler for træner-overlap fortsat virker.
- Evt. kan fritekst stadig være muligt som fallback, hvis et hold/person endnu ikke er oprettet.

6. Oversigter og advarsler
- `Pr. hold`, `Oversigt` og konfliktdetektion fortsætter med at virke på eksisterende tekstfelter.
- Hvor der findes `team_id`/`person_id`, kan UI vise stamdata-navnet mere konsistent.
- Træner-overlap vil stadig virke, fordi `responsible_name` bliver udfyldt ud fra valgt person.

7. Datamigrering / eksisterende data
- Eksisterende træningspas ændres ikke automatisk i første omgang.
- Efter funktionen er på plads kan vi eventuelt senere lave en oprydningsfunktion, der opretter hold/personer ud fra de eksisterende fritekst-navne og linker dem.

Tekniske noter:
- Dette kræver en Supabase migration, fordi der skal oprettes nye tabeller og nye kolonner på `training_slots`.
- Jeg vil bruge almindelige public-tabeller med RLS, ikke Supabase auth-tabeller.
- Sletning af hold/personer bør være begrænset af relationer: hvis et hold/person bruges på træningspas, bør vi enten forhindre sletning eller sætte referencen til null. Jeg anbefaler `ON DELETE SET NULL`, så gamle træningspas ikke slettes.