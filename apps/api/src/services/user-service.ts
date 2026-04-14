import type { Container } from "../di/core/container";
import type { Store } from "@repo/db";

export interface CreateUserRequest {
  email: string;
  name?: string;
}

export class UserService {
  private readonly store: Store;

  constructor(container: Container) {
    this.store = container.get<Store>("store");
  }

  async createUser(input: CreateUserRequest): Promise<{ id: string; email: string; name: string | null }> {
    const existing = await this.store.getUserByEmail(input.email);

    if (existing) {
      return existing;
    }

    return this.store.createUser(input);
  }
}
