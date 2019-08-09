import * as elements from '@yellicode/elements';

export interface NamedObject {
    /**
     * Gets the name of the object.
     */
    name: string;
    /**
     * Gets the optional name of the database schema to which the object belongs.
     */
    schema?: string;
}

export enum ConstraintType {
    PrimaryKey,
    ForeignKey
}

export interface Constraint {
    constraintType: ConstraintType;

    /**
     * Gets the name of the key, e.g. 'FK_Employee_Department' for a foreign key relationship
     * between Employee and Department, where Department is the primary key base table.
     */
    name: string;

    columnName: string;

    /**
     * If the key is a foreign key, returns the schema name of the primary key table.
     */
    primaryKeyTableSchema: string | null;

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


export interface Database<TTable extends Table = Table> {
    /**
     * Includes both tables created from model types as well as junction tables.
     * The tables are sorted: dependent tables appear after their dependencies.
     */
    tables: TTable[];    
}

export interface Table<TColumn extends Column = Column> extends NamedObject {    
    isJunctionTable: boolean;
    ownColumns: TColumn[];  
    /**
     * The type from which the table was created. This value is null if the table is a junction table.
     */
    objectType: elements.Type | null,
    dependentColumns: TColumn[]
}

export interface Column {
    /**
     * The column name.
     */
    name: string;   
    
    /**
     * The SQL type name.
     */
    sqlTypeName: string;

    /**
     * The maximum size, in bytes, of the data within the column. Set to -1 to specifify a maximum length.
     */
    length: number | null;    

    /**
     * The total number of digits to the left and right of the decimal point to which the column value is resolved.
     */
    precision: number | null;    

    /**
     * The total number of decimal places to which the column value is resolved.
     */
    scale: number | null;    

    /**
     * True if this column is the identity column of the owning table (that is, it contains an auto-incrementing value). 
     */
    isIdentity: boolean;
    
    /**
     * True if this property is a primary key (that is, it has a constraint that guarantees uniqueness).  
     */      
    isPrimaryKey: boolean;    

    /**
     * True if this property is a foreign key.  
     */      
    isForeignKey: boolean;    

    /**
     * True if the column allows null values.
     */
    isNullable: boolean;  
       
    /**
     * True if the column value is readonly because it is auto-generated.
     */
    isReadOnly: boolean;

    /**
     * True if the column value has a default value.
     */
    hasDefaultValue: boolean;

    /**
     * The property from which the column was created. This property can be owned by a diffent type than the 
     * table's source type if this is a foreign key column.
     */
    objectProperty?: elements.Property;       
    
    /**
     * Gets the property that matches  the primary key in case this column is a foreign key. 
     */
    primaryKeyObjectProperty?: elements.Property;

    /**
     * The table that owns the column.
     */
    table: Table;    
    
    /**
     * The role of this column in an association.
     */
    role?: string;

    isNavigableInModel: boolean;

    /**
     * True if the column is the foreign key on one-to-many relationship. This means that the table has 
     * this column to enable a one-to-many relationship, even though the column does not have a related property on the 
     * source type. Instead, there is a collection property on another (PK) type for which this column is the foreign
     * key.
     */
    isMany?: boolean;
}

export enum SqlParameterDirection {
    /**
     * The parameter is an input parameter.
     */
    Input = 0,
    /**
     * The parameter is capable of both input and output.
     */
    InputOutput = 1,
    /**
     * The parameter is an output parameter.
     */
    Output = 2,
    /**
     * The parameter represents a return value from an operation such as a stored procedure, built-in function, or user-defined function.
     */
    ReturnValue = 3
}

/**
 * 
 */
export interface SqlParameter<TColumn = Column> {
    /**
     * The parameter name (including a '@').
     */
    name: string;  
    /**
     * The 0-based index position of the parameter in a parameter collection.
     */  
    index: number;
    objectTypeName: string;
    
    columnName: string | null;

    tableName: string | null;

    /**
     * Gets the related model property.
     */
    objectProperty: elements.Property | null;

    /**
     * The SQL type name of the parameter. By default, this is the same type name as the related column type. 
     */
    sqlTypeName: string; 
    
    /**
    * The schema of the SQL type  of the parameter. This only applies if the type is a table type.
    */
    sqlTypeSchema: string | null; 

    /**
     * The maximum size, in bytes, of the data within the column. Set to -1 to specifify a maximum length.
     */
    length: number | null;

    /**
     * The total number of digits to the left and right of the decimal point to which the parameter value is resolved.
     * The precision is determined by typeName.
     */
    precision: number | null;    

    /**
     * The total number of decimal places to which the parameter value is resolved.
     */
    scale: number | null;     

    direction: SqlParameterDirection;    

    /**
     * True if this parameter must be used as a filter (as part of a WHERE statement).
     * This value is only required when generating SQL code. The default value is false.
     */
    isFilter?: boolean;

    isMultiValued?: boolean;

    isIdentity: boolean;
}

export interface TableAssociationInfo {
    /**
     * The table that is the subject (association end) of this association info.
     */
    table: Table;
    /**
     * The opposite type in the association.
     */
    oppositeTable: Table;    
    /**
     * The property that links the type to the opposite type.
     */
    column: Column;
    /**
     * True if the property is owned by the type. If false, currentEnd is owned by the association
     */
    columnIsOwnedByTable: boolean;
    /**
     * True if the opposite end allows multiple instances of type and the current end only allows one instance of the opposite type. 
     * E.g. when type is Employee and oppositeType is Department in a Department[1]-Employees[*] relationship, isOneToMany will be true
     * because the opposite end (Department) allows multiple instances of Employee. 
     */
    isOneToMany: boolean;
}

export interface SqlResultSet {
    /**
     * Gets the columns in the result set.
     */
    columns: SqlResultSetColumn[];
     /**
     * True if result set contains no more than 1 record.
     */
    hasSingleRecord?: boolean;
}

/**
 * 
 */
export interface SqlResultSetColumn {      
    /**
     * The zero-based column ordinal.
     */
    ordinal: number;
    name?: string;
    sourceColumn: string | null;
    sourceTable: string | null;
    // entityType: elements.Type;
    // property: elements.Property;
    /**
     * The parent property of property: for example when the path is Employee.Department.Name,
     * property is Name and Department is the parent property.
     */
    parentColumn: string | null;
    // parentColumn: Column | null;
    isJoined: boolean;
    isForeignKey: boolean;
    isNullable: boolean;
    /**
     * The SQL type name of the column. 
     */
    sqlTypeName: string | null;
    
    /**
     * The object type name of the column. 
     */
    objectTypeName: string;
}