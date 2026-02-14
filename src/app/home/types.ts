export type CreateGroupResponse = {
  id: number;
  name?: string;
};

export type Group = {
  id: number;
  name?: string;
  memberCount?: number;
  membersCount?: number;
  totalMembers?: number;
};
