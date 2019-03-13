import * as elements from '@yellicode/elements';
import { TextWriter } from '@yellicode/templating';
import { TSqlSelectWriter } from './t-sql-select-writer';
import { TSqlWriterBase } from './t-sql-writer-base';
import { SqlServerTable, SqlServerColumn } from '../model/sql-server-database';
import { SqlServerObjectNameProvider } from '../providers/sql-server-object-name-provider';
import { TSqlParameterWriter } from './t-sql-parameter-writer';
import * as opts from '../options';

export class TSqlQueryWriter extends TSqlWriterBase {
    private sqlSelectWriter: TSqlSelectWriter;
    private sqlParameterWriter: TSqlParameterWriter;

    /**
    * Constructor. Creates a new SqlWriter instance using the TextWriter and options provided.
    * @param textWriter The template's current TextWriter.
    * @param options Optional: the global options for this writer.
    */
    constructor(textWriter: TextWriter, private objectNameProvider: SqlServerObjectNameProvider) {
        super(textWriter);
        // Create delegate writers     
        this.sqlSelectWriter = new TSqlSelectWriter(textWriter, this.objectNameProvider);
        this.sqlParameterWriter = new TSqlParameterWriter(textWriter, this.objectNameProvider);
    }

    public writeParameterList(table: SqlServerTable, options: opts.ParameterOptions, filter?: (value: SqlServerColumn) => boolean): void {
        // Delegate...
        this.sqlParameterWriter.writeParameterList(table, options, filter);
    }

    public writeInsertQuery(table: SqlServerTable, parameterOptions: opts.ParameterOptions, insertPropertiesFilter?: (value: SqlServerColumn) => boolean): void {
        const columnNames: string[] = [];
        const parameterNames: string[] = [];
        const includes = (parameterOptions.includes === undefined) ? opts.ParameterIncludes.Other : parameterOptions.includes;
        const includeIdentity = (includes & opts.ParameterIncludes.Identity) ? true : false;

        let outputParameter: SqlServerColumn | null = null;
        let idColumn: SqlServerColumn | null = null;
        let idParameterName: string | null = null;

        table.ownColumns.forEach(col => {
            if (col.isIdentity) {
                idColumn = col;
                idParameterName = this.getParameterName(col);
            }

            if (insertPropertiesFilter && (insertPropertiesFilter(col) === false))
                return;

            if (col.isIdentity) {
                if (parameterOptions.useIdentityAsOutput) outputParameter = col;
                if (!includeIdentity || parameterOptions.useIdentityAsOutput) {
                    return;
                }
            }

            columnNames.push(col.name);
            parameterNames.push(`@${this.getParameterName(col)}`);
        });
    
        if (!outputParameter && idColumn) {
            // Just in case there is no output parameter: always create a ID variable in case we need it internally       
            this.writeLine(`DECLARE @${idParameterName} ${idColumn!.sqlTypeName};`);
        }

        this.writeLine(`INSERT INTO`);
        if (columnNames.length === 0) {
            this.writeLineIndented(`[${table.name}]`);
            this.writeLine(`DEFAULT VALUES`);
        }
        else {
            this.writeLineIndented(`[${table.name}] (${columnNames.join(', ')})`);
            this.writeLine(`VALUES`);
            this.writeLineIndented(`(${parameterNames.join(', ')})`);
        }

        this.writeLine();
        this.writeLine(`SET @${idParameterName} = SCOPE_IDENTITY();`);

        // Now that we have an entity id, use it to insert FK relations
        if (idColumn && table.dependentColumns.length) {
            table.dependentColumns.forEach(c => {
                // Example: UPDATE [Employee] SET [DepartmentId] = @DepartmentId WHERE [EmployeeId] IN (SELECT [Value] FROM @EmployeeIdTable)           
                const idColumn = c.table.ownColumns.find(c => c.isIdentity);
                if (idColumn) {
                    const parameterName = this.getParameterName(idColumn, c.isMany); // EmployeeIdTable 
                    //const tableParameterColName = this.objectNameProvider.getSimpleTableTypeColumnName(c.table.sourceType!);
                    // this.writeLine(`UPDATE [${c.table.name}] SET [${c.name}] = @${idParameterName} WHERE [${idColumn.name}] IN (SELECT [${tableParameterColName}] FROM @${parameterName})`);
                }

            });
            // multiValuedRelationships.forEach(p => {
            //     if (!p.type) return;
            // Because the relationship is multiValued, a table type is used to pass a list of IDs
            // Example: UPDATE [Employee] SET [DepartmentId] = @DepartmentId WHERE [EmployeeId] IN (SELECT [Value] FROM @EmployeesId)
            // const relatedTableName = this.objectNameProvider.getTableName(p.type); // Employee
            // const relatedIdColName = this.getIdentityColumnName(p.type); // EmployeeId
            // const relatedColName = this.objectNameProvider.getColumnName(idColumn!); // DepartmentId
            // const parameterName = this.getParameterName(p); // EmployeesIdTable              
            // const tableParameterColName = 'todo'; // this.objectNameProvider.getSimpleTableTypeColumnName(idProperty!.type!); // Value
            //     this.writeLine(`UPDATE [${relatedTableName}] SET [${relatedColName}] = @${idParameterName} WHERE [${relatedIdColName}] IN (SELECT [${tableParameterColName}] FROM @${parameterName})`);
            // })
        }
    }

    public writeUpdateQuery(
        table: SqlServerTable,
        parameterOptions: opts.ParameterOptions,
        parameterFilter?: (value: SqlServerColumn) => boolean,
        setPropertiesFilter?: (value: SqlServerColumn) => boolean): void {

        const multiValuedRelationships: elements.Property[] = [];
        let setColumns: SqlServerColumn[] = [];
        let idColumn: SqlServerColumn | null = null;
        let idParameterName: string | null = null;

        table.ownColumns.forEach(p => {
            if (p.isIdentity) {
                idColumn = p;
                idParameterName = this.getParameterName(p);
                return; // identity columns can never be updated (regardless of parameterOptions)
            }

            // TODO

            // if (p.isMultivalued()) {
            //     multiValuedRelationships.push(p); // Update differently
            //     return;
            // }
            setColumns.push(p);
        });

        if (setPropertiesFilter) {
            setColumns = setColumns.filter(setPropertiesFilter);
        }

        // UPDATE           
        if (setColumns.length > 0) {
            const setColumnNames = setColumns.map(p => { return p.name; });
            this.writeLine(`UPDATE`);
            this.writeLineIndented(`[${table.name}]`);
            this.writeLine('SET');
            this.increaseIndent();
            setColumnNames.forEach((columnName, index) => {
                const parameterName = this.objectNameProvider.getParameterName(columnName, false);
                this.writeIndent();
                this.write(`[${columnName}] = @${parameterName}`);
                if (index < setColumnNames.length - 1) this.write(',');
                this.writeEndOfLine();
            });
            this.decreaseIndent();
            // WHERE        
            // this.writeWhereStatement(table, parameterOptions, parameterFilter);
        }

        // Update FK relations
        this.writeLine('-- TODO: update multi-valued relationships');
        // if (idColumn && idColumn!.type) {
        //     multiValuedRelationships.forEach(p => {
        //         if (!p.type) return;
        //         // Because the relationship is multiValued, a table type is used to pass a list of IDs. Use this list 
        //         // to clear existing relationships and update new ones
        //         // Example: 
        //         //  UPDATE [Employee] SET [DepartmentId] = @DepartmentId WHERE [EmployeeId] IN (SELECT [Value] FROM @EmployeesId)
        //         //  UPDATE [Employee] SET [DepartmentId] = NULL WHERE [DepartmentId] = @DepartmentId AND [EmployeeId] NOT IN (SELECT [Value] FROM @EmployeesIdTable)
        //         const relatedTableName = this.objectNameProvider.getTableName(p.type); // Employee
        //         const relatedIdColName = this.getIdentityColumnName(p.type); // EmployeeId
        //         const relatedColName = this.objectNameProvider.getColumnName(idColumn!); // DepartmentId
        //         const parameterName = this.getParameterName(p); // EmployeesIdTable              
        //         const tableParameterColName = 'todo';// this.objectNameProvider.getSimpleTableTypeColumnName(idProperty!.type!); // Value
        //         this.writeLine(`UPDATE [${relatedTableName}] SET [${relatedColName}] = NULL WHERE [${relatedColName}] = @${idParameterName} AND [${relatedIdColName}] NOT IN (SELECT [${tableParameterColName}] FROM @${parameterName})`);
        //         this.writeLine(`UPDATE [${relatedTableName}] SET [${relatedColName}] = @${idParameterName} WHERE [${relatedIdColName}] IN (SELECT [${tableParameterColName}] FROM @${parameterName})`);
        //     });
        // }
    }

    public writeDeleteQuery(table: SqlServerTable, parameterOptions: opts.ParameterOptions, parameterFilter?: (value: SqlServerColumn) => boolean): void {
        // DELETE        
        this.writeLine(`DELETE`);
        this.writeLineIndented(`[${table.name}]`);
        // WHERE          
      //  this.writeWhereStatement(table, parameterOptions, parameterFilter);
    }

    public writeSelectQuery(table: SqlServerTable,
        parameterOptions: opts.ParameterOptions,
        parameterFilter?: (value: SqlServerColumn) => boolean,
        selectColumnsFilter?: (value: SqlServerColumn) => boolean): void {
        // Delegate...
        this.sqlSelectWriter.writeSelectQueryInternal(table, parameterOptions, parameterFilter, selectColumnsFilter);
    }   
}