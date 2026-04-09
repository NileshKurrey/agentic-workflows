import type { Container } from "../di/container";
import { DEPENDENCIES } from "../di/container";
import type { IHttpRequest, IHttpResponse } from "../di/http-handler";
import type { UserService } from "../services/user-service";
import { ValidationError } from "../errors";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export class UserController {
  constructor(private readonly container: Container) {}

  async createUser(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    const userService = this.container.get<UserService>(DEPENDENCIES.USER_SERVICE);
    const payload = req.body as { email?: string; name?: string };

    // Validation - throws ValidationError
    if (!payload.email || !isValidEmail(payload.email)) {
      throw new ValidationError("Valid email is required");
    }

    if (payload.name && payload.name.length > 120) {
      throw new ValidationError("Name exceeds maximum length (120 characters)");
    }

    const user = await userService.createUser({
      email: payload.email,
      name: payload.name,
    });

    res.status(201).json(user);
  }
}
