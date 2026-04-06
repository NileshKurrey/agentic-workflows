import type { Container } from "../di/container";
import { DEPENDENCIES } from "../di/container";
import type { IHttpRequest, IHttpResponse } from "../di/http-handler";
import type { UserService } from "../services/user-service";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export class UserController {
  constructor(private readonly container: Container) {}

  async createUser(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    try {
      const userService = this.container.get<UserService>(DEPENDENCIES.USER_SERVICE);
      const payload = req.body as { email?: string; name?: string };

      if (!payload.email || !isValidEmail(payload.email)) {
        res.status(400).json({ error: "valid email is required" });
        return;
      }

      if (payload.name && payload.name.length > 120) {
        res.status(400).json({ error: "name exceeds maximum length" });
        return;
      }

      const user = await userService.createUser({
        email: payload.email,
        name: payload.name,
      });

      res.status(201).json(user);
    } catch (error) {
      console.error("Failed to create user", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
}
