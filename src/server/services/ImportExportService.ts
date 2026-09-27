import * as xlsx from "xlsx";
import { childService } from "./ChildService";
import { centerRepository } from "../repositories/CenterRepository";

export interface ImportPreviewResult {
  total: number;
  valid: number;
  invalid: number;
  rows: Array<{
    rowIndex: number;
    data: any;
    isValid: boolean;
    errors: string[];
  }>;
}

export class ImportExportService {
  
  public parseAndValidateChildrenExcel(buffer: Buffer): ImportPreviewResult {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet) as any[];

    const result: ImportPreviewResult = {
      total: rawData.length,
      valid: 0,
      invalid: 0,
      rows: []
    };

    rawData.forEach((row, index) => {
      const errors: string[] = [];
      const rowIndex = index + 2; // Assuming row 1 is header

      // Validate required fields based on Template
      if (!row["کد ملی"]) errors.push("کد ملی الزامی است");
      if (!row["نام"]) errors.push("نام الزامی است");
      if (!row["نام خانوادگی"]) errors.push("نام خانوادگی الزامی است");
      if (!row["تاریخ تولد"]) errors.push("تاریخ تولد الزامی است");
      if (!row["جنسیت"]) errors.push("جنسیت الزامی است");
      if (!row["شماره تماس والد"]) errors.push("شماره تماس والد الزامی است");

      // Validate enums
      if (row["جنسیت"] && !["پسر", "دختر"].includes(row["جنسیت"])) {
        errors.push("جنسیت باید 'پسر' یا 'دختر' باشد");
      }

      // We would normally validate Center by name and map to ID here
      // Let's assume there is a Center column
      if (row["مرکز"]) {
        const center = centerRepository.findAll().find(c => c.name === row["مرکز"]);
        if (!center) {
          errors.push(`مرکز ناشناخته: ${row["مرکز"]}`);
        } else {
          row._centerId = center.id; // Map for commit phase
        }
      } else {
        errors.push("مرکز الزامی است");
      }

      const isValid = errors.length === 0;
      if (isValid) result.valid++;
      else result.invalid++;

      result.rows.push({
        rowIndex,
        data: row,
        isValid,
        errors
      });
    });

    return result;
  }

  public commitImport(validRows: any[]): number {
    let committed = 0;
    for (const row of validRows) {
      try {
        childService.registerChild({
          nationalId: row["کد ملی"],
          firstName: row["نام"],
          lastName: row["نام خانوادگی"],
          birthDate: row["تاریخ تولد"],
          gender: row["جنسیت"],
          parentContactPhone: row["شماره تماس والد"],
          parentName: row["نام والد"],
          currentCenterId: row._centerId, // Mapped during validation
          currentStage: row["مقطع"] || "مهد",
        });
        committed++;
      } catch (e) {
        console.error("Failed to commit row", row, e);
      }
    }
    return committed;
  }
}

export const importExportService = new ImportExportService();
