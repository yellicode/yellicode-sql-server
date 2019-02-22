import * as elements from '@yellicode/elements';
import { NameUtility } from '@yellicode/templating';
import { SqlObjectNameProvider, DefaultSqlObjectNameProvider } from '../../relational/providers/sql-object-name-provider';
import { SqlServerTable, SqlServerQuery, QueryType } from '../model/sql-server-database';

export interface SqlServerObjectNameProvider extends SqlObjectNameProvider {

    /**
   * Returns the name for the primary key constraint for the provided type. The default is 'PK_${type.name}'.
   */
    getPrimaryKeyName(type: elements.Type): string;

    /**
    * Returns the name for the foreign key constraint that corresponds to the provided dependent property. 
    * The default is 'FK_${dependentTypeName}_${principalTypeName}'.
    */
    getForeignKeyName(foreignKeyProperty: elements.Property, primaryKeyProperty: elements.Property): string;

     /**
     * Returns the name for a user-defined table type that corresponds to the provided type. The default is '${type.name}Table', where
     * type.name is written in UpperCamelCase.   
     * @param sqlTypeName The sql type name for the type. This name is provided by the current TypeNameProvider.
     */
    getComplexTableTypeName(type: elements.Type): string;

    /**
     * Returns the name for a single-column user-defined table type that corresponds to the provided type. 
     * The default is '${sqlTypeName}Table', where sqlTypeName is written in UpperCamelCase.   
     * @param sqlTypeName The sql type name for the type. This name is provided by the current TypeNameProvider.
     */
    getSimpleTableTypeName(type: elements.Type, sqlTypeName: string): string;

    /**
     * Returns the column name for the single column of a simple user defined table type (where the single column matches the 
     * specified type). The default value is 'Value'.
     * @param sqlTypeName The sql type name of the only column of the user defined table type.
     */
    getSimpleTableTypeColumnName(sqlTypeName: string): string;


    //   /**
    //  * Returns the type name for a parameter that corresponds to the sql type.     
    //  */
    // getParameterTypeName(sqlTypeName: string, isMultiValued: boolean): string;

    getStoredProcNameForQuery(query: SqlServerQuery): string;
    // getStoredProcNameForInsert(table: SqlServerTable, type: elements.Type): string;
    // getStoredProcNameForSelectById(table: SqlServerTable, type: elements.Type): string;
    // getStoredProcNameForUpdateById(table: SqlServerTable, type: elements.Type): string;
    // getStoredProcNameForDeleteById(table: SqlServerTable, type: elements.Type): string;
}

export class DefaultSqlServerObjectNameProvider extends DefaultSqlObjectNameProvider implements SqlServerObjectNameProvider {
    public /* virtual */ getPrimaryKeyName(type: elements.Type): string {
        return `PK_${type.name}`;
    }

    public /* virtual */ getForeignKeyName(foreignKeyProperty: elements.Property, primaryKeyProperty: elements.Property): string {
        // const principalTypeName: string = foreignKeyProperty.name || foreignKeyProperty.getTypeName();       
        // const owner = foreignKeyProperty.owner;
        // let dependentTypeName: string;

        // if (elements.isAssociation(owner)) {
        //     // The property is owned by an association. If association has a name itself, use that one.
        //     if (owner.name.length > 0) {
        //         return `FK_${owner.name}`;
        //     }
        //     const associationEnds = SqlUtility.resolveAssociationEnds(owner, foreignKeyProperty.type!);
        //     dependentTypeName = associationEnds ? associationEnds.entityEnd.getTypeName() : '';
        // }
        // else {
        //     // The property is owned by a type.            
        //     dependentTypeName = (foreignKeyProperty.owner as elements.NamedElement).name;
        // }
        
        // Try to be as specific as possible with the dependent name, if there is a property name, use it
        // (if not, the foreignKeyProperty is owned by an association and therefore has no name)
        const dependentName: string = foreignKeyProperty.name || foreignKeyProperty.getTypeName();
        const dependsOnType = primaryKeyProperty.owner as elements.Type;        
        return `FK_${dependsOnType.name}_${dependentName}`;
    }

    public /*virtual*/ getSimpleTableTypeName(type: elements.Type, sqlTypeName: string): string {
        return `${NameUtility.lowerToUpperCamelCase(sqlTypeName)}Table`;
    }

    public /*virtual*/ getComplexTableTypeName(type: elements.Type): string {
        return `TT_${type.name}`;
    }

    public /* override */ getParameterName(columnName: string, isMultiValued: boolean) {        
        // If multi valued, a table type is used
        return isMultiValued ? `${columnName}Table`: columnName;
    }   
    
    // public getParameterTypeName(sqlTypeName: string, isMultiValued: boolean): string {
    //     if (isMultiValued) {
    //         return this.getSimpleTableTypeName(sqlTypeName);
    //     }
    //     else return sqlTypeName;
    // }
        
    public getSimpleTableTypeColumnName(sqlTypeName: string): string {
        return 'Value';
    }

    public getStoredProcNameForQuery(query: SqlServerQuery): string {
        const type = query.modelType;
        if (!type || !type.name) {
            throw `Cannot create stored procedure name because the query has no model type`;
        }
        switch (query.queryType) {            
            case QueryType.Insert:
                return `Insert${type.name}`;
            case QueryType.Update:
                return `Update${type.name}`;
            case QueryType.SelectSingle:
                return `Select${type.name}ById`;
            case QueryType.Delete:
                return `Delete${type.name}ById`;
            case QueryType.UpdateRelationship:
                const col = query.dependentColumn!;
                const relationName = col.role || col.table.sourceType!.name;
                return `Update${type.name}${relationName}`;
            default:
                throw `Unsupported query type '${QueryType[query.queryType]}'`;
        }
    }

    // public getStoredProcNameForInsert(table: SqlServerTable, type: elements.Type): string {
    //     return `Insert${type.name}`;
    // }

    // public getStoredProcNameForSelectById(table: SqlServerTable, type: elements.Type): string {
    //     return `Select${type.name}ById`;
    // }

    // public getStoredProcNameForUpdateById(table: SqlServerTable, type: elements.Type): string {
    //     return `Update${type.name}ById`;
    // }

    // public getStoredProcNameForDeleteById(table: SqlServerTable, type: elements.Type): string {
    //     return `Delete${type.name}ById`;
    // }
}