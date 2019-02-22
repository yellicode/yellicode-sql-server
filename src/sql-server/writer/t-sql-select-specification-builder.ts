import { SqlResultSet, SqlResultSetColumn } from '../../relational/model/database';
import { SqlServerObjectNameProvider } from '../providers/sql-server-object-name-provider';
import { SqlServerTable, SqlServerColumn } from '../model/sql-server-database';
import { Logger } from '@yellicode/core';

export class TSqlResultSetBuilder {

    constructor(private objectNameProvider: SqlServerObjectNameProvider, private logger: Logger) {

    }

    private buildSqlResultSet(tableName: string, column: SqlServerColumn, parentColumn: SqlServerColumn | null): SqlResultSet {
        const columnName = column.name;      

        const isJoined = parentColumn !== null;
        const resultSetColumn: SqlResultSetColumn = {
            alias: isJoined ? this.objectNameProvider.getColumnAlias(tableName, columnName) : null,
            sourceTable: tableName,
            sourceColumn: columnName,
            parentColumn: parentColumn ? parentColumn.name : null,
            isJoined: isJoined,
            isForeignKey: column.isForeignKey,
            isNullable: column.isNullable,
            typeName: column.typeName
            // property: property,
            // entityType: property.owner as elements.Type,
            // parentProperty: parentProperty 
        };

        // specification.isGeneratedIdentity = false;
        return {columns: [resultSetColumn]};
    }

    public build(table: SqlServerTable, selectColumnsFilter?: (value: SqlServerColumn) => boolean): SqlResultSet[] {
        const specifications: SqlResultSet[] = [];        

        // 1) Select own properties
        table.ownColumns.forEach(ownColumn => {
            if (selectColumnsFilter && (selectColumnsFilter(ownColumn) === false)) {
                return;
            };

            if (!ownColumn.isNavigableInModel) 
                return; 

            specifications.push(this.buildSqlResultSet(table.name, ownColumn, null));
        });

        table.dependentColumns.forEach(dependentColumn => {
            const dependentTable = dependentColumn.table;

            // For example, if the Address table has 2 roles (e.g. VisitAddresses and PostalAddresses), the table alias
            // will be one of these names instead of just "Address".            
            const tableNameOrAlias = dependentColumn.role || dependentTable.name;
            
           // this.logger.info(`Building SqlSelectSpecifications for column '${dependentColumn.table.name}.${dependentColumn.name}' (property ${dependentColumn.sourceProperty!.name})`);
            dependentTable.ownColumns.forEach(column => {                
                if (selectColumnsFilter && (selectColumnsFilter(column) === false)) {
                    return;
                };                
                
                if (column.isMany) {
                    // The column is a FK that points to table, we already have it
                    return;
                }
                // if (column.isIdentity && !column.isMany) {
                //     // TODO: test this condition
                //     // we already selected the FK when we selected own columns above
                //     return;
                // }

                specifications.push(this.buildSqlResultSet(tableNameOrAlias, column, dependentColumn));
            });
        });
        
        // 2) TODO: Select joined properties (properties of types to which we have a FK relationship)
        // dependentProperties.forEach(parentProperty => {
        //     const principalType = parentProperty.type;

        //     if (!elements.isMemberedClassifier(principalType))
        //         return; // type has no attributes

        //     const principalTableName = this.objectNameProvider.getTableName(principalType);

        //     // Join the other columns of the principal table
        //     principalType.ownedAttributes.forEach(property => {
        //         if (selectPopertiesFilter && (selectPopertiesFilter(property) === false)) {
        //             return;
        //         };
        //         if (property.isID) return; // we already selected the FK when we selected own properties above
        //         specifications.push(this.getSqlSelectSpecification(principalTableName, property, parentProperty));
        //     });
        // });      

        return specifications;
    }
}