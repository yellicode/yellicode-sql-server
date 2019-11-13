import { CodeWriter, TextWriter } from '@yellicode/core';
import { SqlServerColumn } from '../model/sql-server-database';

import { Logger, ConsoleLogger } from '@yellicode/core';

export abstract class TSqlWriterBase extends CodeWriter {       
    protected logger: Logger;

    constructor(writer: TextWriter, logger?: Logger) {
        super(writer);
        this.logger = logger || new ConsoleLogger(console);
    }

    /**
  * Writes an indented block of code, wrapped in opening and closing parentheses. 
  * @param contents A callback function that writes the contents.
  */
    public writeCodeBlock(contents: (writer: this) => void): void {
        this.writeLine('(');
        this.increaseIndent();
        if (contents) contents(this);
        this.decreaseIndent();
        this.writeLine(')');
    };

    /**
    * Writes an indented block of code, wrapped in a BEGIN and END keyword. 
    * @param contents A callback function that writes the contents.
    */
    public writeCodeBlockBeginEnd(contents: (writer: this) => void): void {
        this.writeLine('BEGIN');
        this.increaseIndent();
        if (contents) contents(this);
        this.decreaseIndent();
        this.writeLine('END');
    };  

    // protected static filterColumns(columns: Column[], includes: opts.ParameterIncludes, filter?: (value: Column) => boolean): Column[] {
            
    //     const includeIdentity = (includes & opts.ParameterIncludes.Identity) ? true : false;                    
    //     const includeOtherColumns = (includes & opts.ParameterIncludes.Other) > 0;
        
    //     return columns.filter(p => {
    //         // First apply any custom filtering
    //         if (filter && (filter(p) === false))
    //             return false;

    //         return p.isIdentity ? includeIdentity : includeOtherColumns;
    //     });
    // }   

    protected getParameterName(column: SqlServerColumn, isMany: boolean = false): string {       
        return "getParameterName is obsolete";
        // return this.objectNameProvider.getParameterName(column.name, isMany);
    }

    // public writeWhereStatement(
    //     table: SqlServerTable, 
    //     parameterOptions: opts.ParameterOptions,
    //     parameterFilter?: (value: SqlServerColumn) => boolean): void {

    //     const parameterIncludes = (parameterOptions.includes === undefined) ? opts.ParameterIncludes.IdentityAndOther : parameterOptions.includes;
    //     const whereColumns = TSqlWriterBase.filterColumns(table.ownColumns, parameterIncludes, parameterFilter);

    //     // TODO: AND / OR option 
    //     this.writeLine('WHERE');
    //     this.increaseIndent();
    //     whereColumns.forEach((col, index) => {
    //         const colName = col.name;
    //         const parameterName = this.objectNameProvider.getParameterName(colName, false);
    //         this.writeIndent();
    //         if (parameterOptions.allowNulls) {
    //             this.write(`[${table.name}].[${colName}] = ISNULL(@${parameterName}, [${table.name}].[${col}])`);
    //         }
    //         else this.write(`[${table.name}].[${colName}] = @${parameterName}`);
    //         if (index < whereColumns.length - 1) {
    //             this.write(' AND');
    //         }
    //         this.writeEndOfLine();
    //     });
    //     this.decreaseIndent();
    // }
}