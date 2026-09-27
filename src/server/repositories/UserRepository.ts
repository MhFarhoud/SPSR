import { User } from "../../types";
import { Repository } from "./Repository";
import { db } from "../db";

export class UserRepository extends Repository<User> {
  protected getCollection(): User[] {
    return db.data.users;
  }

  protected persist(): void {
    db.persist();
  }

  public findByPhone(phone: string): User | undefined {
    return this.getCollection().find(u => u.phone === phone);
  }
}

export const userRepository = new UserRepository();
