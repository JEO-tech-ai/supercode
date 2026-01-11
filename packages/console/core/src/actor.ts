export type ActorType = "public" | "user" | "workspace";

export interface PublicActor {
  type: "public";
}

export interface UserActor {
  type: "user";
  properties: {
    userId: string;
    email: string;
  };
}

export interface WorkspaceActor {
  type: "workspace";
  properties: {
    userId: string;
    workspaceId: string;
  };
}

export type Actor = PublicActor | UserActor | WorkspaceActor;

export function createPublicActor(): PublicActor {
  return { type: "public" };
}

export function createUserActor(userId: string, email: string): UserActor {
  return {
    type: "user",
    properties: { userId, email },
  };
}

export function createWorkspaceActor(
  userId: string,
  workspaceId: string
): WorkspaceActor {
  return {
    type: "workspace",
    properties: { userId, workspaceId },
  };
}

export function assertUser(actor: Actor): asserts actor is UserActor {
  if (actor.type !== "user") {
    throw new Error("User authentication required");
  }
}

export function assertWorkspace(
  actor: Actor
): asserts actor is WorkspaceActor {
  if (actor.type !== "workspace") {
    throw new Error("Workspace access required");
  }
}
