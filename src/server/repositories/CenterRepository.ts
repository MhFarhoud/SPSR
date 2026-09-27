import { Center } from "../../types";
import { Repository } from "./Repository";
import { db } from "../db";

export class CenterRepository extends Repository<Center> {
  protected getCollection(): Center[] {
    return db.data.centers;
  }

  protected persist(): void {
    db.persist();
  }
}

export const centerRepository = new CenterRepository();
