import * as elements from '@yellicode/elements';

export interface SqlObjectNameProvider {

    /**
    * Returns the name for a table that corresponds to the provided type. By default, the type name is used.
    */
    getTableName(type: elements.Type): string; 

    /**
     * Returns a column name that corresponds to the provided property. By default, the property name is used.
     */
    getColumnName(property: elements.Property): string;

    /**
     * Returns a name for the foreign key column that corresponds to the provided property (for example, when using
     * the SqlWriter.writeForeignKeyConstraint function). The default is '${dependentProperty.name}Id';
     */
    getForeignKeyColumnName(dependentProperty: elements.Property): string;
  
    /**
     * Returns the name for a parameter that corresponds to the specified column name.     
     */
    getParameterName(columnName: string, isMultiValued: boolean): string;  

    getColumnAlias(tableName: string, columnName: string): string;
}

export class DefaultSqlObjectNameProvider implements SqlObjectNameProvider {

    public /*virtual*/ getColumnName(property: elements.Property): string {
        return property.name;
    }  

    public /*virtual*/ getTableName(type: elements.Type): string {
        return type.name;
    }   

    public /*virtual*/ getForeignKeyColumnName(dependentProperty: elements.Property): string {
        return `${dependentProperty.name}Id`;
        // Alternative: ignore the dependentProperty.name and just use the type name of the principal:
        // For example, if the Course table is the dependent table because it contains the DepartmentId column that links it to 
        // the Department (principal) table, return 'DepartmentId'.                
        // const principalType = dependentProperty.type;        
        // return `${principalType.name}Id`;
    }
  
    public /* virtual */ getParameterName(columnName: string, isMultiValued: boolean) {        
        return `@${columnName}`;        
    }   
  
    public getColumnAlias(tableName: string, columnName: string): string {
        // The property is joined in a SELECT statement:         
        return `${tableName}_${columnName}`;
    }
}