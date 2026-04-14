import type { Container } from "../di/core/container";
import { DEPENDENCIES } from "../di/core/container";
import type { IHttpRequest, IHttpResponse } from "../di/adapters/http-handler";
import type { UserService } from "../services/user-service";
import { ValidationError } from "../errors";
import { getLogger } from "../di";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export class UserController {
  constructor(private readonly container: Container) {

  }
   private userService = this.container.get<UserService>(DEPENDENCIES.USER_SERVICE);
  private logger = getLogger(this.container)

  async createUser(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    
    const payload = req.body as { email?: string; name?: string };

    // Validation - throws ValidationError
    if (!payload.email || !isValidEmail(payload.email)) {
      this.logger.error("Email is Not Valid")
      throw new ValidationError("Valid email is required");
    }

    if (payload.name && payload.name.length > 120) {
      throw new ValidationError("Name exceeds maximum length (120 characters)");
    }

    const user = await this.userService.createUser({
      email: payload.email,
      name: payload.name,
    });
    if(!user){
      this.logger.error("User Not created!")
    }
    res.status(201).json(user);
    this.logger.info(`User created with ID: ${user.id}`);
  }
}
