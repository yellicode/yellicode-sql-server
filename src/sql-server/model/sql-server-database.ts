import * as elements from '@yellicode/elements';

import { Database, Table, Column, SqlParameter, SqlResultSet, NamedObject } from '../../relational/model/database';

export interface SqlServerDatabase extends Database<SqlServerTable> {
    /**
     * Contains SQL-Server user defined table types.
     */
    tableTypes: SqlServerTable[];
    
    /**
     * Gets all stored procedures in the database model.
     */
    storedProcedures: SqlServerStoredProcedure[];
}

export enum SqlServerKeyType {
    Primary,
    Foreign
}

export interface SqlServerKey {
    keyType: SqlServerKeyType;

    /**
     * Gets the name of the key, e.g. 'FK_Employee_Department' for a foreign key relationship
     * between Employee and Department, where Department is the primary key base table.
     */
    name: string;

    columnName: string;

    /**
     * If the key is a foreign key, returns the table name of the primary key table.
     */
    primaryKeyTableName: string | null;

      /**
     * If the key is a foreign key, returns the primary key name of the primary key table.
     */
    primaryKeyColumnName: string | null;
    
    cascadeOnDelete: boolean;
}

export interface SqlServerTable extends Table<SqlServerColumn> {
    keys: SqlServerKey[]; 
}

export interface SqlServerColumn extends Column {

}

export interface SqlServerParameter extends SqlParameter<SqlServerColumn> {
    /**
     * True if the parameter is read only.
     */
    isReadOnly: boolean;

     /**
     * True if the parameter allows NULL values.
     */
    isNullable: boolean;  

    /**
     * True if the parameter is a table valued parameter.
     */
    isTableValued: boolean;

    /**
     * Gets the table type in case the parameter is table-valued.
     */
    tableType: SqlServerTable | null;
}

export enum QueryType {
    Unknown,
    Insert,
    SelectSingle,
    Update,
    Delete,
    UpdateRelationship    
}

export interface SqlServerQuery {    
    /**
     * The related table. This field is only required if a standard CRUD query must be generated.  
     */
    relatedTable: SqlServerTable | null;
    /**
     * This field is only required if a standard CRUD query must be generated.  
     */
    queryType: QueryType;

    modelType: elements.Type | null;
    parameters: SqlServerParameter[];
    /**
     * Required when QueryType is UpdateRelationship.
     */
    dependentColumn?: SqlServerColumn;
    resultSets?: SqlResultSet[];
}

export interface SqlServerStoredProcedure extends SqlServerQuery, NamedObject   {        
      
}

