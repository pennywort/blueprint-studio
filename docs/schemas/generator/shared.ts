/**
 * Общие типы (shared): тип описывается один раз в shared/*.schema.json,
 * свойства ссылаются на него через $ref. Состав — таблица SHARED_ENUMS в config.ts.
 */

import * as fs from 'fs';
import * as path from 'path';

import { Project, SyntaxKind, type EnumDeclaration, type Type } from 'ts-morph';

import { SCHEMA_ID_BASE, SHARED_ENUMS, SHARED_ENUM_SUBSET_THRESHOLD, type SharedEnumConfig } from './config';
import { JSON_SCHEMA_DRAFT, type SharedCandidate, type SharedSchema } from './format';

export function enumMemberValues(decl: EnumDeclaration): string[] {
  return decl.getMembers().map((m) => {
    const init = m.getInitializer();
    if (init?.isKind(SyntaxKind.StringLiteral)) return init.getLiteralValue();
    if (init?.isKind(SyntaxKind.NumericLiteral)) return String(init.getLiteralValue());
    return m.getName();
  });
}

interface LoadedShared {
  config: SharedEnumConfig;
  values: string[];
  valueSet: Set<string>;
}

export class SharedRegistry {
  private readonly loaded: LoadedShared[] = [];
  /** Какие shared-файлы реально понадобились в этом прогоне. */
  private readonly used = new Set<string>();
  /** Именованные типы → элементы, где встретились (кандидаты в shared). */
  private readonly usage = new Map<string, { type: string; file: string; usedIn: Set<string> }>();

  constructor(rootDir: string, warn: (msg: string) => void) {
    for (const config of SHARED_ENUMS) {
      const file = path.resolve(rootDir, config.sourceFile);
      if (!fs.existsSync(file)) {
        warn(`[WARN] shared ${config.typeName}: файл не найден ${config.sourceFile}`);
        continue;
      }
      const project = new Project({ compilerOptions: { skipLibCheck: true } });
      const decl = project.addSourceFileAtPath(file).getEnum(config.enumName);
      if (!decl) {
        warn(`[WARN] shared ${config.typeName}: enum ${config.enumName} не найден`);
        continue;
      }
      const values = enumMemberValues(decl);
      this.loaded.push({ config, values, valueSet: new Set(values) });
    }
  }

  private ref(entry: LoadedShared): { $ref: string; nullable: boolean } {
    this.used.add(entry.config.fileName);
    return { $ref: `../shared/${entry.config.fileName}#`, nullable: entry.config.nullable };
  }

  /** Тип узнаётся по имени символа или alias'а. */
  matchType(type: Type): { $ref: string; nullable: boolean } | null {
    const names = [type.getAliasSymbol()?.getName(), type.getSymbol()?.getName()];
    const entry = this.loaded.find((e) => names.includes(e.config.typeName));
    return entry ? this.ref(entry) : null;
  }

  /** Развёрнутый компилятором union литералов: совпадение с enum или крупное подмножество. */
  matchLiterals(values: string[]): { $ref: string; nullable: boolean } | null {
    for (const entry of this.loaded) {
      const subset = values.every((v) => entry.valueSet.has(v));
      if (!subset) continue;
      if (values.length === entry.values.length || values.length > SHARED_ENUM_SUBSET_THRESHOLD) {
        return this.ref(entry);
      }
    }
    return null;
  }

  /** Допускает ли общий тип по ссылке null. */
  refAllowsNull(ref: string): boolean {
    return this.loaded.some((e) => e.config.nullable && ref === `../shared/${e.config.fileName}#`);
  }

  trackUsage(typeName: string, file: string, elementType: string): void {
    const key = `${file}#${typeName}`;
    const rec = this.usage.get(key) ?? { type: typeName, file, usedIn: new Set<string>() };
    rec.usedIn.add(elementType);
    this.usage.set(key, rec);
  }

  candidates(): SharedCandidate[] {
    const sharedNames = new Set(this.loaded.map((e) => e.config.typeName));
    return [...this.usage.values()]
      .filter((r) => r.usedIn.size >= 2 && !sharedNames.has(r.type))
      .map((r) => ({ type: r.type, file: r.file, usedIn: [...r.usedIn].sort() }))
      .sort((a, b) => b.usedIn.length - a.usedIn.length || a.type.localeCompare(b.type));
  }

  /** Схемы shared-файлов, понадобившихся в прогоне: имя файла → схема. */
  schemas(): Record<string, SharedSchema> {
    const out: Record<string, SharedSchema> = {};
    for (const entry of this.loaded) {
      if (!this.used.has(entry.config.fileName)) continue;
      const values: (string | null)[] = [...entry.values];
      if (entry.config.nullable) values.push(null);
      out[entry.config.fileName] = {
        $schema: JSON_SCHEMA_DRAFT,
        $id: `${SCHEMA_ID_BASE}/shared/${entry.config.fileName}`,
        title: entry.config.title,
        type: entry.config.nullable ? ['string', 'null'] : 'string',
        enum: values,
      };
    }
    return out;
  }
}
