import type { Team } from "./types";

type Props = {
  teams: Team[];
};

export function TeamResultsPanel({ teams }: Props) {
  return (
    <div className="mt-8 border border-[#2a2a2a] rounded-lg p-6 bg-[#0f0f0f]">
      <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
        Simulation Results — {teams.length} team{teams.length !== 1 ? "s" : ""}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {teams.map((team, i) => (
          <div
            key={team.id}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4"
          >
            <p className="text-xs font-semibold text-purple-400 mb-2 uppercase tracking-wider">
              Team {i + 1}
              <span className="text-muted-foreground font-normal ml-2">
                ({team.members.length} member
                {team.members.length !== 1 ? "s" : ""})
              </span>
            </p>
            <ul className="space-y-1">
              {team.members.map((member) => (
                <li key={member.id} className="text-sm text-white">
                  {member.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
