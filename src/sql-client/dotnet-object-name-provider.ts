import * as elements from '@yellicode/elements';
import { NameUtility } from '@yellicode/core';
import { SqlServerStoredProcedure, SqlServerTable } from '../sql-server';

export interface DotNetObjectNameProvider {
    // /**
    //  * Returns a name for the identity property for the specified type. This function is used 
    //  * when auto-generating identity properties. The default name is 'Id', unless one of the
    //  * types properties has Property.isID set to true, in which case the property name will be 
    //  * used.
    //  */
    // getIdentityPropertyName(type: model.Type): string;

    /**
   * Returns a name for the foreign key property that corresponds to the provided property. 
   * The default is '${dependentProperty.name}Id';
   */
    getForeignKeyPropertyName(dependentProperty: elements.Property): string;

    /**
     * Returns a data access method parameter name for the provided property. By default, the property name
     * is converted to lowerCamelCase.    
     */
    getMethodParameterName(propertyName: string): string;

    getDataAccessMethodNameForStoredProcedure(query: SqlServerStoredProcedure): string;

    // getDataAccessMethodNameForQuery(query: SqlServerQuery): string;    
}

export class DefaultDotNetObjectNameProvider implements DotNetObjectNameProvider {

    // public getIdentityPropertyName(type: model.Type): string {
    //     const idProperty = SqlUtility.findIdentityProperty(type);
    //     return idProperty ? idProperty.name : 'Id';
    // }

    public getForeignKeyPropertyName(dependentProperty: elements.Property): string {
        return `${dependentProperty.name}Id`;
        // Alternative: ignore the dependentProperty.name and just use the type name of the principal:
        // For example, if the Course table is the dependent table because it contains the DepartmentId column that links it to 
        // the Department (principal) table, return 'DepartmentId'.                
        // const principalType = dependentProperty.type;        
        // return `${principalType.name}Id`;
    }

    public getMethodParameterName(propertyName: string): string {
        return NameUtility.upperToLowerCamelCase(propertyName);
    }

    public getDataAccessMethodNameForStoredProcedure(procedure: SqlServerStoredProcedure): string {
        // TODO: sanitize this
        return procedure.name;
    }

    // public getDataAccessMethodNameForQuery(query: SqlServerQuery): string {
        
    //     const modelType = query.modelType;
    //     if (!modelType || !modelType.name) 
    //         throw `Cannot get data access method for query ${query}`;

    //     switch (query.queryType) {
    //         case QueryType.Insert:
    //             return `Insert${inputType!.name}`;
    //         case QueryType.Update:
    //             return `Update${inputType!.name}`;
    //         case QueryType.SelectSingle:
    //             return `Select${inputType!.name}ById`;
    //         case QueryType.Delete:
    //             return `Delete${inputType!.name}ById`;
    //         case QueryType.UpdateRelationship:
    //             const col = query.dependentColumn!;
    //             const relationName = col.role || col.table.sourceType!.name;
    //             return `Update${type.name}${relationName}`;
    //         default:
    //             throw `Unsupported query type '${QueryType[query.queryType]}'`;
    //     }
    // }

    public getDataAccessMethodNameForInsert(table: SqlServerTable, type: elements.Type): string {
        return `Insert${type.name}`;
    }

    public getDataAccessMethodNameForSelectById(table: SqlServerTable, type: elements.Type): string {
        return `Select${type.name}ById`;
    }

    public getDataAccessMethodNameForUpdateById(table: SqlServerTable, type: elements.Type): string {
        return `Update${type.name}ById`;
    }

    public getDataAccessMethodNameForDeleteById(table: SqlServerTable, type: elements.Type): string {
        return `Delete${type.name}ById`;
    }
}