import * as elements from '@yellicode/elements';
import { TextWriter } from "@yellicode/templating";
import * as opts from '../options';
import { TSqlResultSetBuilder } from './t-sql-select-specification-builder';
import { SqlServerTable, SqlServerColumn } from '../model/sql-server-database';
import { SqlServerObjectNameProvider } from '../providers/sql-server-object-name-provider';
import { TSqlWriterBase } from './t-sql-writer-base';

export class TSqlSelectWriter extends TSqlWriterBase {
    constructor(writer: TextWriter, private objectNameProvider: SqlServerObjectNameProvider) {
        super(writer);
    } 

    public writeSelectQueryInternal(table: SqlServerTable, 
        parameterOptions: opts.ParameterOptions, 
        parameterFilter?: (value: SqlServerColumn) => boolean,
        selectColumnsFilter?: (value: SqlServerColumn) => boolean) {       

        const specificationBuilder = new TSqlResultSetBuilder(this.objectNameProvider, this.logger);
        const resultSet = specificationBuilder.build(table, selectColumnsFilter);
        const ownTableName = table.name;
        const columns = resultSet.columns;

        // SELECT 
        this.writeLine('SELECT')
        this.increaseIndent();
        columns.forEach((col, index) => {
            const selection = col.sourceTable ? `[${col.sourceTable}].[${col.sourceColumn}]`: `[${col.sourceColumn}]`;
            this.writeIndent();
            this.write(selection);
            if (col.name) {                
                this.write(` AS ${col.name}`);
            }
            if (index < resultSet.columns.length - 1) this.write(',');
            // this.write(`-- ${spec.alias || spec.columnName}`);            
            this.writeEndOfLine();
        })
        this.decreaseIndent();
        // 2) FROM
        this.writeLine('FROM');
        this.increaseIndent();
        this.writeLine(`[${ownTableName}]`);
        
        // 2A) JOIN
        // const dependentProperties = type.ownedAttributes.filter(p => { return this.columnSpecProvider.isRelationship(p) });

        // dependentProperties.forEach(dependentProperty => {
        //     const principalType = dependentProperty.type;
        //     if (!principalType) return;

        //     const columnName = this.objectNameProvider.getForeignKeyColumnName(dependentProperty);
        //     const principalTableName = this.objectNameProvider.getTableName(principalType);      
        //     const principalColumnName = this.getIdentityColumnName(principalType); // this.objectNameProvider.getIdentityColumnName(principalType);

        //     this.writeLine(`LEFT JOIN [${principalTableName}] ON [${principalTableName}].[${principalColumnName}] = [${ownTableName}].[${columnName}]`);
        // });
        // this.decreaseIndent();
        // 3) WHERE        
       // this.writeWhereStatement(table, parameterOptions, parameterFilter);
    }  
}
