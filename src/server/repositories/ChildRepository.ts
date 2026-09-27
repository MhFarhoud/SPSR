import { Child } from "../../types";
import { Repository } from "./Repository";
import { db } from "../db";

export class ChildRepository extends Repository<Child> {
  protected getCollection(): Child[] {
    return db.data.children;
  }

  protected persist(): void {
    db.persist();
  }

  public findByChildId(childId: string): Child | undefined {
    return this.getCollection().find(c => c.childId === childId);
  }

  // Advanced search could be implemented here or in the service layer
}

export const childRepository = new ChildRepository();
