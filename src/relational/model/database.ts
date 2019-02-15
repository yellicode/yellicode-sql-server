import * as elements from '@yellicode/elements';

export interface Database<TTable extends Table = Table> {
    /**
     * Includes both tables created from model types as well as junction tables.
     * The tables are sorted: dependent tables appear after their dependencies.
     */
    tables: TTable[];    
}

export interface Table<TColumn extends Column = Column> {
    name: string;
    isJunctionTable: boolean;
    ownColumns: TColumn[];  
    /**
     * The type from which the table was created. This value is null if the table is a junction table.
     */
    sourceType: elements.Type | null,
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
    typeName: string;
    /**
     * An optional column length (depending on the data type). The length must be 
     * a string representing a number or the value 'max'.
     */
    length: string | null;

    /**
     * The total number of digits to the left and right of the decimal point to which the column value is resolved.
     */
    precision: number | null;    

    /**
     * The total number of decimal places to which the column value is resolved.
     */
    scale: number | null;    

    /**
     * True if this column is the identity column of the owning table.
     */
    isIdentity: boolean;
    /**
     * True if the column allows null values.
     */
    isRequired: boolean;  

    /**
     * True if this property is a foreign key.  
     */      
    isForeignKey: boolean;    
    
    /**
     * The property from which the column was created. This property can be owned by a diffent type than the 
     * table's source type if this is a foreign key column.
     */
    sourceProperty?: elements.Property;       
    
    /**
     * Gets the property that matches  the primary key in case this column is a foreign key. 
     */
    primaryKeyProperty?: elements.Property;

    /**
     * The table that owns the column.
     */
    table: Table;    
    
    /**
     * 
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
    name: string;
    
    sourceColumn: TColumn;
    
    /**
     * The SQL type name of the parameter. By default, this is the same type name as the related column type. 
     */
    typeName: string; 

    /**
     * The length is determined by typeName.
     */
    length: string | null;

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
     */
    isFilter: boolean;

    isMultiValued: boolean;
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

/**
 * Internal interface.
 */
export interface SqlSelectSpecification {
    /**
     * E.g. `[MyTable].[MyColumn]`.
     */
    selection: string;
    /**
     * E.g. 'MyColumn'.
     */
    columnName: string;
    // entityType: elements.Type;
    // property: elements.Property;
    /**
     * The parent property of property: for example when the path is Employee.Department.Name,
     * property is Name and Department is the parent property.
     */
    parentColumn: Column | null;
    isJoined: boolean;
    isForeignKey: boolean;
    alias: string | null;
}