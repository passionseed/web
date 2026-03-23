export type SimUser = {
  id: string; // uuid
  name: string;
  preferences: string[]; // up to 5 user ids, in priority order
};

export type Team = {
  id: string;
  members: SimUser[];
};
