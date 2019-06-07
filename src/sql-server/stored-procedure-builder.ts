import { SqlServerParameter, SqlServerStoredProcedure, SqlServerTable, SqlServerColumn, QueryType, SqlServerQuery } from './model/sql-server-database';
import { SqlServerObjectNameProvider } from './providers/sql-server-object-name-provider';
import { ParameterOptions, ParameterIncludes } from './options';
import * as elements from '@yellicode/elements';
import { Column, SqlParameterDirection, SqlParameter } from '../relational/model/database';
import { TSqlResultSetBuilder } from './writer/t-sql-select-specification-builder';
import { Logger } from '@yellicode/core';

export class StoredProcedureBuilder {
    private result: Map<string, SqlServerStoredProcedure>;
    
    constructor(private objectNameProvider: SqlServerObjectNameProvider, private identityTableType: SqlServerTable, private logger: Logger) {
        this.result = new Map<string, SqlServerStoredProcedure>();
    }

    public getResult(): SqlServerStoredProcedure[] {
        return Array.from(this.result, ([key, value]) => value);        
    }

    private addToResult(procedure: SqlServerStoredProcedure): boolean {
        if (this.result.has(procedure.name)) {
            this.logger.warn(`Not adding stored procedure '${procedure.name}'. A procedure with the same name already exists in the model.`);
            return false;
        }
        this.result.set(procedure.name, procedure);    
    //    const params = procedure.parameters.map(p => {return `${p.name} (${p.typeName} ${SqlParameterDirection[p.direction]})`});
     //   this.logger.info(`Added stored procedure '${procedure.name}'with signature: ${params.join(', ')}`);      
        return true;
    }

    public buildInsert(table: SqlServerTable, type: elements.Type): void {
        const parameterOptions: ParameterOptions = { includes: ParameterIncludes.IdentityAndOther, useIdentityAsOutput: true };
        const parameters = this.buildParameters(table, parameterOptions);
        const procedure: SqlServerStoredProcedure = {
            modelType: type,
            queryType: QueryType.Insert,
            name: '',
            relatedTable: table,
            parameters: parameters
        };
        procedure.name = this.objectNameProvider.getStoredProcNameForQuery(procedure);

        if (this.addToResult(procedure)) {
            this.buildAndAddSubProcedures(procedure);
        }
    }

    public buildUpdateById(table: SqlServerTable, type: elements.Type): void {
        const parameterOptions: ParameterOptions = { includes: ParameterIncludes.IdentityAndOther, useIdentityAsFilter: true };
        const parameters = this.buildParameters(table, parameterOptions);
        
        const procedure: SqlServerStoredProcedure = {
            modelType: type,
            queryType: QueryType.Update,
            name: '',
            relatedTable: table,
            parameters: parameters
        };
        procedure.name = this.objectNameProvider.getStoredProcNameForQuery(procedure);

        if (this.addToResult(procedure)) {
            this.buildAndAddSubProcedures(procedure);
        }
    }

    public buildDeleteById(table: SqlServerTable, type: elements.Type): void {
        const parameterOptions = { includes: ParameterIncludes.Identity, useIdentityAsFilter: true };
        const parameters = this.buildParameters(table, parameterOptions);
        
        const procedure: SqlServerStoredProcedure = {
            modelType: type,
            queryType: QueryType.Delete,
            name: '', // created below using objectNameProvider
            relatedTable: table,
            parameters: parameters
        }
        procedure.name = this.objectNameProvider.getStoredProcNameForQuery(procedure);
        this.addToResult(procedure);      
    }

    public buildSelectById(table: SqlServerTable, type: elements.Type): void {
        const parameterOptions = { includes: ParameterIncludes.Identity, useIdentityAsFilter: true };
        const parameters = this.buildParameters(table, parameterOptions);

        const specificationBuilder = new TSqlResultSetBuilder(this.objectNameProvider, this.logger);
        const resultSet = specificationBuilder.build(table);
        const procedure: SqlServerStoredProcedure = {
            modelType: type,
            queryType: QueryType.SelectSingle,
            name: '',
            relatedTable: table,
            parameters: parameters,
            resultSets: [resultSet]
        };
        procedure.name = this.objectNameProvider.getStoredProcNameForQuery(procedure);
       // this.logger.info(`buildSelectById: Procedure ${procedure.name} has ${procedure.parameters.length} parameters.`)
        this.addToResult(procedure);
    }

    private buildUpdateRelationShipById(table: SqlServerTable, dependentColumn: SqlServerColumn): void {
     
        const idParameter = this.buildIdParameter(table, 0);
        if (!idParameter) {
            this.logger.warn(`Cannot build procedure because the identity column of table '${table.name}' could not be determined.`);
            return;
        }

        const parameters: SqlServerParameter[] = [];
        parameters.push(idParameter);

        // Then, add a table type parameter that lets us pass a list of Ids
        const idColumn = dependentColumn.table.ownColumns.find(c => c.isIdentity);
        if (!idColumn) {
            // TODO: warn
            return;
        }

        const idListParameter = this.buildIdListParameter(idColumn, 1);
        parameters.push(idListParameter);


        // const parameterName = this.objectNameProvider.getParameterName(idColumn.name, dependentColumn.isMany || false); // EmployeeIdTable         
        // const sqlTypeName = this.objectNameProvider.getTableTypeName(idColumn.typeName);
        // console.log(`Param name: ${parameterName}. Param type: ${sqlTypeName}`);

        const procedure: SqlServerStoredProcedure = {
            modelType: table.objectType!,
            queryType: QueryType.UpdateRelationship,
            name: '',
            relatedTable: table,
            parameters: parameters,
            dependentColumn: dependentColumn
        }
        procedure.name = this.objectNameProvider.getStoredProcNameForQuery(procedure);     

       // const name = `Update${table.name}${relationName}`; // todo: use objectNameProvider

        if (this.result.has(procedure.name)) {
            return;
        }

        this.addToResult(procedure);
    }

    private buildIdListParameter(relatedColumn: SqlServerColumn, index: number): SqlServerParameter {
        const identityType = this.identityTableType.objectType!;
        
        const tableTypeName = this.objectNameProvider.getSimpleTableTypeName(identityType, relatedColumn.sqlTypeName)
        return {
            name: this.objectNameProvider.getParameterName(relatedColumn.name, true),
            index: index,
            tableType: this.identityTableType,            
            sqlTypeName: tableTypeName,            
            tableName: null,
            columnName: relatedColumn.name,
            objectTypeName: identityType.name,
            objectProperty: null,            
            direction: SqlParameterDirection.Input,
            isTableValued: true,
            isMultiValued: true,
            isIdentity: false,
            isNullable: false,
            isReadOnly: true, // important
            length: null,
            precision: null,
            scale: null,
            isFilter: false
        }      
    }

    protected buildAndAddSubProcedures(procedure: SqlServerStoredProcedure): void {     
        const table = procedure.relatedTable;
        if (!table) 
            return; // todo: log this

        table.dependentColumns.forEach(col => {
            this.buildUpdateRelationShipById(table, col);                    
        })
    }

    private buildIdParameter(table: SqlServerTable, index: number): SqlServerParameter | null {
        const idColumn = table.ownColumns.find(c => c.isIdentity);
        if (!idColumn || !idColumn.objectProperty) return null;
        const p: SqlServerParameter = 
         {
            name: this.objectNameProvider.getParameterName(idColumn.name, false),            
            index: index,
            objectProperty: idColumn.objectProperty,
            objectTypeName: idColumn.objectProperty.type!.getQualifiedName(),
            tableName: table.name,      
            columnName: idColumn.name,
            isNullable: false,
            isReadOnly: false,
            sqlTypeName: idColumn.sqlTypeName,
            length: idColumn.length,
            precision: idColumn.precision,
            scale: idColumn.scale,
            direction: SqlParameterDirection.Input,
            isIdentity: true,
            isFilter: false,
            isTableValued: false,
            isMultiValued: false,
            tableType: null            
        }        
        return p;
    }

  
    private buildParameters(table: SqlServerTable, options: ParameterOptions, filter?: (value: SqlServerColumn) => boolean): SqlServerParameter[] {
        const includes = (options.includes === undefined) ? ParameterIncludes.IdentityAndOther : options.includes;
        const ownColumns = StoredProcedureBuilder.filterColumns(table.ownColumns, includes, filter);

        // Note: disabled dependentColumns. It's better to create dedicated, reusable SP's for setting relationships.
        const dependentColumns: SqlServerColumn[] = [];// StoredProcedureBuilder.filterColumns(table.dependentColumns, includes, filter);

        const parameters: SqlServerParameter[] = [];
        let paramIndex = 0;

        ownColumns.forEach((ownColumn) => {
            if (ownColumn.isMany) {
                this.logger.verbose(`Not creating parameter for column '${table.name}.${ownColumn.name}' because the column is the foreign key in a one-to-many relationship .`);
                return; 
            }

            const modelProperty = ownColumn.objectProperty;
            if (!modelProperty || !modelProperty.type){
                this.logger.warn(`Not creating parameter for column '${table.name}.${ownColumn.name}' because the property type is unknown.`);
                return;
            }

            const isOutput = ownColumn.isIdentity && options.useIdentityAsOutput ? true: false;
            const isFilter = ownColumn.isIdentity && options.useIdentityAsFilter ? true: false;

            const ownParameter: SqlServerParameter = {
                name: this.objectNameProvider.getParameterName(ownColumn.name, false),                
                index: paramIndex++,
                tableName: ownColumn.table.name, 
                columnName: ownColumn.name,
                objectTypeName: modelProperty.type.getQualifiedName(),
                objectProperty: modelProperty,
                isIdentity: ownColumn.isIdentity,
                isNullable: options.allowNulls || !ownColumn.isNullable,
                isReadOnly: false,
                sqlTypeName: ownColumn.sqlTypeName,
                length: ownColumn.length,
                precision: ownColumn.precision,
                scale: ownColumn.scale,
                direction: isOutput ? SqlParameterDirection.Output : SqlParameterDirection.Input,
                isFilter: isFilter,
                isTableValued: false,
                isMultiValued: false,
                tableType: null,
            }
            parameters.push(ownParameter);
        });

        // dependentColumns.forEach((col, index) => {
        //     const prop = col.sourceProperty!;
        //     const isMany = col.isMany || false;
        //     const colName = this.objectNameProvider.getColumnName(prop);
        //     const paramName = this.objectNameProvider.getParameterName(colName, isMany);

        //     //  @CompanyIdTable IntTable READONLY, <!-- should be AddressIdTable or VisitAddressesIdTable when in the context of InsertCompany
        //     //	@CompanyId_VisitAddressesTable IntTable READONLY

        //     const typeName = this.objectNameProvider.getParameterTypeName(col.typeName, isMany);
        //     const dependentParameter: SqlServerParameter = {
        //         name: paramName,
        //         relatedColumn: col,
        //         isNullable: options.allowNulls || !col.isRequired,
        //         isReadOnly: prop.isMultivalued(), // Make readonly if this is a table type
        //         typeName: typeName,
        //         length: null, // todo: columnSpecProvider()
        //         precision: 0, // todo: columnSpecProvider()
        //         scale: 0, // todo: columnSpecProvider()
        //         direction: SqlParameterDirection.Input,
        //         isFilter: false
        //     }
        //     parameters.push(dependentParameter);
        // });

        // Sort parameters by direction       
        return parameters.sort((a,b) => {return a.direction - b.direction});
    }
  
    protected static filterColumns<TColumn extends Column>(columns: TColumn[], includes: ParameterIncludes, filter?: (value: TColumn) => boolean): TColumn[] {

        const includeIdentity = (includes & ParameterIncludes.Identity) ? true : false;
        const includeOtherColumns = (includes & ParameterIncludes.Other) > 0;

        return columns.filter(p => {
            // First apply any custom filtering
            if (filter && (filter(p) === false))
                return false;

            return p.isIdentity ? includeIdentity : includeOtherColumns;
        });
    }
}