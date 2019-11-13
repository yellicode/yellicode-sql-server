import { TextWriter } from "@yellicode/core";
import * as opts from '../options';
import { TSqlWriterBase } from './t-sql-writer-base';
import { SqlServerTable, SqlServerColumn, SqlServerConstraint, SqlServerStoredProcedure } from '../model/sql-server-database';
import { StoredProcedureWriter } from './stored-procedure-writer';
import { Logger } from '@yellicode/core';
import { ConstraintType } from '../../relational/model/database';

export class SqlServerSchemaWriter extends TSqlWriterBase {
    private storedProcedureWriter: StoredProcedureWriter;

    constructor(textWriter: TextWriter, logger?: Logger) {
        super(textWriter, logger);

        this.storedProcedureWriter = new StoredProcedureWriter(textWriter);
    }

    /**
    * Writes a CREATE DATABASE statement that creates a new database and drops the existing one if is exits 
    * (this disabled trough the options parameter). 
    */
    public writeDatabaseDefinition(databaseName: string, options?: opts.DatabaseOptions): void {
        if (!options) options = {};
        // const features = (options.features === undefined) ? opts.DatabaseFeatures.All : options.features;

        this.writeLine(`USE master`);
        if (!options.keepIfExists) {
            this.writeLine();
            this.writeLine(`IF EXISTS(SELECT * from sys.databases WHERE name='${databaseName}') DROP DATABASE [${databaseName}];`);
            this.writeLine(`GO`);
        }

        this.writeLine();
        this.writeLine(`CREATE DATABASE [${databaseName}]`);
        this.writeLine(`GO`);
    }

    public writeTableDefinition(table: SqlServerTable, options?: opts.TableOptions): void {
        if (!options) options = {};

        const hasConstraints = table.constraints && table.constraints.length > 0;
        const features = (options.features === undefined) ? opts.TableFeatures.All : options.features;
        const writeConstraints = hasConstraints && (features & opts.TableFeatures.ForeignKeyConstraints) ? true : false;

        if (!options.keepIfExists) {
            this.writeLine(`IF OBJECT_ID('${table.name}', 'U') IS NOT NULL DROP TABLE [${table.name}];`)
            this.writeLine();
        }

        this.writeLine(`CREATE TABLE [${table.name}]`);
        this.writeCodeBlock(() => {
            table.ownColumns.forEach((c, index) => {
                const isLast = !writeConstraints && index === table.ownColumns.length - 1;
                this.writeColumnDefinition(c, isLast);
            })

            if (writeConstraints) {
                this.writeKeys(table.constraints);
            };
        });
    }

    public writeTableTypeDefinition(tableType: SqlServerTable, options?: opts.TableOptions): void {
        if (!options) options = {};
        const features = (options.features === undefined) ? opts.TableFeatures.All : options.features;

        if (!options.keepIfExists) {
            this.writeLine(`IF EXISTS (SELECT * FROM sys.types WHERE is_user_defined = 1 AND name = '${tableType.name}') DROP TYPE [${tableType.name}];`);
            this.writeLine(`GO`);
            this.writeLine();
        }

        this.writeLine(`CREATE TYPE [${tableType.name}] AS TABLE`);
        this.writeCodeBlock(() => {
            tableType.ownColumns.forEach((c, index) => {
                this.writeColumnDefinition(c, index === tableType.ownColumns.length - 1);
            });
        });
    }

    public writeStoredProcedure(procedure: SqlServerStoredProcedure, options?: opts.StoredProcedureOptions): void {
        if (!options) options = {};
        // const features = (options.features === undefined) ? opts.StoredProcedureFeatures.All : options.features;

        if (!options.keepIfExists) {
            this.writeLine(`IF OBJECT_ID('${procedure.name}', 'P') IS NOT NULL DROP PROC [${procedure.name}];`);
            this.writeLine('GO');
            this.writeLine();
        }

        this.storedProcedureWriter.writeStoredProcedure(procedure);
    }

    private writeColumnDefinition(column: SqlServerColumn, isLast: boolean): void {
        if (!column) return;

        // Start with the current indent
        this.writeIndent();
        // Name        
        this.write(`[${column.name}] [${column.sqlTypeName}]`);
        if (column.length) {
            this.write(`(${column.length})`);
        }
        else {
            if (column.precision || column.scale) {
                const precisionAndScale: string[] = [];
                if (column.precision) {
                    precisionAndScale.push(column.precision.toString());
                }
                if (column.scale) {
                    precisionAndScale.push(column.scale.toString());
                }
                this.write(`(${precisionAndScale.join(',')})`);
            }
        }
        // Identity
        if (column.isIdentity) {
            this.write(` IDENTITY(1,1)`);
        }
        if (!column.isNullable) {
            this.write(' NOT NULL');
        }
        if (!isLast) {
            this.write(',');
        }
        this.writeEndOfLine();
    }

    private writeKeys(keys: SqlServerConstraint[]): void {
        keys.forEach((key, index) => {
            this.writeIndent();
            switch (key.constraintType) {
                case ConstraintType.ForeignKey:
                    this.write(`CONSTRAINT [${key.name}] FOREIGN KEY (${key.columnName}) REFERENCES [${key.primaryKeyTableName}] ([${key.primaryKeyColumnName}])`);
                    if (key.cascadeOnDelete) {
                        this.write(' ON DELETE CASCADE');
                    }
                    break;
                case ConstraintType.PrimaryKey:
                    this.write(`CONSTRAINT [${key.name}] PRIMARY KEY CLUSTERED ([${key.columnName}])`);
                    break;
            }
            if (index < keys.length - 1) {
                this.write(',');
            }
            this.writeEndOfLine();
        });
    }
}