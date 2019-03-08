import * as elements from '@yellicode/elements';
import { CSharpWriter } from "@yellicode/csharp";
import { DotNetObjectNameProvider } from './dotnet-object-name-provider';
import { MapperOptions } from './options';
import { MapperOptionsBuilder } from './mapper-options-builder';
import { Logger } from '@yellicode/core';

export abstract class DataAccessWriterBase {        
    protected objectNameProvider: DotNetObjectNameProvider;
 //   public options: MapperOptions;
    protected logger: Logger;
    // protected sqlColumnSpecProvider: SqlColumnSpecProvider;
  

    constructor(protected writer: CSharpWriter, options?: MapperOptions) {        
        // Ensure that all options have a value.
        const allOptions = MapperOptionsBuilder.buildAll(options);

        // this.sqlObjectNameProvider = this.options.sqlWriterOptions!.objectNameProvider!;
        // this.sqlColumnSpecProvider = this.options.sqlWriterOptions!.columnSpecProvider!;   
        this.objectNameProvider = allOptions.objectNameProvider!;
        this.logger = allOptions.logger!;
    }

    // protected isRelationship(property: elements.Property): boolean {
    //     return this.sqlColumnSpecProvider.isRelationship(property);
    // }

    protected getMethodParameterName(propertyName: string) : string {
        return this.objectNameProvider.getMethodParameterName(propertyName);
    }

    protected getForeignKeyPropertyName(property: elements.Property): string {
        return this.objectNameProvider.getForeignKeyPropertyName(property);
    }

    // protected getColumnName(property: elements.Property): string {
    //     const isForeignKey = this.sqlColumnSpecProvider.isRelationship(property);
    //     return isForeignKey ? this.sqlObjectNameProvider.getForeignKeyColumnName(property) : this.sqlObjectNameProvider.getColumnName(property);
    // }

    // protected getSqlParameterName(property: elements.Property): string {
    //     const columnName = this.getColumnName(property);
    //     return this.sqlObjectNameProvider.getParameterName(columnName, property.isMultivalued());
    // }
}