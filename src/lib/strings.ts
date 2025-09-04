import type { WAthlete, WTeam } from "@/types";

export const capitalize = (str: string, firstonly: boolean = true): string => {
  if (!str || str.length === 0) return str;
  if (firstonly)
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  return str.toUpperCase();
};

export const outputAthleteName = (athlete: WAthlete): string | undefined => {
  if (athlete.firstName === '' && athlete.lastName === '')
    return undefined;
  else
    return `${capitalize(athlete.firstName)} ${capitalize(athlete.lastName)}`.trim();
};

export const outputTeamName = (team: WTeam): string | undefined => {
  if (team.name === '' && team.abbreviation === '')
    return undefined;
  else if (team.abbreviation === '')
    return capitalize(team.name);
  else if (team.name === '')
    return capitalize(team.abbreviation, false);
  else
    return `${capitalize(team.name)} [${capitalize(team.abbreviation, false)}]`;
};
