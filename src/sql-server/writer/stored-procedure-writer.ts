import { TextWriter } from "@yellicode/templating";
import { SqlServerStoredProcedure, SqlServerParameter, SqlServerTable, QueryType, SqlServerColumn } from '../model/sql-server-database';
import { SqlServerObjectNameProvider } from '../providers/sql-server-object-name-provider';
import { TSqlWriterBase } from './t-sql-writer-base';
import { SqlParameterDirection, SqlSelectSpecification } from '../../relational/model/database';
import { TSqlSelectSpecificationBuilder } from './t-sql-select-specification-builder';
import { Logger } from '@yellicode/core';

export class StoredProcedureWriter extends TSqlWriterBase {

    constructor(textWriter: TextWriter, logger?: Logger) {
        super(textWriter, logger);
    }

    private writeWhereStatement(parameters: SqlServerParameter[]): void {
        this.writeLine('WHERE');
        this.increaseIndent();
        parameters.forEach((param, index) => {
            const colName = param.name;
            const table = param.sourceColumn.table;
            this.writeIndent();
            if (param.isNullable) {
                this.write(`[${table.name}].[${colName}] = ISNULL(@${param.name}, [${table.name}].[${param.name}])`);
            }
            else this.write(`[${table.name}].[${colName}] = @${param.name}`);
            if (index < parameters.length - 1) {
                this.write(' AND'); // TODO: AND/OR option 
            }
            this.writeEndOfLine();
        });
        this.decreaseIndent();
    }

    private writeInsertQuery(table: SqlServerTable, parameters: SqlServerParameter[]): void {
        const columnNames: string[] = [];
        const parameterNames: string[] = [];
        let idParameter: SqlServerParameter | null = null;

        parameters.forEach(p => {
            if (p.sourceColumn.isIdentity) {
                idParameter = p;
            }
            if (p.direction === SqlParameterDirection.Output || p.direction === SqlParameterDirection.ReturnValue)
                return;

            parameterNames.push(`@${p.name}`);
            columnNames.push(p.sourceColumn.name);
        });

        this.writeLine(`INSERT INTO`);
        if (columnNames.length === 0) {
            // There's nothing to insert
            this.writeLineIndented(`[${table.name}]`);
            this.writeLine(`DEFAULT VALUES`);
        }
        else {
            this.writeLineIndented(`[${table.name}] (${columnNames.join(', ')})`);
            this.writeLine(`VALUES`);
            this.writeLineIndented(`(${parameterNames.join(', ')})`);
        }

        this.writeLine();
        if (idParameter) {
            this.writeLine(`SET @${idParameter!.name} = SCOPE_IDENTITY();`);
        }
    }

    private writeUpdateQuery(table: SqlServerTable, parameters: SqlServerParameter[]): void {
        const setParameters: SqlServerParameter[] = [];
        const filterParameters: SqlServerParameter[] = [];

        parameters.forEach(p => {
            if (p.direction === SqlParameterDirection.Output || p.direction === SqlParameterDirection.ReturnValue)
                return;

            if (p.isFilter) {
                filterParameters.push(p);
            }
            else {
                setParameters.push(p);
            }
        });

        if (setParameters.length > 0) {
            this.writeLine(`UPDATE`);
            this.writeLineIndented(`[${table.name}]`);
            this.writeLine('SET');
            this.increaseIndent();
            setParameters.forEach((param, index) => {
                const colName = param.sourceColumn.name;
                this.writeIndent();
                this.write(`[${colName}] = @${param.name}`);
                if (index < setParameters.length - 1) this.write(',');
                this.writeEndOfLine();
            });
            this.decreaseIndent();
        }
        // WHERE        
        this.writeWhereStatement(filterParameters);
    }

    private writeSelectQuery(table: SqlServerTable, parameters: SqlServerParameter[], selection: SqlSelectSpecification[]): void {
        const filterParameters: SqlServerParameter[] = parameters.filter(p => p.isFilter);

        // SELECT 
        this.writeLine('SELECT')
        this.increaseIndent();
        selection.forEach((spec, index) => {
            this.writeIndent();
            this.write(spec.selection);
            if (spec.alias) {
                this.write(` AS ${spec.alias}`);
            }
            if (index < selection.length - 1) this.write(',');
            this.writeEndOfLine();
        })
        this.decreaseIndent();

        // 2) FROM        
        this.writeLine('FROM');
        this.increaseIndent();
        this.writeLine(`[${table.name}]`);

        // 2A) JOIN. TODO: prefer multiple result sets!!!
        table.dependentColumns.forEach(c => {
            if (c.isMany) {
                const pkColumn = table.ownColumns.find(c => c.isIdentity);
                if (!pkColumn) return;
                this.writeIndent();
                this.write(`LEFT JOIN [${c.table.name}]`);
                if (c.role) {
                    this.write(` AS [${c.role}]`);
                }
                this.write(` ON [${c.role || c.table.name}].[${c.name}] = [${table.name}].[${pkColumn.name}]`);
                this.writeEndOfLine();
            }
            else this.writeLine(`-- TODO: add dependent column: ${c.name}`);
        });
        this.decreaseIndent();

        // WHERE        
        this.writeWhereStatement(filterParameters);
    }

    private writeDeleteQuery(table: SqlServerTable, parameters: SqlServerParameter[]): void {
        const filterParameters: SqlServerParameter[] = [];
        parameters.forEach(p => {
            if (p.direction === SqlParameterDirection.Output || p.direction === SqlParameterDirection.ReturnValue)
                return;

            if (p.isFilter) {
                filterParameters.push(p);
            }
        });

        this.writeLine(`DELETE`);
        this.writeLineIndented(`[${table.name}]`);

        this.writeWhereStatement(filterParameters);
    }

    private writeUpdateRelationshipQuery(dependentColumn: SqlServerColumn, parameters: SqlServerParameter[]): void {
        const dependentTable = dependentColumn.table;
        const dependentIdentity = dependentTable.ownColumns.find(c => c.isIdentity);

        if (!dependentIdentity){
            this.logger.error(`Cannot write query to update '${dependentTable.name}.${dependentColumn.name}'. Unable to determine the identity column of table ${dependentTable.name}.`);
            return;
        }

        const idParameter = parameters.find(p => p.sourceColumn.isIdentity);
        if (!idParameter) {
            this.logger.error(`Cannot write query to update '${dependentTable.name}.${dependentColumn.name}'. Unable to determine the identity parameter.`);
            return;
        }

        const valuesParameter = parameters.find(p => p.isTableValued);
        if (!valuesParameter) {
            this.logger.error(`Cannot write query to update '${dependentTable.name}.${dependentColumn.name}'. Unable to determine the values parameter.`);
            return;
        }
        const tableType = valuesParameter.tableType;
        if (!tableType || tableType.ownColumns.length === 0){
            this.logger.error(`Cannot write query to update '${dependentTable.name}.${dependentColumn.name}'. The values parameter is table valued but does not have a valid tableType.`);
            return;
        }
        const valueColumn = tableType.ownColumns[0];

        // Well, this is the actual SQL code -:)

        // TODO: aggregate vs composite! (DELETE vs UPDATE).        
        // this.writeLine(`UPDATE [${dependentTable.name}] SET [${dependentColumn.name}] = NULL WHERE [${dependentColumn.name}] = @${idParameter.name} AND [${dependentIdentity.name}] NOT IN (SELECT [${valueColumn.name}] FROM @${valuesParameter.name})`);        
        this.writeLine(`DELETE [${dependentTable.name}] WHERE [${dependentColumn.name}] = @${idParameter.name} AND [${dependentIdentity.name}] NOT IN (SELECT [${valueColumn.name}] FROM @${valuesParameter.name})`);        
        this.writeLine(`UPDATE [${dependentTable.name}] SET [${dependentColumn.name}] = @${idParameter.name} WHERE [${dependentIdentity.name}] IN (SELECT [${valueColumn.name}] FROM @${valuesParameter.name})`);
    }

     public writeStoredProcedure(procedure: SqlServerStoredProcedure): void {
        this.writeLine(`CREATE PROCEDURE [${procedure.name}]`);
        this.writeCodeBlock(() => {
          //  this.logger.info(`Procedure ${procedure.name} has ${procedure.parameters.length} parameters.`)
            this.writeParameterList(procedure.parameters);
        });
        this.writeLine('AS');
        this.writeCodeBlockBeginEnd(() => {
            this.writeSetNoCount();
            switch (procedure.queryType) {
                case QueryType.Insert:
                    this.writeInsertQuery(procedure.table, procedure.parameters);
                    break;
                case QueryType.Update:
                    this.writeUpdateQuery(procedure.table, procedure.parameters);
                    break;
                case QueryType.UpdateRelationship:
                    this.writeUpdateRelationshipQuery(procedure.dependentColumn!, procedure.parameters);
                    break;
                case QueryType.Delete:
                    this.writeDeleteQuery(procedure.table, procedure.parameters);
                    break;              
                case QueryType.SelectSingle:
                    if (procedure.selection) {
                        this.writeSelectQuery(procedure.table, procedure.parameters, procedure.selection);
                    }
                    else {
                        this.logger.warn(`Skipping code for stored procedure '${procedure.name}'. There are no columns to select.`);
                    }
                    break;
                default:
                    this.logger.error(`Cannot write stored procedure '${procedure.name}'. The procedure has an unsupported query type '${QueryType[procedure.queryType]}'.`);
                    break;
            }
        });
    }

    private writeParameter(param: SqlServerParameter, isLast: boolean): void {
        this.writeIndent();
        this.write(`@${param.name} ${param.typeName}`);
        if (param.length) {
            this.write(`(${param.length})`);
        }
        if (param.isNullable) {
            this.write(' = NULL');
        }
        switch (param.direction) {
            case SqlParameterDirection.InputOutput:
            case SqlParameterDirection.Output:
                this.write(' OUTPUT');
                break;
        }
        if (param.isReadOnly) {
            this.write(' READONLY');
        }
        if (!isLast) this.write(',');
        this.writeEndOfLine();
    }

    private writeParameterList(parameters: SqlServerParameter[]): void {
        parameters.forEach((p, index) => {
            this.writeParameter(p, index == parameters.length - 1)
        });
    }

    private writeSetNoCount(on: boolean = true): void {
        const value: string = on ? 'ON' : 'OFF';
        this.writeLine(`SET NOCOUNT ${value}`);
    }
}