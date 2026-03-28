"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserCard } from "./UserCard";
import { TeamResultsPanel } from "./TeamResultsPanel";
import { matchTeams } from "./matchTeams";
import type { SimUser, Team } from "./types";

function makeUser(index: number): SimUser {
  return {
    id: crypto.randomUUID(),
    name: `User ${index + 1}`,
    preferences: [],
  };
}

const DEFAULT_USERS: SimUser[] = Array.from({ length: 5 }, (_, i) =>
  makeUser(i)
);

export function TeamMatchingSimulator() {
  const [users, setUsers] = useState<SimUser[]>(DEFAULT_USERS);
  const [teams, setTeams] = useState<Team[] | null>(null);

  const updateUser = (updated: SimUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setTeams(null);
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => {
      const next = prev.filter((u) => u.id !== id);
      return next.map((u) => ({
        ...u,
        preferences: u.preferences.filter((p) => p !== id),
      }));
    });
    setTeams(null);
  };

  const addUser = () => {
    setUsers((prev) => [...prev, makeUser(prev.length)]);
    setTeams(null);
  };

  const runMatching = () => {
    setTeams(matchTeams(users));
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            allUsers={users}
            totalUsers={users.length}
            onChange={updateUser}
            onDelete={deleteUser}
          />
        ))}

        <button
          onClick={addUser}
          className="border-2 border-dashed border-[#333] rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-purple-600 hover:text-purple-400 transition-colors min-h-[200px]"
        >
          <Plus className="h-6 w-6" />
          <span className="text-sm">Add User</span>
        </button>
      </div>

      <div className="flex justify-center mb-2">
        <Button
          onClick={runMatching}
          disabled={users.length < 2}
          className="bg-purple-700 hover:bg-purple-600 text-white px-10 py-2 text-base font-semibold"
        >
          Run Team Matching
        </Button>
      </div>

      {teams && <TeamResultsPanel teams={teams} />}
    </div>
  );
}
