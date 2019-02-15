import { SqlSelectSpecification } from '../../relational/model/database';
import { SqlServerObjectNameProvider } from '../providers/sql-server-object-name-provider';
import { SqlServerTable, SqlServerColumn } from '../model/sql-server-database';
import { Logger } from '@yellicode/core';

export class TSqlSelectSpecificationBuilder {

    constructor(private objectNameProvider: SqlServerObjectNameProvider, private logger: Logger) {

    }

    private getSqlSelectSpecification(tableName: string, column: SqlServerColumn, parentColumn: SqlServerColumn | null): SqlSelectSpecification {

        const columnName = column.name;
        let selection = `[${tableName}].[${columnName}]`;

        const isJoined = parentColumn !== null;
        const specification: SqlSelectSpecification = {
            selection: selection,
            alias: isJoined ? this.objectNameProvider.getColumnAlias(tableName, columnName) : null,
            columnName: columnName,
            isJoined: isJoined,
            isForeignKey: column.isForeignKey,
            parentColumn: parentColumn
            // property: property,
            // entityType: property.owner as elements.Type,
            // parentProperty: parentProperty 
        };

        // specification.isGeneratedIdentity = false;
        return specification;
    }

    public build(table: SqlServerTable, selectColumnsFilter?: (value: SqlServerColumn) => boolean): SqlSelectSpecification[] {
        const specifications: SqlSelectSpecification[] = [];        

        // 1) Select own properties
        table.ownColumns.forEach(ownColumn => {
            if (selectColumnsFilter && (selectColumnsFilter(ownColumn) === false)) {
                return;
            };

            if (!ownColumn.isNavigableInModel) 
                return; 

            specifications.push(this.getSqlSelectSpecification(table.name, ownColumn, null));
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

                specifications.push(this.getSqlSelectSpecification(tableNameOrAlias, column, dependentColumn));
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