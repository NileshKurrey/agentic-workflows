import { eq } from "drizzle-orm";
import type { Database } from "../client";
import { users } from "../schema";

export interface CreateUserInput {
  email: string;
  name?: string;
}

export class UserStore {
  constructor(private readonly db: Database) {}

  async createUser(input: CreateUserInput): Promise<{ id: string; email: string; name: string | null }> {
    const [created] = await this.db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
      });

    return created;
  }

  async updateUser(
    userId: string,
    input: Partial<{ email: string; name: string; isAdmin: boolean }>,
  ): Promise<{ id: string; email: string; name: string | null; isAdmin: boolean } | null> {
    const updateData: Partial<{ email: string; name: string; isAdmin: boolean }> = {};
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.isAdmin !== undefined) {
      updateData.isAdmin = input.isAdmin;
    }

    const [updatedUser] = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        isAdmin: users.isAdmin,
      });

    return updatedUser || null;
  }

  async getUserByEmail(email: string): Promise<{ id: string; email: string; name: string | null } | null> {
    const [user] = await this.db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.email, email));

    return user ?? null;
  }
}
