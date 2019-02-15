export interface SchemaOptions {    
    
}

export interface ObjectCreationOptions {
    /**
     * If true, the database object will be kept if it already exists. The default 
     * value if false, recreating the object if one exists.
     */
    keepIfExists?: boolean;
}

export enum DatabaseFeatures {
    None = 0,  
    // All = DropIfExists
}

export interface DatabaseOptions extends ObjectCreationOptions {
    /**
    * Defines the database creation features to write. The default is DatabaseFeatures.All.
    */
    // features?: DatabaseFeatures;      
}

export enum TableFeatures {
    None = 0,   
    ForeignKeyConstraints = 1 << 0,
    All = ForeignKeyConstraints
} 

export interface TableOptions extends ObjectCreationOptions {
     /**
     * Defines the table creation features to write. The default is TableFeatures.All.
     */
    features?: TableFeatures;  
}

export enum ParameterIncludes {
    None = 0,
    Identity = 1 << 0,    
    Other = 1 << 1,
    IdentityAndOther = Identity | Other        
}

export interface ParameterOptions {
    includes?: ParameterIncludes;
    useIdentityAsOutput?: boolean;
    useIdentityAsFilter?: boolean;
    
    /**
     * True to make the parameter nullable, even if the corresponding property is required.
     * You should only use this option for select queries.
     */
    allowNulls?: boolean;
}

// export enum StoredProcedureFeatures {

// }

export interface StoredProcedureOptions extends ObjectCreationOptions {
  
}