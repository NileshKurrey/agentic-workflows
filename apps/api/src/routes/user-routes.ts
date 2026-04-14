import type { IRouter } from "../di/adapters/http-handler";
import { UserController } from "../controllers/user-controller";

export function createUserRoutes(router: IRouter, userController: UserController): void {
  router.post("/", (req, res) => userController.createUser(req, res));
}
