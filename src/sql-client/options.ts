import { DotNetObjectNameProvider } from "./dotnet-object-name-provider";
import { Logger } from '@yellicode/core';

export interface MapperOptions {
    logger?: Logger;
  
    objectNameProvider?: DotNetObjectNameProvider;    
    
    /**
     * By default, each generated entity property that references another entity will have get a corresponding 
     * foreign key property (an Int32 by default) that is used in all generated data access code. 
     * Set this option to true to skip generating these properties..
     */
   // noForeignKeyProperties?: boolean;
}

export interface ParameterOptions {
    /**
     * Set to true to if the parameter value is a .NET method parameter (e.g. cmd.Parameters.AddWithValue("@Id", id)),
     * and false if the parameter value is a .NET entity property (e.g. cmd.Parameters.AddWithValue("@MyParam", entity.Id)).
     */
    mapFromMethodParameters?: boolean;
}
